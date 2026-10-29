import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, applyActionCode, isSignInWithEmailLink, signInWithEmailLink } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {firebaseConfig} from "./firebase-config.mjs";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const actionCode = urlParams.get('oobCode');

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const loaderEl = $('loader');
const titleEl = $('title');
const subtitleEl = $('subtitle');
const actionsEl = $('actions');
const FORGOT_RECOVERY_EMAIL_KEY = "zpassForgotRecoveryEmail";

function showError(title, subtitle, statusText) {
  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  loaderEl.classList.add('hidden');
  statusEl.textContent = statusText;
  statusEl.className = "status-msg error";
}

// ---------- Standard Firebase account-email actions (unchanged) ----------
async function handleVerify() {
  if (mode === 'signIn' || isSignInWithEmailLink(auth, window.location.href)) {
    loaderEl.classList.add('hidden');
    await handleRecoveryReset();
    return;
  }

  if (!mode || !actionCode) {
    showError("Invalid Link", "This verification link is broken or has expired.", "Verification failed");
    return;
  }

  try {
    if (mode === 'verifyEmail') {
      await applyActionCode(auth, actionCode);
      titleEl.textContent = "Email Verified!";
      subtitleEl.textContent = "Your email has been successfully confirmed. You can now access all features of PassGram.";
      statusEl.className = "status-msg success";
      statusEl.textContent = "Success";
    } else if (mode === 'resetPassword') {
        // Redirect to a password reset UI or handle here
        window.location.href = `/?mode=resetPassword&oobCode=${actionCode}`;
        return;
    } else {
        statusEl.textContent = "Unsupported mode: " + mode;
    }
  } catch (error) {
    console.error(error);
    titleEl.textContent = "Verification Failed";
    subtitleEl.textContent = "We couldn't verify your account. The link might be used already.";
    statusEl.className = "status-msg error";
    statusEl.textContent = error.message;
  } finally {
    loaderEl.classList.add('hidden');
    actionsEl.classList.remove('hidden');
  }
}

// ---------- Vault recovery-password reset (Firebase email-link sign-in) ----------
// The recovery password is the vault's encryption key material — nobody, including this
// server, ever held it in the clear, so there's no way to "reset" it and keep old encrypted
// items readable. This flow proves the request is really the account owner via a Firebase
// Auth email link (verified by Firebase itself, no custom backend needed), then lets them
// set a brand-new recovery password, which starts a fresh empty vault.
function encodeBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}
const decodeBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const textDecoder = new TextDecoder();

async function decryptCloud(value, key) {
  const payload = decodeBase64(value);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: payload.slice(0, 12), tagLength: 128 }, key, payload.slice(12));
  return textDecoder.decode(plain);
}
async function encryptCloud(value, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, new TextEncoder().encode(value || "")));
  const payload = new Uint8Array(iv.length + encrypted.length);
  payload.set(iv); payload.set(encrypted, iv.length);
  return encodeBase64(payload);
}
async function encryptCloudV2(value, key1, key2) {
  return encryptCloud(await encryptCloud(value, key1), key2);
}

// Matches PortableCloudCrypto.kt's v2 scheme exactly (see app.js's deriveArgon2idKey /
// deriveSecondLayerKey), so a vault reset here stays restorable from the Android app too,
// as long as the same new recovery password is set there afterward.
async function deriveArgon2idKey(password, saltBytes) {
  const hash = await hashwasm.argon2id({
    password,
    salt: saltBytes,
    iterations: 3,
    parallelism: 4,
    memorySize: 65536,
    hashLength: 32,
    outputType: "binary"
  });
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function deriveSecondLayerKey(password, saltBytes) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 600000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function resetPortableVault(uid, newPassword) {
  throw new Error("Your encrypted backup was preserved. Use its original vault password or restore a trusted backup from another device. Email verification cannot decrypt or reset a vault.");
}

async function completeRecoverySignIn(email) {
  titleEl.textContent = "Verifying…";
  subtitleEl.textContent = "Confirming this link, one moment.";
  statusEl.textContent = "";
  statusEl.className = "status-msg";
  try {
    const result = await signInWithEmailLink(auth, email, window.location.href);
    localStorage.removeItem(FORGOT_RECOVERY_EMAIL_KEY);
    $('confirmEmailStep').classList.add('hidden');
    titleEl.textContent = "Verified";
    subtitleEl.textContent = "Set a brand-new recovery password below.";
    $('resetRecoveryForm').classList.remove('hidden');
    $('resetRecoveryForm').dataset.uid = result.user.uid;
  } catch (error) {
    console.error(error);
    showError("Link expired or invalid", "Request a new reset email from the recovery dialog and open the newest link.", error.message || "Verification failed.");
  }
}

async function handleRecoveryReset() {
  const savedEmail = localStorage.getItem(FORGOT_RECOVERY_EMAIL_KEY);
  if (savedEmail) {
    await completeRecoverySignIn(savedEmail);
    return;
  }
  // Link opened on a different device/browser than it was requested from — Firebase
  // requires re-entering the email as proof, it doesn't trust the link alone.
  titleEl.textContent = "Confirm it's you";
  subtitleEl.textContent = "Enter the email you requested this link with.";
  $('confirmEmailStep').classList.remove('hidden');
  $('confirmEmailBtn').addEventListener('click', () => {
    const email = $('confirmEmailInput').value.trim();
    if (!email) return;
    completeRecoverySignIn(email);
  });
}

$('setNewRecoveryBtn').addEventListener('click', async () => {
  const password = $('newRecoveryPassword').value;
  const confirmPassword = $('newRecoveryPasswordConfirm').value;
  const uid = $('resetRecoveryForm').dataset.uid;
  statusEl.className = "status-msg";
  if (password.length < 10) { statusEl.className = "status-msg error"; statusEl.textContent = "At least 10 characters."; return; }
  if (password !== confirmPassword) { statusEl.className = "status-msg error"; statusEl.textContent = "Passwords don't match."; return; }

  const button = $('setNewRecoveryBtn');
  button.disabled = true;
  statusEl.textContent = "Creating your new vault…";
  try {
    await resetPortableVault(uid, password);
    $('resetRecoveryForm').classList.add('hidden');
    titleEl.textContent = "Recovery password reset";
    subtitleEl.textContent = "Remember to set the same new password in the PassGram Android app so both stay in sync.";
    statusEl.className = "status-msg success";
    statusEl.textContent = "Done — redirecting you to sign in…";
    setTimeout(() => (window.location.href = "./"), 2500);
  } catch (error) {
    console.error(error);
    statusEl.className = "status-msg error";
    statusEl.textContent = error.message || "Could not reset the vault.";
    button.disabled = false;
  }
});

handleVerify();
