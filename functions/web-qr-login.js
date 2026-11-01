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
const WEB_QR_TTL_MS = 10 * 60 * 1000;
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
function webSessionId(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{32,64}$/i.test(value)) {
    throw new HttpsError("invalid-argument", "Invalid web device session.");
  }
  return value;
}

async function registerWebSession(tx, uid, deviceId, deviceName, eventId, locationLabel, loginMethod) {
  const userRef = db.collection("users").doc(uid);
  const deviceRef = userRef.collection("devices").doc(deviceId);
  const directoryRef = userRef.collection("sessionDirectory").doc(deviceId);
  const eventRef = userRef.collection("securityEvents").doc(eventId);
  const [deviceSnapshot, directorySnapshot] = await Promise.all([
    tx.get(deviceRef),
    tx.get(directoryRef)
  ]);
  if (deviceSnapshot.get("revoked") === true || directorySnapshot.get("revoked") === true) {
    throw new HttpsError("failed-precondition", "This browser session was terminated. Sign in again from a new browser session.");
  }

  const firstLogin = !deviceSnapshot.exists;
  const sessionData = {
    deviceId,
    ownerUid: uid,
    platform: "WEB",
    deviceName,
    appVersion: "Web",
    lastSeenAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (firstLogin) {
    sessionData.revoked = false;
    sessionData.firstSeenAt = admin.firestore.FieldValue.serverTimestamp();
  }
  tx.set(deviceRef, sessionData, { merge: true });
  tx.set(directoryRef, {
    deviceId,
    ownerUid: uid,
    deviceName,
    platform: "WEB",
    appVersion: "Web",
    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(firstLogin ? { revoked: false } : {})
  }, { merge: true });
  if (firstLogin) {
    tx.create(eventRef, {
      eventType: "NEW_LOGIN",
      loginMethod,
      deviceId,
      deviceName,
      platform: "WEB",
      locationLabel,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return firstLogin;
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
  const expiresAt = now + WEB_QR_TTL_MS;
  const latitude = request.data?.latitude;
  const longitude = request.data?.longitude;
  const hasLocation = typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  await db.collection("webQrLogins").doc(requestId).create({
    qrSecretHash: digest(qrSecret),
    pollSecretHash: digest(pollSecret),
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
    deviceName: String(request.data?.deviceName || "Web browser").slice(0, 80),
    locationLabel: hasLocation ? `${latitude.toFixed(3)}, ${longitude.toFixed(3)}` : "Location unavailable"
  });
  return { requestId, expiresAt };
});

exports.approveWebQrLogin = callable(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in to Z Pass on your phone first.");
  const { requestId, qrSecret } = request.data || {};
  const ref = requestRef(requestId);
  if (!validSecret(qrSecret)) throw new HttpsError("invalid-argument", "Invalid Z Pass QR request.");
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
      customToken: admin.firestore.FieldValue.delete()
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
  const state = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !matches(pollSecret, snap.get("pollSecretHash"))) throw new HttpsError("not-found", "This QR request is no longer available.");
    if (snap.get("expiresAt")?.toMillis() <= Date.now()) {
      tx.update(ref, { status: "expired", qrSecretHash: "", pollSecretHash: "", customToken: admin.firestore.FieldValue.delete() });
      return { status: "expired" };
    }
    if (snap.get("status") === "approved" && snap.get("uid") && snap.get("consumed") !== true) {
      const uid = snap.get("uid");
      tx.update(ref, {
        status: "consumed",
        consumed: true,
        qrSecretHash: "",
        customToken: admin.firestore.FieldValue.delete(),
        tokenIssuedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { status: "approved", uid };
    }
    return { status: snap.get("status") === "consumed" ? "cancelled" : snap.get("status") };
  });
  return state.status === "approved" && state.uid
    ? { status: "approved", customToken: await admin.auth().createCustomToken(state.uid) }
    : state;
});

exports.completeWebQrLogin = callable(async (request) => {
  const { requestId, pollSecret } = request.data || {};
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in before completing this web login.");
  const ref = requestRef(requestId);
  if (!validSecret(pollSecret)) throw new HttpsError("invalid-argument", "Invalid QR completion credentials.");
  const deviceId = webSessionId(request.data?.deviceId);
  const completed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !matches(pollSecret, snap.get("pollSecretHash"))) throw new HttpsError("not-found", "This QR request is no longer available.");
    if (snap.get("uid") !== uid) throw new HttpsError("permission-denied", "This login request belongs to another account.");
    if (snap.get("status") === "completed") return true;
    if (snap.get("status") !== "consumed" || !snap.get("tokenIssuedAt")) {
      throw new HttpsError("failed-precondition", "This web login has not been exchanged for a session.");
    }
    await registerWebSession(
      tx,
      uid,
      deviceId,
      String(snap.get("deviceName") || "Web browser").slice(0, 80),
      requestId,
      String(snap.get("locationLabel") || "Location unavailable").slice(0, 120),
      "QR"
    );
    tx.update(ref, {
      status: "completed",
      customToken: admin.firestore.FieldValue.delete(),
      qrSecretHash: ""
    });
    return true;
  });
  if (!completed) throw new HttpsError("deadline-exceeded", "This QR login expired. Start again on the website.");
  return { completed: true };
});

exports.registerWebLoginSession = callable(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in before registering this web session.");
  const deviceId = webSessionId(request.data?.deviceId);
  const deviceName = String(request.data?.deviceName || "Web browser").slice(0, 80);
  const loginRequestId = request.data?.loginRequestId;
  if (typeof loginRequestId !== "string" || !/^[A-Za-z0-9_-]{24,40}$/.test(loginRequestId)) {
    throw new HttpsError("invalid-argument", "Invalid login event.");
  }
  const loginMethod = request.data?.loginMethod === "APP_OTP" ? "APP_OTP" : null;
  if (!loginMethod) throw new HttpsError("invalid-argument", "Invalid login method.");
  await db.runTransaction((tx) => registerWebSession(
    tx,
    uid,
    deviceId,
    deviceName,
    loginRequestId,
    "Location unavailable",
    loginMethod
  ));
  return { registered: true };
});

exports.cleanupWebQrLoginRequests = onSchedule({ schedule: "every 6 hours", region: "us-central1", maxInstances: 1 }, async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const oldRequests = await db.collection("webQrLogins").where("expiresAt", "<", cutoff).limit(400).get();
  const oldRateLimits = await db.collection("webQrLoginRateLimits").where("expiresAt", "<", admin.firestore.Timestamp.now()).limit(400).get();
  const oldAppLoginRequests = await db.collection("loginRequests")
    .where("expiresAt", "<", admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000)).limit(400).get();
  const oldAppLoginChallenges = await db.collection("appLoginOtpChallenges")
    .where("expiresAt", "<", admin.firestore.Timestamp.now()).limit(400).get();
  const batch = db.batch();
  oldRequests.docs.forEach((item) => batch.delete(item.ref));
  oldRateLimits.docs.forEach((item) => batch.delete(item.ref));
  oldAppLoginRequests.docs
    .filter((item) => ["APP_LOGIN", "APP_LOGIN_OTP"].includes(item.get("purpose")))
    .forEach((item) => batch.delete(item.ref));
  oldAppLoginChallenges.docs.forEach((item) => batch.delete(item.ref));
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
const appLoginOtpRef = (id) => db.collection("appLoginOtpChallenges").doc(id);

async function enforceAppLoginRateLimit(request, identifier) {
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
}

async function findAppLoginUser(identifier) {
  try {
    if (identifier.includes("@")) return await admin.auth().getUserByEmail(identifier.toLowerCase());
    const digits = identifier.replace(/[^\d+]/g, "");
    const normalized = digits.startsWith("+") ? `+${digits.slice(1).replace(/\D/g, "")}` : `+${digits.replace(/\D/g, "")}`;
    if (/^\+[1-9]\d{7,14}$/.test(normalized)) return await admin.auth().getUserByPhoneNumber(normalized);
  } catch { /* Keep the public response identical for unknown users. */ }
  return null;
}

async function sendAppLoginOtp(user, requestId, code, expiresAt, deviceLabel) {
  const userRef = db.collection("users").doc(user.uid);
  const userSnapshot = await userRef.get();
  const tokens = [...new Set(userSnapshot.data()?.fcmTokens || [])].filter(Boolean).slice(-500);
  if (!tokens.length) return;

  const result = await admin.messaging().sendEachForMulticast({
    tokens,
    data: {
      type: "login_approval",
      purpose: "APP_LOGIN_OTP",
      requestId,
      uid: user.uid,
      verificationCode: code,
      expiresAtMillis: String(expiresAt),
      deviceLabel
    },
    android: { priority: "high", ttl: APP_LOGIN_TTL_MS }
  });
  const invalidTokens = [];
  result.responses.forEach((response, index) => {
    const errorCode = response.error?.code || "";
    if (errorCode.includes("registration-token-not-registered") || errorCode.includes("invalid-registration-token")) {
      invalidTokens.push(tokens[index]);
    }
  });
  if (invalidTokens.length) {
    await userRef.update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens) });
  }
  if (result.failureCount) {
    console.warn("Some app login OTP notifications could not be delivered", {
      uid: user.uid,
      failureCount: result.failureCount
    });
  }
}
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
  await enforceAppLoginRateLimit(request, identifier);
  const user = await findAppLoginUser(identifier);

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

// Passwordless sign-in with an OTP delivered only to the user's registered app.
exports.requestAppLoginOtp = appLoginCallable(async (request) => {
  const origin = request.rawRequest.get("origin") || "";
  if (!ORIGINS.some((allowed) => allowed instanceof RegExp ? allowed.test(origin) : allowed === origin)) {
    throw new HttpsError("permission-denied", "This website cannot request sign-in.");
  }
  const identifier = String(request.data?.identifier || "").trim();
  const pollSecret = request.data?.pollSecret;
  if (identifier.length < 6 || identifier.length > 254 || !validSecret(pollSecret)) {
    throw new HttpsError("invalid-argument", "Enter a valid email or phone number.");
  }

  await enforceAppLoginRateLimit(request, identifier);
  const user = await findAppLoginUser(identifier);
  const requestId = crypto.randomBytes(24).toString("base64url");
  const verificationCode = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = Date.now() + APP_LOGIN_TTL_MS;
  const deviceLabel = String(request.data?.deviceLabel || "Web browser").slice(0, 80);
  const latitude = request.data?.latitude;
  const longitude = request.data?.longitude;
  const hasLocation = typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  const locationLabel = hasLocation ? `${latitude.toFixed(3)}, ${longitude.toFixed(3)}` : "Location unavailable";
  const record = {
    purpose: "APP_LOGIN_OTP",
    status: "pending",
    displayCode: "",
    candidateCodes: "",
    pollSecretHash: digest(pollSecret),
    deviceLabel,
    locationLabel,
    locationKind: hasLocation ? "browser-coordinates" : "unavailable",
    accountName: user?.displayName || user?.email?.split("@")[0] || "",
    accountEmail: user?.email || "",
    createdAt: admin.firestore.Timestamp.fromMillis(Date.now()),
    expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt)
  };
  if (user && !user.disabled) record.uid = user.uid;

  await db.runTransaction(async (tx) => {
    tx.create(appLoginRef(requestId), record);
    tx.create(appLoginOtpRef(requestId), {
      otpHash: digest(`app-login-otp-v1:${requestId}:${verificationCode}`),
      attempts: 0,
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt)
    });
  });
  if (user && !user.disabled) {
    try {
      await sendAppLoginOtp(user, requestId, verificationCode, expiresAt, deviceLabel);
    } catch (error) {
      console.error("Could not send app login OTP notification", {
        uid: user.uid,
        errorName: error instanceof Error ? error.name : "UnknownError"
      });
    }
  }
  return { requestId, expiresAt };
});

exports.cancelAppLoginOtp = appLoginCallable(async (request) => {
  const pollSecret = request.data?.pollSecret;
  if (!validSecret(pollSecret)) throw new HttpsError("invalid-argument", "Invalid sign-in request.");
  const requestDocument = appLoginRef(request.data?.requestId);
  const challengeDocument = appLoginOtpRef(request.data?.requestId);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(requestDocument);
    if (!snapshot.exists || snapshot.get("purpose") !== "APP_LOGIN_OTP" ||
        !matches(pollSecret, snapshot.get("pollSecretHash"))) {
      throw new HttpsError("not-found", "Sign-in request expired.");
    }
    if (snapshot.get("status") === "pending") {
      tx.update(requestDocument, { status: "cancelled" });
      tx.delete(challengeDocument);
    }
  });
  return { cancelled: true };
});

exports.verifyAppLoginOtp = appLoginCallable(async (request) => {
  const requestId = request.data?.requestId;
  const pollSecret = request.data?.pollSecret;
  const verificationCode = request.data?.verificationCode;
  if (!validSecret(pollSecret) || typeof verificationCode !== "string" || !/^\d{6}$/.test(verificationCode)) {
    throw new HttpsError("invalid-argument", "Enter the 6-digit code from the Z Pass app.");
  }
  const requestDocument = appLoginRef(requestId);
  const challengeDocument = appLoginOtpRef(requestId);
  const result = await db.runTransaction(async (tx) => {
    const [requestSnapshot, challengeSnapshot] = await Promise.all([
      tx.get(requestDocument),
      tx.get(challengeDocument)
    ]);
    if (!requestSnapshot.exists || requestSnapshot.get("purpose") !== "APP_LOGIN_OTP" ||
        !matches(pollSecret, requestSnapshot.get("pollSecretHash"))) {
      throw new HttpsError("not-found", "Sign-in request expired.");
    }
    if (requestSnapshot.get("status") !== "pending" || !challengeSnapshot.exists ||
        challengeSnapshot.get("expiresAt")?.toMillis() <= Date.now()) {
      return { status: "expired", attemptsRemaining: 0 };
    }

    const attempts = Number(challengeSnapshot.get("attempts") || 0);
    if (attempts >= 5) {
      tx.update(requestDocument, { status: "locked" });
      tx.delete(challengeDocument);
      return { status: "locked", attemptsRemaining: 0 };
    }
    const actualHash = Buffer.from(digest(`app-login-otp-v1:${requestId}:${verificationCode}`), "hex");
    const expectedHash = Buffer.from(String(challengeSnapshot.get("otpHash") || ""), "hex");
    const matchesCode = expectedHash.length === actualHash.length && crypto.timingSafeEqual(actualHash, expectedHash);
    if (!matchesCode) {
      const nextAttempts = attempts + 1;
      if (nextAttempts >= 5) {
        tx.update(requestDocument, { status: "locked" });
        tx.delete(challengeDocument);
        return { status: "locked", attemptsRemaining: 0 };
      }
      tx.update(challengeDocument, { attempts: nextAttempts });
      return { status: "invalid", attemptsRemaining: 5 - nextAttempts };
    }

    tx.update(requestDocument, {
      status: "approved",
      respondedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    tx.delete(challengeDocument);
    return { status: "verified", attemptsRemaining: 5 - attempts };
  });
  return result;
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
