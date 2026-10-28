"use strict";

const crypto = require("node:crypto");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");

admin.initializeApp();

const db = admin.firestore();
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const NOWPAYMENTS_API_KEY = defineSecret("NOWPAYMENTS_API_KEY");
const NOWPAYMENTS_IPN_SECRET = defineSecret("NOWPAYMENTS_IPN_SECRET");
const PUBLIC_URL = "https://zpass.web.app";
const ALLOWED_ORIGINS = new Set([PUBLIC_URL]);
const PLANS = Object.freeze({
  zpass_individual_monthly: { name: "Pro", amount: 5, days: 30, interval: "month" },
  zpass_individual_yearly: { name: "Pro", amount: 55, days: 365, interval: "year" },
  zpass_family_monthly: { name: "Family", amount: 10, days: 30, interval: "month" },
  zpass_family_yearly: { name: "Family", amount: 100, days: 365, interval: "year" },
});

function stripeClient() {
  const key = STRIPE_SECRET_KEY.value();
  if (!key) throw new Error("Stripe is not configured");
  return new Stripe(key);
}

function zpassId(uid) {
  return `ZP-${uid.slice(0, 6).toUpperCase()}${uid.slice(-4).toUpperCase()}`;
}

function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

async function requireUser(req, res) {
  const [scheme, token] = String(req.get("authorization") || "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    sendError(res, 401, "Sign in before paying.");
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    const user = await admin.auth().getUser(decoded.uid);
    if (!user.email) {
      sendError(res, 400, "A verified account email is required.");
      return null;
    }
    return user;
  } catch (error) {
    console.warn("Payment API rejected Firebase identity:", error.message);
    sendError(res, 401, "Your sign-in expired. Sign in again to continue.");
    return null;
  }
}

function currentExpiry(data) {
  const value = data?.expiresAt;
  if (value && typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return new Date(0);
}

async function activatePaidPlan({ uid, plan, expiresAt, source, paymentRecord, eventId }) {
  const subscriptionRef = db.collection("subscriptions").doc(uid);
  const recordRef = db.collection("payment_records").doc(paymentRecord.id);
  const eventRef = db.collection("payment_webhooks").doc(eventId);

  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists) return;
    const subscriptionSnapshot = await transaction.get(subscriptionRef);
    const subscription = subscriptionSnapshot.data() || {};
    const actualExpiry = expiresAt || new Date(Math.max(Date.now(), currentExpiry(subscription).getTime()) + plan.days * 86400000);

    transaction.set(subscriptionRef, {
      zPassId: zpassId(uid),
      plan: plan.name.toUpperCase(),
      status: "ACTIVE",
      expiresAt: actualExpiry,
      storageMb: 5120,
      source,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...paymentRecord.subscriptionFields,
    }, { merge: true });
    transaction.set(recordRef, {
      uid,
      zPassId: zpassId(uid),
      plan: plan.name.toUpperCase(),
      amountUsd: paymentRecord.amountUsd,
      provider: paymentRecord.provider,
      status: "PAID",
      email: paymentRecord.email || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...paymentRecord.recordFields,
    }, { merge: true });
    transaction.create(eventRef, {
      type: paymentRecord.eventType,
      paymentId: paymentRecord.id,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function createStripeCheckout(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const productId = String(req.body?.productId || "").toLowerCase();
  const plan = PLANS[productId];
  if (!plan) return sendError(res, 400, "Choose a valid plan.");

  const subscriptionRef = db.collection("subscriptions").doc(user.uid);
  const existing = (await subscriptionRef.get()).data() || {};
  if (existing.stripeSubscriptionId && existing.autoRenew && ["active", "trialing"].includes(existing.stripeStatus)) {
    return sendError(res, 409, "A Stripe subscription is already active. Use Manage billing to change it.");
  }

  const stripe = stripeClient();
  let customerId = existing.stripeCustomerId;
  if (customerId) {
    await stripe.customers.update(customerId, { email: user.email });
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { firebase_uid: user.uid, zpass_id: zpassId(user.uid) },
    });
    customerId = customer.id;
  }

  const family = plan.name === "Family";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.uid,
    success_url: `${PUBLIC_URL}/subscription.html?payment=stripe-success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PUBLIC_URL}/checkout.html?plan=${family ? "FAMILY" : "PRO"}&billing=${plan.interval === "year" ? "YEARLY" : "MONTHLY"}&payment=cancelled`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(plan.amount * 100),
        recurring: { interval: plan.interval },
        product_data: {
          name: `Z Pass ${plan.name}`,
          description: `${plan.name} membership, billed ${plan.interval}ly`,
        },
      },
    }],
    metadata: { firebase_uid: user.uid, zpass_id: zpassId(user.uid), plan: productId },
    subscription_data: {
      metadata: { firebase_uid: user.uid, zpass_id: zpassId(user.uid), plan: productId },
    },
  });

  await subscriptionRef.set({
    zPassId: zpassId(user.uid),
    stripeCustomerId: customerId,
    stripeCheckoutSessionId: session.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  res.json({ checkoutUrl: session.url, sessionId: session.id });
}

async function createBillingPortal(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const subscription = (await db.collection("subscriptions").doc(user.uid).get()).data() || {};
  if (!subscription.stripeCustomerId) return sendError(res, 404, "No Stripe billing account is linked yet.");
  const portal = await stripeClient().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${PUBLIC_URL}/subscription.html`,
  });
  res.json({ url: portal.url });
}

async function createCryptoInvoice(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const planId = String(req.body?.productId || "").toLowerCase();
  const plan = PLANS[planId];
  if (!plan) return sendError(res, 400, "Choose a valid plan.");
  const apiKey = NOWPAYMENTS_API_KEY.value();
  if (!apiKey) return sendError(res, 503, "Crypto payments are not configured.");

  const coin = String(req.body?.coin || "").toLowerCase();
  if (!/^[a-z0-9]{2,20}$/.test(coin)) return sendError(res, 400, "Choose a valid cryptocurrency.");
  const orderId = `ZPASS-${crypto.randomUUID()}`;
  const orderRef = db.collection("payment_orders").doc(orderId);
  const response = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: plan.amount,
      price_currency: "usd",
      pay_currency: coin,
      order_id: orderId,
      order_description: `Z Pass ${plan.name} for ${zpassId(user.uid)}`,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
      ipn_callback_url: `${PUBLIC_URL}/api/nowpayments-webhook`,
      success_url: `${PUBLIC_URL}/subscription.html?payment=crypto-success`,
      cancel_url: `${PUBLIC_URL}/checkout.html?payment=cancelled`,
    }),
  });
  const invoice = await response.json().catch(() => ({}));
  if (!response.ok || !(invoice.invoice_url || invoice.url)) {
    console.error("NOWPayments invoice creation failed:", invoice.message || response.status);
    return sendError(res, 502, "Could not create the crypto invoice.");
  }

  await orderRef.set({
    uid: user.uid,
    zPassId: zpassId(user.uid),
    email: user.email,
    productId: planId,
    plan: plan.name,
    amountUsd: plan.amount,
    days: plan.days,
    provider: "NOWPayments",
    status: "PENDING",
    invoiceId: String(invoice.id || invoice.invoice_id || ""),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ invoiceUrl: invoice.invoice_url || invoice.url, orderId });
}

async function handleStripeWebhook(req, res) {
  const signature = req.get("stripe-signature");
  if (!signature) return sendError(res, 400, "Missing Stripe signature.");
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
  } catch (error) {
    console.warn("Stripe webhook signature rejected:", error.message);
    return sendError(res, 400, "Invalid Stripe signature.");
  }

  const object = event.data.object;
  if (event.type === "checkout.session.completed" && object.mode === "subscription" &&
      ["paid", "no_payment_required"].includes(object.payment_status)) {
    const metadata = object.metadata || {};
    const plan = PLANS[String(metadata.plan || "").toLowerCase()];
    const uid = String(metadata.firebase_uid || "");
    if (plan && uid && zpassId(uid) === metadata.zpass_id && object.subscription) {
      const stripe = stripeClient();
      const subscription = await stripe.subscriptions.retrieve(object.subscription);
      const expiresAt = new Date(subscription.current_period_end * 1000);
      await activatePaidPlan({
        uid, plan, expiresAt, source: "STRIPE",
        paymentRecord: {
          id: object.id,
          eventType: event.type,
          provider: "Stripe",
          amountUsd: (object.amount_total || plan.amount * 100) / 100,
          email: object.customer_details?.email || object.customer_email || "",
          recordFields: {
            stripeSessionId: object.id,
            stripeCustomerId: object.customer,
            stripeSubscriptionId: object.subscription,
            billing: plan.interval,
          },
          subscriptionFields: {
            stripeCustomerId: object.customer,
            stripeSubscriptionId: object.subscription,
            stripeCheckoutSessionId: object.id,
            stripeStatus: subscription.status,
            billingInterval: plan.interval,
            autoRenew: !subscription.cancel_at_period_end,
          },
        },
        eventId: event.id,
      });
    }
  } else if (event.type === "invoice.paid" && object.billing_reason === "subscription_cycle") {
    const stripe = stripeClient();
    const subscriptionId = object.subscription || object.parent?.subscription_details?.subscription;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const metadata = subscription.metadata || {};
      const plan = PLANS[String(metadata.plan || "").toLowerCase()];
      const uid = String(metadata.firebase_uid || "");
      if (plan && uid && zpassId(uid) === metadata.zpass_id) {
        await activatePaidPlan({
          uid, plan, expiresAt: new Date(subscription.current_period_end * 1000), source: "STRIPE",
          paymentRecord: {
            id: object.id,
            eventType: event.type,
            provider: "Stripe",
            amountUsd: (object.amount_paid || 0) / 100,
            email: object.customer_email || "",
            recordFields: {
              stripeInvoiceId: object.id,
              stripeCustomerId: object.customer,
              stripeSubscriptionId: subscriptionId,
              billing: plan.interval,
            },
            subscriptionFields: {
              stripeCustomerId: object.customer,
              stripeSubscriptionId: subscriptionId,
              stripeStatus: subscription.status,
              billingInterval: plan.interval,
              autoRenew: !subscription.cancel_at_period_end,
            },
          },
          eventId: event.id,
        });
      }
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = object;
    const metadata = subscription.metadata || {};
    const uid = String(metadata.firebase_uid || "");
    if (uid && zpassId(uid) === metadata.zpass_id) {
      const subscriptionRef = db.collection("subscriptions").doc(uid);
      const eventRef = db.collection("payment_webhooks").doc(event.id);
      await db.runTransaction(async (transaction) => {
        const eventSnapshot = await transaction.get(eventRef);
        if (eventSnapshot.exists) return;
        const updates = {
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          stripeStatus: subscription.status,
          autoRenew: event.type !== "customer.subscription.deleted" && !subscription.cancel_at_period_end,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (subscription.current_period_end) updates.expiresAt = new Date(subscription.current_period_end * 1000);
        if (event.type === "customer.subscription.deleted") {
          updates.plan = "FREE";
          updates.status = "CANCELLED";
          updates.storageMb = 50;
        }
        transaction.set(subscriptionRef, updates, { merge: true });
        transaction.create(eventRef, { type: event.type, processedAt: admin.firestore.FieldValue.serverTimestamp() });
      });
    }
  }

  res.status(200).send("OK");
}

function sortedObject(value) {
  if (Array.isArray(value)) return value.map(sortedObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortedObject(value[key])]));
  }
  return value;
}

async function handleNowPaymentsWebhook(req, res) {
  const signature = String(req.get("x-nowpayments-sig") || "").toLowerCase();
  const secret = NOWPAYMENTS_IPN_SECRET.value();
  const expected = crypto.createHmac("sha512", secret).update(JSON.stringify(sortedObject(req.body))).digest("hex");
  const supplied = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  if (!signature || supplied.length !== calculated.length || !crypto.timingSafeEqual(supplied, calculated)) {
    return sendError(res, 401, "Invalid payment signature.");
  }

  const orderId = String(req.body?.order_id || "");
  const paymentStatus = String(req.body?.payment_status || "").toLowerCase();
  if (!orderId || !["finished", "confirmed"].includes(paymentStatus)) return res.status(200).send("Ignored");
  const orderRef = db.collection("payment_orders").doc(orderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) return sendError(res, 404, "Unknown payment order.");
  const order = orderSnapshot.data();
  const plan = PLANS[order.productId];
  if (!plan) return sendError(res, 400, "Invalid payment order.");

  await db.runTransaction(async (transaction) => {
    const [currentOrderSnapshot, subscriptionSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(db.collection("subscriptions").doc(order.uid)),
    ]);
    const currentOrder = currentOrderSnapshot.data() || {};
    if (currentOrder.status === "PAID") return;
    const subscription = subscriptionSnapshot.data() || {};
    const expiresAt = new Date(Math.max(Date.now(), currentExpiry(subscription).getTime()) + plan.days * 86400000);
    const recordRef = db.collection("payment_records").doc(orderId);
    transaction.set(db.collection("subscriptions").doc(order.uid), {
      zPassId: zpassId(order.uid),
      plan: plan.name.toUpperCase(),
      status: "ACTIVE",
      expiresAt,
      storageMb: 5120,
      source: "NOWPAYMENTS",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(currentOrderSnapshot.ref, {
      status: "PAID",
      paymentId: String(req.body.payment_id || ""),
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(recordRef, {
      uid: order.uid,
      zPassId: order.zPassId,
      email: order.email || "",
      plan: plan.name.toUpperCase(),
      billing: plan.interval,
      amountUsd: order.amountUsd,
      provider: "NOWPayments",
      status: "PAID",
      orderId,
      paymentId: String(req.body.payment_id || ""),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  res.status(200).send("OK");
}

exports.payments = onRequest({
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "256MiB",
  secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET],
}, async (req, res) => {
  const origin = req.get("origin") || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Stripe-Signature, x-nowpayments-sig");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");

  const route = String(req.path || "/").replace(/^\/api(?=\/|$)/, "") || "/";
  try {
    if (route === "/checkout/create-stripe-session" && req.method === "POST") return await createStripeCheckout(req, res);
    if (route === "/checkout/create-payment" && req.method === "POST") return await createCryptoInvoice(req, res);
    if (route === "/checkout/create-portal-session" && req.method === "POST") return await createBillingPortal(req, res);
    if (route === "/stripe-webhook" && req.method === "POST") return await handleStripeWebhook(req, res);
    if (route === "/nowpayments-webhook" && req.method === "POST") return await handleNowPaymentsWebhook(req, res);
    if (route === "/health" && req.method === "GET") return res.json({ status: "ok" });
    return sendError(res, 404, "Payment route not found.");
  } catch (error) {
    console.error(`Payment API ${route} failed:`, error);
    if (!res.headersSent) sendError(res, 502, "The payment service could not complete this request.");
  }
});

"use strict";

const crypto = require("node:crypto");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");

admin.initializeApp();

const db = admin.firestore();
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const NOWPAYMENTS_API_KEY = defineSecret("NOWPAYMENTS_API_KEY");
const NOWPAYMENTS_IPN_SECRET = defineSecret("NOWPAYMENTS_IPN_SECRET");
const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_ADMIN_CHAT_ID = defineSecret("TELEGRAM_ADMIN_CHAT_ID");

const PUBLIC_URL = "https://zpass.web.app";
const ALLOWED_ORIGINS = new Set([PUBLIC_URL]);
const PLANS = Object.freeze({
  zpass_individual_monthly: { name: "Pro", amount: 5, days: 30, interval: "month" },
  zpass_individual_yearly: { name: "Pro", amount: 55, days: 365, interval: "year" },
  zpass_family_monthly: { name: "Family", amount: 10, days: 30, interval: "month" },
  zpass_family_yearly: { name: "Family", amount: 100, days: 365, interval: "year" },
});

function stripeClient() {
  const key = STRIPE_SECRET_KEY.value();
  if (!key) throw new Error("Stripe is not configured");
  return new Stripe(key);
}

function zpassId(uid) {
  return `ZP-${uid.slice(0, 6).toUpperCase()}${uid.slice(-4).toUpperCase()}`;
}

function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

async function requireUser(req, res) {
  const [scheme, token] = String(req.get("authorization") || "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    sendError(res, 401, "Sign in before paying.");
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    const user = await admin.auth().getUser(decoded.uid);
    if (!user.email) {
      sendError(res, 400, "A verified account email is required.");
      return null;
    }
    return user;
  } catch (error) {
    console.warn("Payment API rejected Firebase identity:", error.message);
    sendError(res, 401, "Your sign-in expired. Sign in again to continue.");
    return null;
  }
}

function currentExpiry(data) {
  const value = data?.expiresAt;
  if (value && typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return new Date(0);
}

async function sendTelegramAdminNotification({ zPassId, email, plan, amountUsd, provider, paymentId }) {
  try {
    const token = TELEGRAM_BOT_TOKEN.value();
    const chatId = TELEGRAM_ADMIN_CHAT_ID.value();
    if (!token || !chatId) return;

    const message = `🔔 **Yeni Başarılı Ödeme Bildirimi!**\n\n` +
      `👤 **ZPass ID:** \`${zpassId}\`\n` +
      `📧 **E-posta:** ${email}\n` +
      `📦 **Paket:** ${plan}\n` +
      `💵 **Tutar:** $${amountUsd}\n` +
      `💳 **Sağlayıcı:** ${provider}\n` +
      `🆔 **İşlem ID:** \`${paymentId || "N/A"}\`\n` +
      `🕒 **Zaman:** ${new Date().toISOString()}`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram admin notification:", err);
  }
}

async function activatePaidPlan({ uid, plan, expiresAt, source, paymentRecord, eventId }) {
  const subscriptionRef = db.collection("subscriptions").doc(uid);
  const recordRef = db.collection("payment_records").doc(paymentRecord.id);
  const eventRef = db.collection("payment_webhooks").doc(eventId);

  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists) return;
    const subscriptionSnapshot = await transaction.get(subscriptionRef);
    const subscription = subscriptionSnapshot.data() || {};
    const actualExpiry = expiresAt || new Date(Math.max(Date.now(), currentExpiry(subscription).getTime()) + plan.days * 86400000);

    transaction.set(subscriptionRef, {
      zPassId: zpassId(uid),
      plan: plan.name.toUpperCase(),
      status: "ACTIVE",
      expiresAt: actualExpiry,
      storageMb: 5120,
      source,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...paymentRecord.subscriptionFields,
    }, { merge: true });
    transaction.set(recordRef, {
      uid,
      zPassId: zpassId(uid),
      plan: plan.name.toUpperCase(),
      amountUsd: paymentRecord.amountUsd,
      provider: paymentRecord.provider,
      status: "PAID",
      email: paymentRecord.email || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...paymentRecord.recordFields,
    }, { merge: true });
    transaction.create(eventRef, {
      type: paymentRecord.eventType,
      paymentId: paymentRecord.id,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Admin Telegram Notification
  await sendTelegramAdminNotification({
    zPassId: zpassId(uid),
    email: paymentRecord.email || "",
    plan: plan.name.toUpperCase(),
    amountUsd: paymentRecord.amountUsd,
    provider: paymentRecord.provider,
    paymentId: paymentRecord.id,
  });
}

async function createStripeCheckout(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const productId = String(req.body?.productId || "").toLowerCase();
  const plan = PLANS[productId];
  if (!plan) return sendError(res, 400, "Choose a valid plan.");

  const subscriptionRef = db.collection("subscriptions").doc(user.uid);
  const existing = (await subscriptionRef.get()).data() || {};
  if (existing.stripeSubscriptionId && existing.autoRenew && ["active", "trialing"].includes(existing.stripeStatus)) {
    return sendError(res, 409, "A Stripe subscription is already active. Use Manage billing to change it.");
  }

  const stripe = stripeClient();
  let customerId = existing.stripeCustomerId;
  if (customerId) {
    await stripe.customers.update(customerId, { email: user.email });
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { firebase_uid: user.uid, zpass_id: zpassId(user.uid) },
    });
    customerId = customer.id;
  }

  const family = plan.name === "Family";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.uid,
    success_url: `${PUBLIC_URL}/subscription.html?payment=stripe-success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PUBLIC_URL}/checkout.html?plan=${family ? "FAMILY" : "PRO"}&billing=${plan.interval === "year" ? "YEARLY" : "MONTHLY"}&payment=cancelled`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(plan.amount * 100),
        recurring: { interval: plan.interval },
        product_data: {
          name: `Z Pass ${plan.name}`,
          description: `${plan.name} membership, billed ${plan.interval}ly`,
        },
      },
    }],
    metadata: { firebase_uid: user.uid, zpass_id: zpassId(user.uid), plan: productId },
    subscription_data: {
      metadata: { firebase_uid: user.uid, zpass_id: zpassId(user.uid), plan: productId },
    },
  });

  await subscriptionRef.set({
    zPassId: zpassId(user.uid),
    stripeCustomerId: customerId,
    stripeCheckoutSessionId: session.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  res.json({ checkoutUrl: session.url, sessionId: session.id });
}

async function createBillingPortal(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const subscription = (await db.collection("subscriptions").doc(user.uid).get()).data() || {};
  if (!subscription.stripeCustomerId) return sendError(res, 404, "No Stripe billing account is linked yet.");
  const portal = await stripeClient().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${PUBLIC_URL}/subscription.html`,
  });
  res.json({ url: portal.url });
}

async function createCryptoInvoice(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const planId = String(req.body?.productId || "").toLowerCase();
  const plan = PLANS[planId];
  if (!plan) return sendError(res, 400, "Choose a valid plan.");
  const apiKey = NOWPAYMENTS_API_KEY.value();
  if (!apiKey) return sendError(res, 503, "Crypto payments are not configured.");

  const coin = String(req.body?.coin || "").toLowerCase();
  if (!/^[a-z0-9]{2,20}$/.test(coin)) return sendError(res, 400, "Choose a valid cryptocurrency.");
  const orderId = `ZPASS-${crypto.randomUUID()}`;
  const orderRef = db.collection("payment_orders").doc(orderId);
  const response = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: plan.amount,
      price_currency: "usd",
      pay_currency: coin,
      order_id: orderId,
      order_description: `Z Pass ${plan.name} for ${zpassId(user.uid)}`,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
      ipn_callback_url: `${PUBLIC_URL}/api/nowpayments-webhook`,
      success_url: `${PUBLIC_URL}/subscription.html?payment=crypto-success`,
      cancel_url: `${PUBLIC_URL}/checkout.html?payment=cancelled`,
    }),
  });
  const invoice = await response.json().catch(() => ({}));
  if (!response.ok || !(invoice.invoice_url || invoice.url)) {
    console.error("NOWPayments invoice creation failed:", invoice.message || response.status);
    return sendError(res, 502, "Could not create the crypto invoice.");
  }

  await orderRef.set({
    uid: user.uid,
    zPassId: zpassId(user.uid),
    email: user.email,
    productId: planId,
    plan: plan.name,
    amountUsd: plan.amount,
    days: plan.days,
    provider: "NOWPayments",
    status: "PENDING",
    invoiceId: String(invoice.id || invoice.invoice_id || ""),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ invoiceUrl: invoice.invoice_url || invoice.url, orderId });
}

async function handleStripeWebhook(req, res) {
  const signature = req.get("stripe-signature");
  if (!signature) return sendError(res, 400, "Missing Stripe signature.");
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
  } catch (error) {
    console.warn("Stripe webhook signature rejected:", error.message);
    return sendError(res, 400, "Invalid Stripe signature.");
  }

  const object = event.data.object;
  if (event.type === "checkout.session.completed" && object.mode === "subscription" &&
      ["paid", "no_payment_required"].includes(object.payment_status)) {
    const metadata = object.metadata || {};
    const plan = PLANS[String(metadata.plan || "").toLowerCase()];
    const uid = String(metadata.firebase_uid || "");
    if (plan && uid && zpassId(uid) === metadata.zpass_id && object.subscription) {
      const stripe = stripeClient();
      const subscription = await stripe.subscriptions.retrieve(object.subscription);
      const expiresAt = new Date(subscription.current_period_end * 1000);
      await activatePaidPlan({
        uid, plan, expiresAt, source: "STRIPE",
        paymentRecord: {
          id: object.id,
          eventType: event.type,
          provider: "Stripe",
          amountUsd: (object.amount_total || plan.amount * 100) / 100,
          email: object.customer_details?.email || object.customer_email || "",
          recordFields: {
            stripeSessionId: object.id,
            stripeCustomerId: object.customer,
            stripeSubscriptionId: object.subscription,
            billing: plan.interval,
          },
          subscriptionFields: {
            stripeCustomerId: object.customer,
            stripeSubscriptionId: object.subscription,
            stripeCheckoutSessionId: object.id,
            stripeStatus: subscription.status,
            billingInterval: plan.interval,
            autoRenew: !subscription.cancel_at_period_end,
          },
        },
        eventId: event.id,
      });
    }
  } else if (event.type === "invoice.paid" && object.billing_reason === "subscription_cycle") {
    const stripe = stripeClient();
    const subscriptionId = object.subscription || object.parent?.subscription_details?.subscription;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const metadata = subscription.metadata || {};
      const plan = PLANS[String(metadata.plan || "").toLowerCase()];
      const uid = String(metadata.firebase_uid || "");
      if (plan && uid && zpassId(uid) === metadata.zpass_id) {
        await activatePaidPlan({
          uid, plan, expiresAt: new Date(subscription.current_period_end * 1000), source: "STRIPE",
          paymentRecord: {
            id: object.id,
            eventType: event.type,
            provider: "Stripe",
            amountUsd: (object.amount_paid || 0) / 100,
            email: object.customer_email || "",
            recordFields: {
              stripeInvoiceId: object.id,
              stripeCustomerId: object.customer,
              stripeSubscriptionId: subscriptionId,
              billing: plan.interval,
            },
            subscriptionFields: {
              stripeCustomerId: object.customer,
              stripeSubscriptionId: subscriptionId,
              stripeStatus: subscription.status,
              billingInterval: plan.interval,
              autoRenew: !subscription.cancel_at_period_end,
            },
          },
          eventId: event.id,
        });
      }
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = object;
    const metadata = subscription.metadata || {};
    const uid = String(metadata.firebase_uid || "");
    if (uid && zpassId(uid) === metadata.zpass_id) {
      const subscriptionRef = db.collection("subscriptions").doc(uid);
      const eventRef = db.collection("payment_webhooks").doc(event.id);
      await db.runTransaction(async (transaction) => {
        const eventSnapshot = await transaction.get(eventRef);
        if (eventSnapshot.exists) return;
        const updates = {
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          stripeStatus: subscription.status,
          autoRenew: event.type !== "customer.subscription.deleted" && !subscription.cancel_at_period_end,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (subscription.current_period_end) updates.expiresAt = new Date(subscription.current_period_end * 1000);
        if (event.type === "customer.subscription.deleted") {
          updates.plan = "FREE";
          updates.status = "CANCELLED";
          updates.storageMb = 50;
        }
        transaction.set(subscriptionRef, updates, { merge: true });
        transaction.create(eventRef, { type: event.type, processedAt: admin.firestore.FieldValue.serverTimestamp() });
      });
    }
  }

  res.status(200).send("OK");
}

function sortedObject(value) {
  if (Array.isArray(value)) return value.map(sortedObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortedObject(value[key])]));
  }
  return value;
}

async function handleNowPaymentsWebhook(req, res) {
  const signature = String(req.get("x-nowpayments-sig") || "").toLowerCase();
  const secret = NOWPAYMENTS_IPN_SECRET.value();
  const expected = crypto.createHmac("sha512", secret).update(JSON.stringify(sortedObject(req.body))).digest("hex");
  const supplied = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  if (!signature || supplied.length !== calculated.length || !crypto.timingSafeEqual(supplied, calculated)) {
    return sendError(res, 401, "Invalid payment signature.");
  }

  const orderId = String(req.body?.order_id || "");
  const paymentStatus = String(req.body?.payment_status || "").toLowerCase();
  if (!orderId || !["finished", "confirmed"].includes(paymentStatus)) return res.status(200).send("Ignored");
  const orderRef = db.collection("payment_orders").doc(orderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) return sendError(res, 404, "Unknown payment order.");
  const order = orderSnapshot.data();
  const plan = PLANS[order.productId];
  if (!plan) return sendError(res, 400, "Invalid payment order.");

  const paymentIdStr = String(req.body.payment_id || "");

  await db.runTransaction(async (transaction) => {
    const [currentOrderSnapshot, subscriptionSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(db.collection("subscriptions").doc(order.uid)),
    ]);
    const currentOrder = currentOrderSnapshot.data() || {};
    if (currentOrder.status === "PAID") return;
    const subscription = subscriptionSnapshot.data() || {};
    const expiresAt = new Date(Math.max(Date.now(), currentExpiry(subscription).getTime()) + plan.days * 86400000);
    const recordRef = db.collection("payment_records").doc(orderId);
    transaction.set(db.collection("subscriptions").doc(order.uid), {
      zPassId: zpassId(order.uid),
      plan: plan.name.toUpperCase(),
      status: "ACTIVE",
      expiresAt,
      storageMb: 5120,
      source: "NOWPAYMENTS",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(currentOrderSnapshot.ref, {
      status: "PAID",
      paymentId: paymentIdStr,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(recordRef, {
      uid: order.uid,
      zPassId: order.zPassId,
      email: order.email || "",
      plan: plan.name.toUpperCase(),
      billing: plan.interval,
      amountUsd: order.amountUsd,
      provider: "NOWPayments",
      status: "PAID",
      orderId,
      paymentId: paymentIdStr,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  // Admin Telegram Notification for Crypto Payment
  await sendTelegramAdminNotification({
    zPassId: order.zPassId,
    email: order.email || "",
    plan: plan.name.toUpperCase(),
    amountUsd: order.amountUsd,
    provider: "NOWPayments",
    paymentId: paymentIdStr,
  });

  res.status(200).send("OK");
}

exports.payments = onRequest({
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "256MiB",
  secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID],
}, async (req, res) => {
  const origin = req.get("origin") || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Stripe-Signature, x-nowpayments-sig");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");

  const route = String(req.path || "/").replace(/^\/api(?=\/|$)/, "") || "/";
  try {
    if (route === "/checkout/create-stripe-session" && req.method === "POST") return await createStripeCheckout(req, res);
    if (route === "/checkout/create-payment" && req.method === "POST") return await createCryptoInvoice(req, res);
    if (route === "/checkout/create-portal-session" && req.method === "POST") return await createBillingPortal(req, res);
    if (route === "/stripe-webhook" && req.method === "POST") return await handleStripeWebhook(req, res);
    if (route === "/nowpayments-webhook" && req.method === "POST") return await handleNowPaymentsWebhook(req, res);
    if (route === "/health" && req.method === "GET") return res.json({ status: "ok" });
    return sendError(res, 404, "Payment route not found.");
  } catch (error) {
    console.error(`Payment API ${route} failed:`, error);
    if (!res.headersSent) sendError(res, 502, "The payment service could not complete this request.");
  }
});
