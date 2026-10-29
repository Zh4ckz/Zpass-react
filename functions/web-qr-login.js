"use strict";

const crypto = require("node:crypto");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const db = admin.firestore();

const ORIGINS = [
  "https://web.zpas.org", "https://login.zpas.org", "https://zpas.org",
  "https://www.zpas.org", /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
];
const TTL_MS = 2 * 60 * 1000;
const APP_LOGIN_TTL_MS = 60 * 1000;
const callable = (handler) => onCall({ region: "us-central1", cors: ORIGINS, maxInstances: 10 }, handler);
const validSecret = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const digest = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
function matches(value, storedHash) {
  if (!validSecret(value) || typeof storedHash !== "string" || !/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  const actual = Buffer.from(digest(value), "hex"), expected = Buffer.from(storedHash, "hex");
  return crypto.timingSafeEqual(actual, expected);
}
function requestRef(requestId) {
  if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{24,40}$/.test(requestId)) {
    throw new HttpsError("invalid-argument", "Invalid Z Pass QR request.");
  }
  return db.collection("webQrLogins").doc(requestId);
}

exports.createWebQrLogin = callable(async (request) => {
  const origin = request.rawRequest.get("origin") || "";
  if (!ORIGINS.some((allowed) => allowed instanceof RegExp ? allowed.test(origin) : allowed === origin)) {
    throw new HttpsError("permission-denied", "This website cannot create a login request.");
  }
  const { qrSecret, pollSecret } = request.data || {};
  if (!validSecret(qrSecret) || !validSecret(pollSecret) || qrSecret === pollSecret) {
    throw new HttpsError("invalid-argument", "Invalid one-time login credentials.");
  }

  const now = Date.now();
  const addressHash = crypto.createHash("sha256").update(`zpass-web-qr-v1:${request.rawRequest.ip || "unknown"}`).digest("hex");
  const rateRef = db.collection("webQrLoginRateLimits").doc(addressHash);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateRef);
    const start = Number(snap.get("startedAt") || 0);
    const count = start && now - start < 10 * 60 * 1000 ? Number(snap.get("count") || 0) : 0;
    if (count >= 15) throw new HttpsError("resource-exhausted", "Too many QR requests. Try again later.");
    tx.set(rateRef, {
      startedAt: count ? start : now,
      count: count + 1,
      expiresAt: admin.firestore.Timestamp.fromMillis(now + 24 * 60 * 60 * 1000)
    });
  });

  const requestId = crypto.randomBytes(24).toString("base64url");
  const expiresAt = now + TTL_MS;
  await db.collection("webQrLogins").doc(requestId).create({
    qrSecretHash: digest(qrSecret),
    pollSecretHash: digest(pollSecret),
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
    deviceName: String(request.data?.deviceName || "Web browser").slice(0, 80)
  });
  return { requestId, expiresAt };
});

exports.approveWebQrLogin = callable(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in to Z Pass on your phone first.");
  const { requestId, qrSecret } = request.data || {};
  const ref = requestRef(requestId);
  if (!validSecret(qrSecret)) throw new HttpsError("invalid-argument", "Invalid Z Pass QR request.");
  const customToken = await admin.auth().createCustomToken(uid);
  const approved = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !matches(qrSecret, snap.get("qrSecretHash"))) throw new HttpsError("not-found", "This QR request is not valid.");
    if (snap.get("status") !== "pending") throw new HttpsError("failed-precondition", "This QR request has already been used.");
    if (snap.get("expiresAt")?.toMillis() <= Date.now()) {
      tx.update(ref, { status: "expired", qrSecretHash: "", pollSecretHash: "" });
      return false;
    }
    tx.update(ref, {
      status: "approved", uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      customToken
    });
    return true;
  });
  if (!approved) throw new HttpsError("deadline-exceeded", "This QR code expired. Create a new one on the website.");
  return { approved: true };
});

exports.pollWebQrLogin = callable(async (request) => {
  const { requestId, pollSecret } = request.data || {};
  const ref = requestRef(requestId);
  if (!validSecret(pollSecret)) throw new HttpsError("invalid-argument", "Invalid QR polling credentials.");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !matches(pollSecret, snap.get("pollSecretHash"))) throw new HttpsError("not-found", "This QR request is no longer available.");
    if (snap.get("expiresAt")?.toMillis() <= Date.now()) {
      tx.update(ref, { status: "expired", qrSecretHash: "", pollSecretHash: "", customToken: admin.firestore.FieldValue.delete() });
      return { status: "expired" };
    }
    if (snap.get("status") === "approved" && snap.get("customToken") && snap.get("consumed") !== true) {
      return { status: "approved", customToken: snap.get("customToken") };
    }
    return { status: snap.get("status") === "consumed" ? "cancelled" : snap.get("status") };
  });
});

exports.completeWebQrLogin = callable(async (request) => {
  const { requestId, pollSecret } = request.data || {};
  const ref = requestRef(requestId);
  if (!validSecret(pollSecret)) throw new HttpsError("invalid-argument", "Invalid QR completion credentials.");
  const completed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !matches(pollSecret, snap.get("pollSecretHash"))) throw new HttpsError("not-found", "This QR request is no longer available.");
    if (snap.get("status") !== "approved") throw new HttpsError("failed-precondition", "The phone has not approved this login.");
    if (snap.get("expiresAt")?.toMillis() <= Date.now()) {
      tx.update(ref, { status: "expired", qrSecretHash: "", pollSecretHash: "", customToken: admin.firestore.FieldValue.delete() });
      return false;
    }
    tx.update(ref, {
      status: "consumed", consumed: true,
      customToken: admin.firestore.FieldValue.delete(),
      qrSecretHash: "", pollSecretHash: ""
    });
    return true;
  });
  if (!completed) throw new HttpsError("deadline-exceeded", "This QR login expired. Start again on the website.");
  return { completed: true };
});

exports.cleanupWebQrLoginRequests = onSchedule({ schedule: "every 6 hours", region: "us-central1", maxInstances: 1 }, async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const oldRequests = await db.collection("webQrLogins").where("expiresAt", "<", cutoff).limit(400).get();
  const oldRateLimits = await db.collection("webQrLoginRateLimits").where("expiresAt", "<", admin.firestore.Timestamp.now()).limit(400).get();
  const oldAppLoginRequests = await db.collection("loginRequests")
    .where("expiresAt", "<", admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000)).limit(400).get();
  const batch = db.batch();
  oldRequests.docs.forEach((item) => batch.delete(item.ref));
  oldRateLimits.docs.forEach((item) => batch.delete(item.ref));
  oldAppLoginRequests.docs.filter((item) => item.get("purpose") === "APP_LOGIN").forEach((item) => batch.delete(item.ref));
  await batch.commit();
});

// Passwordless web sign-in approved by an already signed-in Z Pass Android app.
// The browser receives only a poll secret; the app sees the request through its
// authenticated loginRequests listener. The account lookup never returns UID or
// whether the identifier exists.
const appLoginCallable = (handler) => onCall({ region: "us-central1", cors: ORIGINS, maxInstances: 10, enforceAppCheck: false }, handler);
const appLoginRef = (id) => {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{24,40}$/.test(id)) throw new HttpsError("invalid-argument", "Invalid sign-in request.");
  return db.collection("loginRequests").doc(id);
};
exports.requestAppLogin = appLoginCallable(async (request) => {
  const origin = request.rawRequest.get("origin") || "";
  if (!ORIGINS.some((allowed) => allowed instanceof RegExp ? allowed.test(origin) : allowed === origin)) throw new HttpsError("permission-denied", "This website cannot request sign-in.");
  const identifier = String(request.data?.identifier || "").trim();
  const pollSecret = request.data?.pollSecret;
  const displayCode = request.data?.displayCode;
  const candidateCodes = request.data?.candidateCodes;
  if (identifier.length < 6 || identifier.length > 254 || !validSecret(pollSecret) || !/^\d{2}$/.test(displayCode) ||
      !Array.isArray(candidateCodes) || candidateCodes.length !== 3 || new Set(candidateCodes).size !== 3 ||
      candidateCodes.some((code) => !/^\d{2}$/.test(code)) || !candidateCodes.includes(displayCode)) {
    throw new HttpsError("invalid-argument", "Enter a valid email or phone number.");
  }
  const now = Date.now();
  const addressHash = digest(`app-login-v1:${request.rawRequest.ip || "unknown"}`);
  const identifierHash = digest(`app-login-identifier-v1:${identifier.toLowerCase()}`);
  const rateRefs = [db.collection("appLoginRateLimits").doc(addressHash), db.collection("appLoginIdentifierRateLimits").doc(identifierHash)];
  await db.runTransaction(async (tx) => {
    const snapshots = await Promise.all(rateRefs.map((ref) => tx.get(ref)));
    const updates = snapshots.map((snap) => {
      const start = Number(snap.get("startedAt") || 0);
      const count = start && now - start < 10 * 60 * 1000 ? Number(snap.get("count") || 0) : 0;
      return { startedAt: count ? start : now, count: count + 1,
        expiresAt: admin.firestore.Timestamp.fromMillis(now + 24 * 60 * 60 * 1000), overLimit: count >= 8 };
    });
    if (updates.some((update) => update.overLimit)) throw new HttpsError("resource-exhausted", "Too many requests. Try again later.");
    rateRefs.forEach((ref, index) => { const { overLimit, ...value } = updates[index]; tx.set(ref, value); });
  });

  let user = null;
  try {
    if (identifier.includes("@")) user = await admin.auth().getUserByEmail(identifier.toLowerCase());
    else {
      const digits = identifier.replace(/[^\d+]/g, "");
      const normalized = digits.startsWith("+") ? `+${digits.slice(1).replace(/\D/g, "")}` : `+${digits.replace(/\D/g, "")}`;
      if (/^\+[1-9]\d{7,14}$/.test(normalized)) user = await admin.auth().getUserByPhoneNumber(normalized);
    }
  } catch { /* Keep the public response identical for unknown users. */ }

  const requestId = crypto.randomBytes(24).toString("base64url");
  const expiresAt = now + APP_LOGIN_TTL_MS;
  const record = {
    purpose: "APP_LOGIN", status: "pending", displayCode, candidateCodes: candidateCodes.join(","),
    pollSecretHash: digest(pollSecret), deviceLabel: String(request.data?.deviceLabel || "Web browser").slice(0, 80),
    createdAt: admin.firestore.Timestamp.fromMillis(now), expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
  };
  if (user && !user.disabled) Object.assign(record, { uid: user.uid, accountEmail: user.email || "" });
  await db.collection("loginRequests").doc(requestId).create(record);
  return { requestId, expiresAt };
});

exports.pollAppLogin = appLoginCallable(async (request) => {
  const ref = appLoginRef(request.data?.requestId);
  const secret = request.data?.pollSecret;
  if (!validSecret(secret)) throw new HttpsError("invalid-argument", "Invalid sign-in request.");
  const state = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !matches(secret, snap.get("pollSecretHash"))) throw new HttpsError("not-found", "Sign-in request expired.");
    if (snap.get("expiresAt")?.toMillis() <= Date.now()) {
      tx.update(ref, { status: "expired", pollSecretHash: "" });
      return { status: "expired" };
    }
    if (snap.get("status") === "approved" && snap.get("uid") && snap.get("consumed") !== true) {
      const uid = snap.get("uid");
      tx.update(ref, { status: "consumed", consumed: true, pollSecretHash: "" });
      return { status: "approved", uid };
    }
    return { status: snap.get("status") };
  });
  return state.status === "approved" && state.uid
    ? { status: "approved", customToken: await admin.auth().createCustomToken(state.uid) }
    : state;
});
