"use strict";

const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const HANDLE = /^[A-Za-z0-9_]{3,32}$/;
const MAX_PHOTO_BYTES = 400000;

function imageMime(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.length > 8 && buffer.subarray(1, 4).toString("ascii") === "PNG") return "image/png";
  if (buffer.length > 12 && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "";
}

async function resolveUid(handle) {
  const lower = handle.toLowerCase();
  for (const id of new Set([lower, handle])) {
    const snap = await db.collection("chat_usernames").doc(id).get();
    const uid = snap.exists ? snap.data().uid : "";
    if (typeof uid === "string" && uid) return uid;
  }
  const byProfile = await db.collection("chat_profiles").where("username", "==", handle).limit(1).get();
  return byProfile.empty ? "" : byProfile.docs[0].id;
}

// Exposes only display name, username and avatar for the public link page.
exports.publicProfile = onRequest({
  region: "us-central1",
  timeoutSeconds: 15,
  memory: "256MiB",
  cors: ["https://zpas.org", "https://passgram.web.app"],
}, async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const handle = String(req.query.u || "").replace(/^@/, "");
  if (!HANDLE.test(handle)) return res.status(400).json({ error: "invalid_username" });

  try {
    const uid = await resolveUid(handle);
    if (!uid) return res.status(404).json({ error: "not_found" });

    const [profileSnap, mediaSnap] = await Promise.all([
      db.collection("chat_profiles").doc(uid).get(),
      db.collection("chat_media_profiles").doc(uid).get(),
    ]);
    const profile = profileSnap.data() || {};
    const photoBytes = mediaSnap.data()?.photo;
    const photoBuffer = photoBytes && Buffer.isBuffer(photoBytes) ? photoBytes : null;
    const mime = photoBuffer && photoBuffer.length <= MAX_PHOTO_BYTES ? imageMime(photoBuffer) : "";

    res.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res.json({
      username: String(profile.username || handle),
      name: String(profile.displayName || profile.username || handle).slice(0, 80),
      photo: mime ? `data:${mime};base64,${photoBuffer.toString("base64")}` : "",
    });
  } catch (error) {
    console.error("publicProfile failed:", error);
    return res.status(502).json({ error: "unavailable" });
  }
});
