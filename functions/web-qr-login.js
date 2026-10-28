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
  const batch = db.batch();
  oldRequests.docs.forEach((item) => batch.delete(item.ref));
  oldRateLimits.docs.forEach((item) => batch.delete(item.ref));
  await batch.commit();
});
