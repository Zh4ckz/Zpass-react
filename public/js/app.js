import "./web-ads.mjs?v=2";
import {maskEmail} from './account-privacy.mjs?v=1';
import {installHoldSelection} from './hold-selection.mjs?v=1';
import {paymentPlans,runtimeConfig} from './payment-plans.mjs';
import {readZhc,writeZhc,MAX_BACKUP_BYTES} from './zhc-backup.mjs';
import {scope,archived,matchesScope,visibleItems,setScope} from './vault-state.mjs';
import {installDesktopUi,showLoginDetails,refreshDetails,inputDialog,showError} from './desktop-vault-ui.mjs';
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, sendSignInLinkToEmail, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const languageApi = window.ZPassI18n || {
  setLanguage: () => {},
  getLanguage: () => "en",
  getSavedLanguage: () => localStorage.getItem("zpassLanguage") || "en",
  t: (_tr, en) => en
};
const { setLanguage, getLanguage, t } = languageApi;

import {firebaseConfig} from "./firebase-config.mjs";
import {takeCheckout} from "./navigation.mjs";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
 $("topbarBack")?.addEventListener("click", (event) => {
  if (window.history.length > 1) {
    event.preventDefault();
    window.history.back();
  }
});
const authView = $("authView");
const dashboardView = $("dashboardView");
let vaultUnlockDurationMs = Number(localStorage.getItem("zpassAutoLockMinutes") || "30") * 60 * 1000;
$("webLanguage").value = "en-US";
setLanguage(languageApi.getSavedLanguage(), false);
$("webLanguage").addEventListener("change", event => setLanguage(event.target.value));

function message(text, good = false) {
  const el = $("authMessage");
  el.textContent = text;
  el.style.color = good ? "#adb2b9" : "#CCD6DD";
}

// ---------- Vault unlock code (TOTP 2FA from the app's Authenticator tab) ----------
// Login itself only needs email + password. This code is asked for separately,
// when the user tries to view credentials/cards/authenticator codes: entering it
// both proves possession of the phone AND derives the vault decryption key (the
// same secret the APK uses as key material for AES-256-GCM-recovery-v1 — see
// WebLoginAuth.kt / PortableCloudCrypto.kt). Accounts that haven't turned this
// code on yet, or whose vault predates it, fall back to #recoveryDialog.

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(input || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, buffer = 0;
  const bytes = [];
  for (const char of clean) {
    buffer = (buffer << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

async function totpCodeAt(secretBase32, offsetSteps, periodSeconds = 30, digits = 6) {
  const keyBytes = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / periodSeconds) + offsetSteps;
  const counterBuffer = new ArrayBuffer(8);
  new DataView(counterBuffer).setUint32(4, counter, false);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, counterBuffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  const modulus = 10 ** digits;
  return String(binary % modulus).padStart(digits, "0");
}

async function verifyTotpCode(secretBase32, codeInput) {
  const code = String(codeInput || "").trim();
  if (!/^\d{6}$/.test(code)) return false;
  // Allow the previous/next 30s window too, for clock drift between phone and browser.
  for (const offset of [0, -1, 1]) {
    if ((await totpCodeAt(secretBase32, offset)) === code) return true;
  }
  return false;
}

let pendingUnlockSecret = null;

async function fetchWebLoginSecret(uid) {
  try {
    const snapshot = await getDoc(doc(db, "users", uid));
    const data = snapshot.exists() ? snapshot.data() : {};
    if (data.webLoginEnabled && data.webLoginSecret) return data.webLoginSecret;
    return null;
  } catch {
    return null;
  }
}

// ---------- Approve-on-phone sign-in ----------
// Replaces typing a recovery password or a 6-digit code: this writes a "loginRequests" doc with
// a 2-digit code, the already-signed-in Android app shows that code among 3 candidates and relays
// the account's recovery secret (AES-GCM-encrypted under a key only these two devices ever see)
// once the user taps the matching one. See ZPassManager's LoginApprovalClient.cs (desktop) and
// LoginApproval.kt (Android, the approving side) for the same protocol.
let approvalUnsubscribe = null;
let approvalTimer = null;
let approvalCountdown = null;
let approvalRequestRef = null;
let approvalGeneration = 0;

function randomTwoDigitCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 100).padStart(2, "0");
}

function distinctCodes(count) {
  const codes = new Set();
  while (codes.size < count) codes.add(randomTwoDigitCode());
  return [...codes];
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary);
}

function approvalText(value,...args){return (window.ZPassI18n?.get(value) || value).replace(/\{(\d+)\}/g,(_,index)=>String(args[Number(index)] ?? ''));}
function stopApprovalListener() {
  ++approvalGeneration;
  approvalUnsubscribe?.();approvalUnsubscribe=null;
  clearTimeout(approvalTimer);approvalTimer=null;
  clearInterval(approvalCountdown);approvalCountdown=null;
  if(approvalRequestRef){deleteDoc(approvalRequestRef).catch(()=>{});approvalRequestRef=null;}
}
async function startApprovalRequest(user) {
  stopApprovalListener();const generation=approvalGeneration;
  $('loginApprovalMessage').textContent='';$('loginApprovalCode').textContent='--';
  $('loginApprovalRetry').hidden=true;
  if(!$('loginApprovalDialog').open)$('loginApprovalDialog').showModal();
  const wrapKeyBytes=crypto.getRandomValues(new Uint8Array(32));
  const wrapKey=await crypto.subtle.importKey('raw',wrapKeyBytes,'AES-GCM',false,['decrypt']);
  const codes=distinctCodes(3),displayCode=codes[0];
  let requestRef;
  try {
    requestRef=await addDoc(collection(db,'loginRequests'),{uid:user.uid,purpose:'LOGIN',deviceLabel:`Browser · ${navigator.platform || 'Web'}`,accountEmail:user.email || '',locationLabel:'',locationKind:'unavailable',displayCode,candidateCodes:codes.join(','),wrapKey:bytesToBase64(wrapKeyBytes),status:'pending',createdAt:serverTimestamp()});
  }catch{
    if(generation===approvalGeneration){$('loginApprovalMessage').textContent=approvalText('Could not complete this request. Check your connection and try again.');$('loginApprovalRetry').hidden=false;}
    return;
  }
  if(generation!==approvalGeneration || !$('loginApprovalDialog').open){deleteDoc(requestRef).catch(()=>{});return;}
  approvalRequestRef=requestRef;
  let deadline=Date.now()+60000;
  $('loginApprovalCode').textContent=displayCode;
  const fail=message=>{stopApprovalListener();$('loginApprovalCode').textContent='--';$('loginApprovalMessage').textContent=approvalText(message);$('loginApprovalRetry').hidden=false;};
  const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(!remaining){fail('This request expired. Request a new code on your computer.');return;}$('loginApprovalMessage').textContent=approvalText('Expires in {0}s',remaining);};
  tick();approvalCountdown=setInterval(tick,250);approvalTimer=setTimeout(()=>fail('This request expired. Request a new code on your computer.'),60000);
  approvalUnsubscribe=onSnapshot(requestRef,async snapshot=>{
    if(generation!==approvalGeneration)return;
    const data=snapshot.data();
    const created=data?.createdAt?.toMillis?.();if(Number.isFinite(created))deadline=Math.min(deadline,created+60000);
    if(Date.now()>=deadline){fail('This request expired. Request a new code on your computer.');return;}
    if(!data){fail('This request expired. Request a new code on your computer.');return;}
    if(data.status==='pending')return;
    stopApprovalListener();const completedGeneration=approvalGeneration;
    if(data.status==='approved'){
      try {
        const secret=await decryptCloud(data.approvedSecretEnc,wrapKey);
        if(completedGeneration!==approvalGeneration || !$('loginApprovalDialog').open || auth.currentUser?.uid!==user.uid)return;
        $('loginApprovalDialog').close();$('loginApprovalCode').textContent='--';
        await unlockCloudVault(secret);
      }catch{$('loginApprovalMessage').textContent=approvalText('Could not complete this request. Check your connection and try again.');$('loginApprovalRetry').hidden=false;$('loginApprovalCode').textContent='--';}
    }else{$('loginApprovalMessage').textContent=approvalText('Sign-in was denied on your phone.');$('loginApprovalCode').textContent='--';$('loginApprovalRetry').hidden=false;}
  },()=>fail('Approval requests are unavailable.'));
}
$('loginApprovalRetry')?.addEventListener('click',()=>{if(auth.currentUser)startApprovalRequest(auth.currentUser);});
$('loginApprovalDialog')?.addEventListener('cancel',()=>stopApprovalListener());
$("loginApprovalUseRecovery")?.addEventListener("click", () => {
  stopApprovalListener();
  $("loginApprovalDialog").close();
  showManualUnlockFallback();
});

$("loginApprovalCancel")?.addEventListener("click", () => {
  stopApprovalListener();
  $("loginApprovalDialog").close();
});

// Opens the vault-unlock flow: prefer a saved local passcode (quick unlock) if one is set up on
// this device, otherwise ask the phone to approve this sign-in.
async function requestVaultUnlock() {
  if (hasLocalPasscode()) {
    $("quickUnlockMessage").textContent = "";
    $("quickUnlockCode").value = "";
    $("quickUnlockDialog").showModal();
    $("quickUnlockCode").focus();
    return;
  }
  await requestVaultUnlockWithoutPasscode();
}

async function requestVaultUnlockWithoutPasscode() {
  const user = auth.currentUser;
  if (user) {
    await startApprovalRequest(user);
  } else {
    $("recoveryDialog").showModal();
  }
}

// Hidden fallback (reached via "Use recovery password instead"): the pre-approval unlock path,
// kept working in case this device has no approved phone yet, or the phone is unavailable.
async function showManualUnlockFallback() {
  const user = auth.currentUser;
  const secret = user && await fetchWebLoginSecret(user.uid);
  if (secret) {
    pendingUnlockSecret = secret;
    $("webTwoFactorMessage").textContent = "";
    $("webTwoFactorCode").value = "";
    $("webTwoFactorDialog").showModal();
    $("webTwoFactorCode").focus();
  } else {
    $("recoveryDialog").showModal();
  }
}

$("quickUnlockVerify")?.addEventListener("click", async () => {
  const passcode = $("quickUnlockCode").value;
  if (!passcode) return;
  $("quickUnlockMessage").textContent = "Açılıyor…";
  const recoveryPassword = await tryLocalPasscode(passcode);
  if (!recoveryPassword) {
    localPasscodeAttempts += 1;
    if (localPasscodeAttempts >= QUICK_UNLOCK_MAX_ATTEMPTS) {
      clearLocalPasscode();
      $("quickUnlockDialog").close();
      await requestVaultUnlockWithoutPasscode();
      return;
    }
    $("quickUnlockMessage").textContent = approvalText("Passcode yanlış. {0} deneme hakkınız kaldı.", QUICK_UNLOCK_MAX_ATTEMPTS - localPasscodeAttempts);
    return;
  }
  try {
    await unlockPortableData(recoveryPassword);
    localPasscodeAttempts = 0;
    $("quickUnlockDialog").close();
  } catch {
    $("quickUnlockMessage").textContent = "Kasa açılamadı. Normal kurtarma yöntemini deneyin.";
  }
});

$("quickUnlockForgot")?.addEventListener("click", async () => {
  clearLocalPasscode();
  $("quickUnlockDialog").close();
  await requestVaultUnlockWithoutPasscode();
});

$("setLocalPasscode")?.addEventListener("click", () => {
  if (!activeRecoveryPassword) {
    alert("Önce kasayı normal şekilde açın, sonra passcode belirleyin.");
    return;
  }
  $("newPasscodeMessage").textContent = "";
  $("newPasscode").value = "";
  $("newPasscodeConfirm").value = "";
  $("setPasscodeDialog").showModal();
});

$("savePasscode")?.addEventListener("click", async () => {
  const passcode = $("newPasscode").value;
  const confirm = $("newPasscodeConfirm").value;
  if (passcode.length < 4) {
    $("newPasscodeMessage").textContent = "En az 4 karakter kullanın.";
    return;
  }
  if (passcode !== confirm) {
    $("newPasscodeMessage").textContent = "Passcode'lar eşleşmiyor.";
    return;
  }
  if (!activeRecoveryPassword) {
    $("newPasscodeMessage").textContent = "Kasa açık değil.";
    return;
  }
  await saveLocalPasscode(passcode, activeRecoveryPassword);
  $("setPasscodeDialog").close();
});

$("removeLocalPasscode")?.addEventListener("click", () => {
  clearLocalPasscode();
});

$("webTwoFactorVerify").addEventListener("click", async () => {
  const ok = pendingUnlockSecret && await verifyTotpCode(pendingUnlockSecret, $("webTwoFactorCode").value);
  if (!ok) {
    $("webTwoFactorMessage").textContent = "Kod yanlış veya süresi doldu. Uygulamadaki güncel kodu girin.";
    return;
  }
  const secret = pendingUnlockSecret;
  $("webTwoFactorMessage").textContent = "Şifreli kasa açılıyor…";
  try {
    await unlockCloudVault(secret);
    $("webTwoFactorDialog").close();
    pendingUnlockSecret = null;
  } catch {
    // This device's code doesn't match the key this vault was originally encrypted
    // with (e.g. a recovery password set before this code existed) — fall back.
    $("webTwoFactorDialog").close();
    pendingUnlockSecret = null;
    $("recoveryMessage").textContent = "Bu kod mevcut kurtarma anahtarınızla eşleşmedi. Kurtarma parolanızı girin.";
    $("recoveryDialog").showModal();
  }
});

$("webTwoFactorSignOut").addEventListener("click", () => {
  $("webTwoFactorDialog").close();
  pendingUnlockSecret = null;
});

async function revealDashboard(user) {
  if (window.parent !== window && new URLSearchParams(location.search).get("embedded") === "login") { window.parent.location.assign("/dashboard.html"); return; }
  setLanguage(languageApi.getSavedLanguage(), false);
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  document.querySelector(".topbar").style.display = "none";
  await loadDashboard(user);
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  message("Giriş yapılıyor…", true);
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (error) {
    message(error.code === "auth/invalid-credential" ? "E-posta veya şifre yanlış." : "Giriş yapılamadı. Lütfen tekrar deneyin.");
  }
});

async function signInWithSocialProvider(providerName, provider) {
  if (window.location.protocol === "file:") {
    message("Sosyal giriş yerel dosyadan çalışmaz. Siteyi HTTPS adresinden veya Firebase Hosting üzerinden açın.");
    return;
  }

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = error?.code;
    if (code === "auth/popup-closed-by-user") return message(approvalText("{0} girişi iptal edildi.", providerName));
    if (code === "auth/account-exists-with-different-credential") {
      return message("Bu e-posta zaten başka bir giriş yöntemiyle kayıtlı. Önce o yöntemle giriş yapın.");
    }
    if (code === "auth/unauthorized-domain") {
      return message("Bu web adresi sosyal giriş için yetkilendirilmemiş. Firebase Authentication ayarlarına bu alan adını ekleyin.");
    }
    if (code === "auth/operation-not-allowed") {
      return message(approvalText("{0} girişi Firebase projesinde etkin değil veya sağlayıcı ayarları eksik.", providerName));
    }
    if (code === "auth/popup-blocked") {
      return message("Tarayıcı giriş penceresini engelledi. Açılır pencerelere izin verip tekrar deneyin.");
    }
    if (code === "auth/network-request-failed") {
      return message("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.");
    }

    console.error(`${providerName} sign-in failed`, code || "unknown");
    message(approvalText("{0} ile giriş tamamlanamadı. Tekrar deneyin veya e-posta ve şifreyle giriş yapın.", providerName));
  }
}

$("googleLogin").addEventListener("click", () => signInWithSocialProvider("Google", new GoogleAuthProvider()));

$("resetPassword").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return message("Önce e-posta adresinizi yazın.");
  try {
    await sendPasswordResetEmail(auth, email);
    message("Şifre sıfırlama bağlantısı gönderildi.", true);
  } catch {
    message("Sıfırlama bağlantısı gönderilemedi.");
  }
});

async function loadDashboard(user) {
  const preferred = localStorage.getItem("zpassPreferredName:"+user.uid) || "";
  const name = preferred || user.displayName || user.email?.split("@")[0] || "PassGram User";
  $("webPreferredName").value=preferred;
  $("welcomeName").textContent = name;
  $("sideName").textContent = name;
  $("sideEmail").textContent = user.email ? maskEmail(user.email) : "";
  if (user.photoURL) $("sideAvatar").src = user.photoURL;
  $("profileEmail").textContent = maskEmail(user.email);
  $("uid").textContent = user.uid;
  if ($("avatar")) $("avatar").textContent = name.charAt(0).toUpperCase();
  if (user.photoURL) {
    $("profileAvatar").textContent = "";
    $("profileAvatar").style.backgroundImage = `url("${user.photoURL}")`;
    $("profileAvatar").style.backgroundSize = "cover";
    $("profileAvatar").style.backgroundPosition = "center";
  } else {
    $("profileAvatar").textContent = name.charAt(0).toUpperCase();
  }
  $("profileName").textContent = name;
  $("profileEmailLarge").textContent = maskEmail(user.email);
  $("profileEmail2").textContent = user.email ? maskEmail(user.email) : "PassGram hesabı";
  $("profileUid").textContent = user.uid;
  $("settingsEmail").textContent = maskEmail(user.email);
  $("settingsUid").textContent = user.uid;
  $("aliasMailbox").textContent = user.email ? maskEmail(user.email) : "PassGram hesabı";

  try {
    const results = await Promise.allSettled([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "subscriptions", user.uid)),
      getDoc(doc(db, "vaults", user.uid)),
      getDocs(collection(db, "users", user.uid, "sessionDirectory"))
    ]);
    const profileSnap = results[0].status === "fulfilled" ? results[0].value : null;
    const subscriptionSnap = results[1].status === "fulfilled" ? results[1].value : null;
    const vaultSnap = results[2].status === "fulfilled" ? results[2].value : null;
    const devicesSnap = results[3].status === "fulfilled" ? results[3].value : null;
    const profile = profileSnap?.data() || {};
    const subscription = subscriptionSnap?.data() || {};
    currentSubscription = subscription;
    const vault = vaultSnap?.data() || {};
    const { tier, limit } = currentPlanDetails(subscription);
    const expires = subscription.expiresAt?.toDate?.();
    const isPro = tier !== 'FREE';
    $("lastSeen").textContent = profile.lastSeen?.toDate?.().toLocaleString() || "—";
    $("profileLastSeen").textContent = profile.lastSeen?.toDate?.().toLocaleString() || "—";
    $("deviceCount").textContent = devicesSnap ? String(devicesSnap.size) : "—";
    renderReadOnlyDevices(devicesSnap, user.uid);
    $("planStatus").textContent = tier;
    $("profilePlan").textContent = tier;
    if($('subscriptionCurrentPlan'))$('subscriptionCurrentPlan').textContent=`PassGram ${tier.charAt(0)+tier.slice(1).toLowerCase()}`;
    if($('subscriptionValidUntil'))$('subscriptionValidUntil').textContent=isPro&&expires?'Valid until '+expires.toLocaleDateString():'Free plan';
    if($('subscriptionAccountId'))$('subscriptionAccountId').textContent='ZP-'+user.uid.slice(0,6).toUpperCase()+user.uid.slice(-4).toUpperCase();
    $("planDescription").textContent = `${tier} plan · en fazla ${limit} giriş`;
    $("vaultStatus").textContent = vaultSnap?.exists() ? "Şifreli ve bağlı" : "Henüz yedek yok";
    $("usageLabel").textContent = vault.itemCount ? approvalText("{0} öğe", vault.itemCount) : "Güvenli";
    $("usageBar").style.width = "100%";
    $("usageLabel").textContent = `${currentPasswords.length} / ${limit} giriş`;
    const aliasLimit = $("aliasPlanLimit");
    if (aliasLimit) aliasLimit.textContent = tier !== 'FREE'
      ? "Your paid plan includes unlimited hide-my-email aliases and sharing with 10 people per vault."
      : "Free includes 10 aliases and sharing with 3 people per vault.";
    const failedSections = results.filter((result) => result.status === "rejected").length;
    $("dashboardMessage").textContent = failedSections ? approvalText("{0} bulut bölümü şu anda okunamadı; diğer bilgiler güncellendi.", failedSections) : "";
  } catch {
    $("dashboardMessage").textContent = "Bazı bulut bilgileri okunamadı. APK’yi açarak hesabı bir kez eşitleyin.";
  }
}

function renderReadOnlyDevices(snapshot, uid) {
  const root = $("profileDevicesList");
  if (!root) return;
  root.replaceChildren();
  if (!snapshot || snapshot.empty) {
    const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "No registered sessions yet."; root.append(empty); return;
  }
  for (const item of snapshot.docs) {
    const d = item.data() || {};
    const row = document.createElement("div"); row.className = "device-session-row";
    const title = document.createElement("strong"); title.textContent = d.deviceName || d.platform || "Device";
    const detail = document.createElement("span");
    const stamp = d.lastSeenAt?.toDate?.();
    detail.textContent = `${d.platform || "Unknown"}${d.appVersion ? ` · ${d.appVersion}` : ""}${d.revoked ? " · Signed out" : " · Active"}${stamp ? ` · ${stamp.toLocaleString()}` : ""}`;
    row.append(title, detail); root.append(row);
  }
}

let webSessionWatch = null;
async function registerWebSession(user) {
  const key = `zpassWebDevice:${user.uid}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  const ref = doc(db, "users", user.uid, "devices", id);
  const existing = await getDoc(ref);
  if (existing.data()?.revoked === true) { localStorage.removeItem(key); await signOut(auth); return false; }
  await setDoc(ref, {
    deviceId: id, ownerUid: user.uid, platform: "WEB", deviceName: navigator.userAgentData?.platform || navigator.platform || "Web browser",
    appVersion: "Web", lastSeenAt: serverTimestamp(), acceptVoiceCalls: true, acceptVideoCalls: true
  }, { merge: true });
  await setDoc(doc(db, "users", user.uid, "sessionDirectory", id), {
    deviceId: id, ownerUid: user.uid, platform: "WEB", deviceName: navigator.userAgentData?.platform || navigator.platform || "Web browser",
    appVersion: "Web", lastSeenAt: serverTimestamp(), revoked: false
  }, { merge: true });
  webSessionWatch?.();
  webSessionWatch = onSnapshot(ref, async snap => {
    if (snap.data()?.revoked === true) { localStorage.removeItem(key); webSessionWatch?.(); webSessionWatch = null; await signOut(auth); }
  });
  return true;
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try { if (!await registerWebSession(user)) return; } catch { /* Keep the web vault usable if session registry is temporarily unavailable. */ }
    const checkoutReturn = takeCheckout(sessionStorage,window.location.origin);
    if (checkoutReturn) { (window.parent !== window && new URLSearchParams(location.search).get("embedded") === "login" ? window.parent : window).location.replace(checkoutReturn); return; }
    const premiumReturn = new URLSearchParams(location.search).get("returnTo");
    if (premiumReturn === "/premium/" || premiumReturn === "/premium/?campaign=1") {
      (window.parent !== window && new URLSearchParams(location.search).get("embedded") === "login" ? window.parent : window).location.replace(premiumReturn);
      return;
    }
    await revealDashboard(user);
  } else {
    webSessionWatch?.(); webSessionWatch = null;
    pendingUnlockSecret = null;
    $("webTwoFactorDialog")?.close();
    if (getLanguage() !== "en") setLanguage(languageApi.getSavedLanguage(), false);
    lockVault();
    authView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    document.querySelector(".topbar").style.display = "flex";
  }
});

async function logoutToHome() {
  clearLocalPasscode();lockVault();sessionStorage.removeItem('zpassAfterLogin');sessionStorage.removeItem('zpassCheckoutCreated');
  await signOut(auth);location.replace('/');
}
$("logout").addEventListener("click", logoutToHome);
$("mobileLogout").addEventListener("click", logoutToHome);
$("profileLogout").addEventListener("click", logoutToHome);
$("profileReset").addEventListener("click", async () => {
  const email = auth.currentUser?.email;
  if (!email) return;
  try {
    await sendPasswordResetEmail(auth, email);
    $("dashboardMessage").textContent = "Şifre sıfırlama bağlantısı e-postanıza gönderildi.";
    $("dashboardMessage").style.color = "#8999B0";
  } catch {
    $("dashboardMessage").textContent = "Şifre sıfırlama bağlantısı gönderilemedi.";
  }
});

function showPanel(panelName, activeButton = null) {
  const target = document.querySelector(`[data-panel-view="${panelName}"]`);
  if (!target) return false;
  if (panelName === 'settings' && !target.classList.contains('active')) openSettingsTab('general');
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".web-panel").forEach((panel) => panel.classList.remove("active"));
  target.classList.add("active");
  const navButton = activeButton || document.querySelector(`.nav-item[data-panel="${panelName}"]`);
  navButton?.classList.add("active");
  return true;
}

document.querySelectorAll(".nav-item[data-panel]").forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.panel, button));
});
document.querySelectorAll("[data-panel-link]").forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  const panelName = link.dataset.panelLink;
  if (showPanel(panelName) && panelName === "settings") {
    openSettingsTab(link.dataset.settingsTab || "general");
  }
}));
$("sideLock").addEventListener("click", () => lockVault("Kasa manuel olarak kilitlendi."));
$("toolsToggle")?.addEventListener("click", () => {
  const toggle = $("toolsToggle");
  const expanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!expanded));
});
$("manualSync").addEventListener("click", async () => {
  if (!auth.currentUser) return;
  $("dashboardMessage").textContent = "Bulut verileri kontrol ediliyor…";
  await loadDashboard(auth.currentUser);
  $("dashboardMessage").textContent = activeRecoveryKey
    ? "Kasanız canlı olarak eşitleniyor."
    : "Hesap eşitlendi. Şifreli öğeler için kasayı açın.";
  $("dashboardMessage").style.color = "#8999B0";
});
$("generatedPasswords").addEventListener("click", () => {
  document.querySelector('.nav-item[data-panel="overview"]')?.click();
  $("dashboardMessage").textContent = "Oluşturulan şifreler kasanızdaki girişlerde güvenle saklanır.";
});
$("createItemTop").addEventListener("click", () => requestCreate("login"));
$("vaultSearch").addEventListener("input",()=>renderPasswords(currentPasswords));
$("vaultSort").addEventListener("change", () => renderPasswords(currentPasswords));

function openSettingsTab(tab = "general") {
  if (!['general','security','account','import','export','subscription','support'].includes(tab)) tab = 'general';
  document.querySelectorAll("[data-settings-view]").forEach((view) => view.classList.toggle("active", view.dataset.settingsView === tab));
  document.querySelectorAll(".settings-tabs [data-settings-tab]").forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tab));
}
let subscriptionBilling='MONTHLY';
function renderSubscriptionPricing(){
 const container=document.getElementById('remoteSubscriptionPages');
 if(container){container.replaceChildren();for(const page of runtimeConfig?.pages||[]){const link=document.createElement('a');link.className='settings-primary';link.href=page.url;link.textContent=page.title;container.append(link);}}

 document.querySelectorAll('[data-subscription-billing]').forEach(button=>button.classList.toggle('active',button.dataset.subscriptionBilling===subscriptionBilling));
 for(const plan of ['PLUS','PRO']){
  const price=document.querySelector(`[data-subscription-price="${plan}"]`);
  if(price)price.textContent=`$${paymentPlans[plan][subscriptionBilling.toLowerCase()].price} / ${subscriptionBilling==='YEARLY'?'year':'month'}`;
  const link=document.querySelector(`[data-checkout-plan="${plan}"]`);
  if(link){link.hidden=paymentPlans[plan][subscriptionBilling.toLowerCase()].enabled===false;}
  if(link)link.href='/checkout.html?'+new URLSearchParams({product:'zpass',plan,billing:subscriptionBilling});
 }
}
document.querySelectorAll('[data-subscription-billing]').forEach(button=>button.addEventListener('click',()=>{subscriptionBilling=button.dataset.subscriptionBilling;renderSubscriptionPricing();}));
renderSubscriptionPricing();
window.addEventListener("zpass-config-updated",renderSubscriptionPricing);
function openRemoteSection(){const tab=location.hash.slice(1);if(['support','subscription','security','general'].includes(tab)){showPanel('settings');openSettingsTab(tab);}}
window.addEventListener('hashchange',openRemoteSection);
openRemoteSection();
document.querySelectorAll("[data-settings-tab]").forEach((button) => button.addEventListener("click", () => openSettingsTab(button.dataset.settingsTab)));
$("settingsBack").addEventListener("click", () => showPanel("overview"));
$("autoLockMinutes").value = String(Math.round(vaultUnlockDurationMs / 60000));
$("autoLockMinutes").addEventListener("change", (event) => {
  const minutes = Number(event.target.value);
  localStorage.setItem("zpassAutoLockMinutes", String(minutes));
  vaultUnlockDurationMs = minutes * 60 * 1000;
  if (activeRecoveryKey) scheduleVaultLock();
  $("dashboardMessage").textContent = approvalText("Otomatik kasa kilidi {0} olarak ayarlandı.", minutes === 60 ? approvalText("1 saat") : approvalText("{0} dakika", minutes));
  $("dashboardMessage").style.color = "#8999B0";
});
$("lockNow").addEventListener("click", () => lockVault("Kasa manuel olarak kilitlendi."));
$("themeChoice").value = "dark";
document.documentElement.style.colorScheme = "dark";
$("settingsResetPassword").addEventListener("click", () => $("profileReset").click());
$("sendSupport").addEventListener("click", () => {
  const body = $("supportText").value.trim();
  if (!body) return;
  window.location.href = `mailto:support@zh4ckz.web.app?subject=${encodeURIComponent("PassGram destek talebi")}&body=${encodeURIComponent(body)}`;
});

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(field); field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows.shift().map((value) => value.trim().toLowerCase());
  const find = (record, names) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? (record[index] || "").trim() : "";
  };
  return rows.map((record) => ({
    platform: find(record, ["name", "title", "platform", "site"]),
    username: find(record, ["username", "email", "login_username"]),
    password: find(record, ["password", "login_password"]),
    domain: find(record, ["url", "website", "domain", "login_uri"]),
    notes: find(record, ["notes", "note", "extra"]),
    category: find(record, ["category", "folder", "grouping"]) || "İçe aktarılanlar"
  })).filter((item) => item.password || item.username);
}

const backupCrypto={
 async decrypt(cipher,password,salt1,salt2){
  if(decodeBase64(salt1).length!==32 || decodeBase64(salt2).length!==32)throw Error('Invalid backup salts.');
  const key1=await deriveArgon2idKey(password,salt1),key2=await deriveSecondLayerKey(password,salt2);
  return decryptCloudV2(cipher,key1,key2);
 },
 async encrypt(plain,password){
  const salt1=encodeBase64(crypto.getRandomValues(new Uint8Array(32))),salt2=encodeBase64(crypto.getRandomValues(new Uint8Array(32)));
  const key1=await deriveArgon2idKey(password,salt1),key2=await deriveSecondLayerKey(password,salt2);
  return {salt1,salt2,cipher:await encryptCloudV2(plain,key1,key2)};
 },
 decryptLegacy:value=>activeRecoveryKey.decrypt(value)
};
async function askBackupPassword(exporting=false){
 const fields=[{name:'password',label:exporting?'Choose backup password (at least 10 characters)':'Backup password',type:'password',required:true}];
 if(exporting)fields.push({name:'confirmation',label:'Repeat backup password',type:'password',required:true});
 const result=await inputDialog(exporting?'Create portable backup':'Open portable backup',fields,'Continue');
 if(result===null)return null;
 if(result.password.length<10 || exporting && result.password!==result.confirmation)throw Error('Use at least 10 characters; both passwords must match.');
 return result.password;
}
let backupBusy=false;
async function importBackupFile(file){
 if(backupBusy)return;
 if(!activeRecoveryKey || !auth.currentUser){$('importMessage').textContent='Unlock your vault first.';return;}
 backupBusy=true;$('startImport').disabled=true;
 const key=activeRecoveryKey,uid=auth.currentUser.uid;
 try{
  if(!file)throw Error('Select a .zhc backup or CSV file.');
  if(file.size>MAX_BACKUP_BYTES)throw Error('Backup exceeds 20 MB.');
  const content=await file.text();
  let data;
  if(content.replace(/^\uFEFF/,'').startsWith('ZPASS.ZHC')){
   const version=content.replace(/^\uFEFF/,'').split('\n')[1]?.trim();
   const password=version==='4'?await askBackupPassword():null;
   if(version==='4' && password===null)return;
   data=await readZhc(content,password,backupCrypto);
  }else if(/\.json$/i.test(file.name)){
   const legacy=JSON.parse(content);
   if(legacy.format!=='ZPASS-WEB-EXPORT-V1')throw Error('Unsupported backup JSON.');
   const payload=JSON.parse(await key.decrypt(legacy.cipher));
   if(!Array.isArray(payload.items))throw Error('Invalid backup contents.');
   data={entries:payload.items,cards:[],authenticators:[],personalInfo:null};
  }else if(/\.csv$/i.test(file.name)){data={entries:parseCsv(content),cards:[],authenticators:[],personalInfo:null};}
  else throw Error('This file is not a supported PassGram backup or CSV.');
  const knownPasswords=new Set(currentPasswords.map(p=>JSON.stringify([p.platform,p.username,p.domain])));
  const knownCards=new Set(currentCards.map(c=>String(c.number).replace(/\D/g,'')));
  const knownTokens=new Set(unlockedAuthenticators.map(t=>JSON.stringify([t.issuer,t.account,t.secret])));
  const writes=[];
  const newEntries=data.entries.filter(p=>{const id=JSON.stringify([p.platform,p.username,p.domain]);if(knownPasswords.has(id))return false;knownPasswords.add(id);return true;});
  const {tier,limit}=currentPlanDetails();
  if(currentPasswords.length+newEntries.length>limit)throw Error(`${tier} planında en fazla ${limit} giriş saklanabilir. Bu içe aktarma ${newEntries.length} yeni giriş ekleyecek; kasada ${currentPasswords.length} kayıt var. Planını yükselt veya içe aktarılacak girişleri azalt.`);
  for(const p of newEntries)writes.push([doc(collection(db,'vaults',uid,'portableItems')),await encryptedPasswordPayload(p)]);
  for(const c of data.cards){const id=c.number.replace(/\D/g,'');if(knownCards.has(id))continue;knownCards.add(id);const fields={cryptoVersion:1,updatedAt:serverTimestamp()};for(const name of ['number','cardholder','expiry','brand','bank','bankWebsite','nickname','cvv','cvv2','category'])fields[name+'Cipher']=await key.encrypt(c[name]||'');writes.push([doc(collection(db,'vaults',uid,'portableCards')),fields]);}
  for(const t of data.authenticators){const id=JSON.stringify([t.issuer,t.accountName,t.secret]);if(knownTokens.has(id))continue;knownTokens.add(id);const fields={digits:t.digits,period:t.period,cryptoVersion:1,updatedAt:serverTimestamp()};for(const [name,value] of Object.entries({issuer:t.issuer,account:t.accountName,secret:t.secret,algorithm:t.algorithm}))fields[name+'Cipher']=await key.encrypt(value);writes.push([doc(collection(db,'vaults',uid,'portableAuthenticators')),fields]);}
  let personalFields=null;
  if(data.personalInfo){personalFields={updatedAt:serverTimestamp(),cryptoVersion:1};for(const [name,value] of Object.entries(data.personalInfo))personalFields[name+'Cipher']=await key.encrypt(value);}
  if(activeRecoveryKey!==key || auth.currentUser?.uid!==uid)throw Error('The vault was locked or the account changed. Import cancelled.');
  $('importMessage').textContent='Saving encrypted records…';
  const personalRef=doc(db,'vaults',uid,'portablePersonalInfo','profile');
  let committed=0;
  try {
   for(let offset=0;offset<writes.length || offset===0;offset+=450){
    if(activeRecoveryKey!==key || auth.currentUser?.uid!==uid)throw Error('The vault was locked or the account changed.');
    const chunk=writes.slice(offset,offset+450),profile=offset===0?personalFields:null;
    await runTransaction(db,async tx=>{const personal=profile?await tx.get(personalRef):null;for(const [ref,fields] of chunk)tx.set(ref,fields);if(profile&&!personal.exists())tx.set(personalRef,profile);});
    committed+=chunk.length;
   }
  }catch(error){throw Error(`${committed} records saved before import stopped. Retry the file to import remaining records; existing matching records will be kept. ${error.message||''}`);}
  $('importMessage').textContent=`${writes.length} records imported. Existing matching records were kept.`;
 }catch(error){$('importMessage').textContent=error.message||'Backup import failed.';}
 finally{backupBusy=false;$('startImport').disabled=false;}
}
$('startImport').addEventListener('click',()=>importBackupFile($('importFile').files[0]));
const backupDropZone=document.querySelector('[data-settings-view="import"] .settings-box');
backupDropZone?.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files')){event.preventDefault();event.dataTransfer.dropEffect='copy';}});
backupDropZone?.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();if(event.dataTransfer?.files[0])importBackupFile(event.dataTransfer.files[0]);});
document.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files')){event.preventDefault();event.dataTransfer.dropEffect=auth.currentUser?'copy':'none';}});
document.addEventListener('drop',event=>{
 if(!event.dataTransfer?.files.length)return;event.preventDefault();
 if(!auth.currentUser){message('Sign in before importing a backup.');return;}
 showPanel('settings');openSettingsTab('import');importBackupFile(event.dataTransfer.files[0]);
});

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
$("startExport").addEventListener("click", async () => {
 try {
  if (!activeRecoveryKey) return $("exportMessage").textContent = "Önce kurtarma parolanızla kasayı açın.";
  if (!currentPasswords.length && !currentCards.length && !unlockedAuthenticators.length && !document.querySelector("[data-personal-field]")) return $("exportMessage").textContent = "No records to export.";
  const format = document.querySelector('input[name="exportFormat"]:checked').value;
  if (format === "csv") {
    const accepted = confirm("CSV dosyası düz metin parolalar içerir. Güvenli bir yerde saklayacağınızı onaylıyor musunuz?");
    if (!accepted) return;
    const rows = currentPasswords.map((item) => [item.platform,item.username,item.password,item.domain,item.notes,item.category].map(csvCell).join(","));
    downloadFile("zpass-passwords.csv", `name,username,password,url,notes,category\n${rows.join("\n")}`, "text/csv");
  } else {
    const password=await askBackupPassword(true);
    if(password===null)return;
    const personal=await getDoc(doc(db,'vaults',auth.currentUser.uid,'portablePersonalInfo','profile'));
    let personalInfo=null;
    if(personal.exists()){personalInfo={};for(const [name] of personalFieldDefinitions){const cipher=personal.get(name+'Cipher');personalInfo[name]=cipher?await activeRecoveryKey.decrypt(cipher):'';}}
    const content=await writeZhc({entries:currentPasswords,cards:currentCards.map(c=>({...c,cardholder:c.holder||''})),authenticators:unlockedAuthenticators.map(t=>({issuer:t.issuer,accountName:t.account,secret:t.secret,algorithm:t.algorithm||'SHA1',digits:t.digits||6,period:t.period||30})),personalInfo},password,backupCrypto);
    downloadFile('ZPass_Backup.zhc',content,'application/x-zpass-backup');
  }
  $("exportMessage").textContent = "Dışa aktarma tamamlandı.";
 }catch(error){$("exportMessage").textContent=error.message || "Backup export failed.";}
});

const decodeBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const textDecoder = new TextDecoder();

async function deriveRecoveryKey(password, saltBase64) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: decodeBase64(saltBase64), iterations: 210000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

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
  let binary = "";
  payload.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
}

// ---------- Local passcode (quick unlock) ----------
// Firebase Auth's own SDK already keeps the user signed in across reloads, but the recovery
// password is only ever kept in memory, so every reload still means retyping it (or the phone
// code) from scratch. A local passcode caches the recovery password as AES-GCM ciphertext in
// this browser's localStorage, keyed by a PBKDF2 derivation of the passcode — a short PIN
// unlocks the cache instead, exactly like Bitwarden Desktop's local unlock or Proton Pass's
// biometric quick-unlock. Forgetting the passcode just means signing in the normal way again.
const QUICK_UNLOCK_STORAGE_KEY = "zpassQuickUnlock";
const QUICK_UNLOCK_MAX_ATTEMPTS = 5;

function hasLocalPasscode() {
  return !!localStorage.getItem(QUICK_UNLOCK_STORAGE_KEY);
}

function clearLocalPasscode() {
  localStorage.removeItem(QUICK_UNLOCK_STORAGE_KEY);
  localPasscodeAttempts = 0;
}

async function saveLocalPasscode(passcode, recoveryPassword) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = encodeBase64(salt);
  const key = await deriveRecoveryKey(passcode, saltBase64);
  const cipher = await encryptCloud(recoveryPassword, key);
  localStorage.setItem(QUICK_UNLOCK_STORAGE_KEY, JSON.stringify({ salt: saltBase64, cipher }));
}

// Returns the cached recovery password, or null if the passcode was wrong / nothing is saved.
async function tryLocalPasscode(passcode) {
  const raw = localStorage.getItem(QUICK_UNLOCK_STORAGE_KEY);
  if (!raw) return null;
  try {
    const { salt, cipher } = JSON.parse(raw);
    const key = await deriveRecoveryKey(passcode, salt);
    return await decryptCloud(cipher, key);
  } catch {
    return null;
  }
}

function encodeBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

// ---------- v2 vault encryption: two independently-derived keys from the same recovery
// password (different KDF primitive + different salt per layer), matching
// PortableCloudCrypto.kt on the Android side exactly. Never device-bound, so a vault
// stays restorable on a fresh browser/phone from the recovery password alone. ----------
async function deriveArgon2idKey(password, saltBase64) {
  const hash = await hashwasm.argon2id({
    password,
    salt: decodeBase64(saltBase64),
    iterations: 3,
    parallelism: 4,
    memorySize: 65536,
    hashLength: 32,
    outputType: "binary"
  });
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function deriveSecondLayerKey(password, saltBase64) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: decodeBase64(saltBase64), iterations: 600000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptCloudV2(value, key1, key2) {
  return encryptCloud(await encryptCloud(value, key1), key2);
}

async function decryptCloudV2(value, key1, key2) {
  return decryptCloud(await decryptCloud(value, key2), key1);
}

function base32Bytes(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/=|\s/g, "");
  let bits = "";
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid Base32");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}

async function totpCode(secret, algorithm = "SHA1", digits = 6, period = 30) {
  const counter = Math.floor(Date.now() / 1000 / period);
  const message = new Uint8Array(8);
  new DataView(message.buffer).setBigUint64(0, BigInt(counter));
  const key = await crypto.subtle.importKey("raw", base32Bytes(secret), { name: "HMAC", hash: algorithm.replace("SHA", "SHA-") }, false, ["sign"]);
  const hash = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
  const offset = hash[hash.length - 1] & 15;
  const number = (((hash[offset] & 127) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3]) % (10 ** digits);
  return String(number).padStart(digits, "0");
}

let unlockedAuthenticators = [];
let activeRecoveryKey = null;
let activeRecoveryPassword = null;
let localPasscodeAttempts = 0;
let currentPasswords = [];
let currentCards = [];
let currentSubscription = {};
const ACCOUNT_LIMITS = Object.freeze({ FREE: 3, PLUS: 5, PRO: 10 });
function currentPlanDetails(subscription = currentSubscription) {
  const rawPlan = String(subscription.plan || 'FREE').toUpperCase();
  const plan = String(subscription.planId || '').startsWith('zpass_pro_') || rawPlan === 'FAMILY' || rawPlan === 'PRO' ? 'PRO' : ['FREE','EXPIRED','CANCELLED'].includes(rawPlan) ? 'FREE' : 'PLUS';
  const expires = subscription.expiresAt?.toDate?.();
  const active = plan !== 'FREE' && subscription.status === 'ACTIVE' && expires instanceof Date && expires > new Date();
  const tier = active ? plan : 'FREE';
  return { tier, limit: ACCOUNT_LIMITS[tier] };
}
function canSaveWebLogin() {
  const { tier, limit } = currentPlanDetails();
  if (currentPasswords.length < limit) return true;
  $('drawerMessage').textContent = `${tier} planında en fazla ${limit} giriş kaydı var (${currentPasswords.length}/${limit}). Planını yükselt.`;
  if ($('upgradeDialog') && !$('upgradeDialog').open) $('upgradeDialog').showModal();
  return false;
}

const personalFieldDefinitions=[['firstName','First name'],['lastName','Last name'],['email','Email'],['phone','Phone'],['company','Company'],['addressLine1','Address line 1'],['addressLine2','Address line 2'],['city','City'],['state','State / region'],['postalCode','Postal code'],['country','Country']];
let personalFormDirty=false;
const personalHost=document.querySelector('[data-settings-view="account"]');
if(personalHost){
 const card=document.createElement('article');card.className='settings-box';
 const title=document.createElement('h3');title.textContent='Personal information';card.append(title);
 const form=document.createElement('form');form.className='personal-info-form';
 for(const [key,name] of personalFieldDefinitions){const label=document.createElement('label');label.textContent=window.ZPassI18n?.get(name) || name;const input=document.createElement('input');input.maxLength=300;input.dataset.personalField=key;input.dataset.private='';input.autocomplete='off';input.addEventListener('input',()=>personalFormDirty=true);label.append(input);form.append(label);}
 const save=document.createElement('button');save.type='submit';save.className='settings-primary';save.textContent='Save';form.append(save);
 form.onsubmit=async event=>{event.preventDefault();if(!activeRecoveryKey || !auth.currentUser){showError(Error('Unlock your vault first'));return;}save.disabled=true;
  try{const fields={updatedAt:serverTimestamp(),cryptoVersion:1};for(const input of form.querySelectorAll('input'))fields[input.dataset.personalField+'Cipher']=await activeRecoveryKey.encrypt(input.value.trim());
    await runTransaction(db,async transaction=>transaction.set(doc(db,'vaults',auth.currentUser.uid,'portablePersonalInfo','profile'),fields,{merge:true}));personalFormDirty=false;
  }catch(error){showError(error);}finally{save.disabled=false;}};
 card.append(form);personalHost.prepend(card);
}

let pendingCreateKind = null;
let editingPassword = null;
let passwordUnsubscribe = null;
let extraUnsubscribers = [];
let syncGeneration = 0;
let currentFolders = [];
let pendingNewCategory = "";
let vaultLockTimer = null;

function scheduleVaultLock() {
  clearTimeout(vaultLockTimer);
  vaultLockTimer = setTimeout(() => {
    lockVault("30 dakika doldu. Güvenliğiniz için kasa ve kartlar kilitlendi.");
  }, vaultUnlockDurationMs);
}

function lockVault(statusMessage = "") {
  clearTimeout(vaultLockTimer);
  vaultLockTimer = null;
  activeRecoveryKey = null;
  activeRecoveryPassword = null;
  currentPasswords = [];
  currentCards = [];
  personalFormDirty=false;document.querySelectorAll('[data-personal-field]').forEach(input=>input.value='');
  unlockedAuthenticators = [];
  editingPassword = null;
  pendingCreateKind = null;
  passwordUnsubscribe?.();
  passwordUnsubscribe = null;
  ++syncGeneration;extraUnsubscribers.splice(0).forEach(unsubscribe=>unsubscribe());
  currentFolders=[];showLoginDetails(null);

  const passwordList = $("passwordsList");
  closeDrawer();
  if (passwordList) {
    passwordList.replaceChildren();
    passwordList.classList.add("hidden");
  }
  const cardList = $("cardsList");
  if (cardList) {
    cardList.replaceChildren();
    cardList.classList.add("hidden");
  }
  const authenticatorList = $("authList");
  if (authenticatorList) {
    authenticatorList.replaceChildren();
    authenticatorList.classList.add("hidden");
  }
  $("passwordsLocked")?.classList.remove("hidden");
  $("cardsLocked")?.classList.remove("hidden");
  $("authLocked")?.classList.remove("hidden");
  if ($("createItemTop")) $("createItemTop").disabled = true;
  if ($("sideItemCount")) $("sideItemCount").textContent = "0 öğe";
  if ($("categoryList")) $("categoryList").replaceChildren();
  if ($("toolbarUnlock")) {
    $("toolbarUnlock").textContent = "⌁ Kasayı aç";
    $("toolbarUnlock").disabled = false;
  }
  if ($("recoveryPassword")) $("recoveryPassword").value = "";
  if ($("recoveryDialog")?.open) $("recoveryDialog").close();
  closeDrawer();

  if (statusMessage && $("dashboardMessage")) {
    $("dashboardMessage").textContent = statusMessage;
    $("dashboardMessage").style.color = "#CCD6DD";
  }
}
async function refreshTotpCodes() {
  for (const item of unlockedAuthenticators) {
    const code = await totpCode(item.secret, item.algorithm, item.digits, item.period).catch(() => "------");
    item.element.textContent = code.match(/.{1,3}/g)?.join(" ") || code;
  }
}
let totpRefreshRunning = false;
setInterval(async () => {
  if (document.visibilityState !== "visible" || !unlockedAuthenticators.length || totpRefreshRunning) return;
  totpRefreshRunning = true;
  try {
    await refreshTotpCodes();
  } finally {
    totpRefreshRunning = false;
  }
}, 1000);

// Builds a { encrypt, decrypt } pair for whichever scheme this vault actually uses.
// v2 = Argon2id + an independent second PBKDF2 layer (two different keys, two different
// salts, same recovery password); v1 = the original single PBKDF2 key. Verifies the
// password against the stored check value before returning, so callers just get null
// on a wrong password instead of having to check separately.
async function resolveVaultCipher(password, metadata) {
  const encryption = metadata.get("encryption");
  if (encryption === "AES-256-GCM-recovery-v2") {
    const key1 = await deriveArgon2idKey(password, metadata.get("recoverySalt"));
    const key2 = await deriveSecondLayerKey(password, metadata.get("recoverySalt2"));
    const check = await decryptCloudV2(metadata.get("recoveryKeyCheck"), key1, key2).catch(() => null);
    if (check !== "ZPASS-PORTABLE-VAULT-V2") return null;
    return { encrypt: (value) => encryptCloudV2(value, key1, key2), decrypt: (value) => decryptCloudV2(value, key1, key2) };
  }
  if (encryption === "AES-256-GCM-recovery-v1") {
    const key = await deriveRecoveryKey(password, metadata.get("recoverySalt"));
    const check = await decryptCloud(metadata.get("recoveryKeyCheck"), key).catch(() => null);
    if (check !== "ZPASS-PORTABLE-VAULT-V1") return null;
    return { encrypt: (value) => encryptCloud(value, key), decrypt: (value) => decryptCloud(value, key) };
  }
  return undefined; // no portable vault at all yet
}

async function unlockPortableData(password) {
  const user = auth.currentUser;
  if (!user) throw new Error("Önce giriş yapın.");
  const vaultRef = doc(db, "vaults", user.uid);
  const metadata = await getDoc(vaultRef);
  if (!metadata.exists()) throw new Error("APK’den kurtarma parolalı yedek oluşturun.");
  const cipher = await resolveVaultCipher(password, metadata);
  if (cipher === undefined) throw new Error("APK’den kurtarma parolalı yedek oluşturun.");
  if (cipher === null) throw new Error("Kurtarma parolası yanlış.");
  activeRecoveryKey = cipher;
  activeRecoveryPassword = password;
  scheduleVaultLock();

  const [passwordsSnapshot, cardsSnapshot, authSnapshot] = await Promise.all([
    getDocs(collection(db, "vaults", user.uid, "portableItems")),
    getDocs(collection(db, "vaults", user.uid, "portableCards")),
    getDocs(collection(db, "vaults", user.uid, "portableAuthenticators"))
  ]);
  const passwords = await Promise.all(passwordsSnapshot.docs.map(async (entry) => {
    const data = entry.data();
    return {
      platform: await cipher.decrypt(data.platformCipher),
      username: await cipher.decrypt(data.usernameCipher),
      password: await cipher.decrypt(data.passwordCipher),
      domain: await cipher.decrypt(data.domainCipher),
      notes: await cipher.decrypt(data.notesCipher),
      category: await cipher.decrypt(data.categoryCipher),
      id: entry.id,
      updatedAt: data.updatedAt?.toMillis?.() || 0
    };
  }));
  const cards = await Promise.all(cardsSnapshot.docs.filter(entry=>entry.data().deleted!==true).map(async (entry) => {
    const data = entry.data();
    const decode = value => value ? cipher.decrypt(value) : Promise.resolve('');
    return {
      id: entry.id,
      number: await decode(data.numberCipher),
      holder: await decode(data.cardholderCipher),
      expiry: await decode(data.expiryCipher),
      brand: await decode(data.brandCipher),
      bank: await decode(data.bankCipher),
      cvv: await decode(data.cvvCipher),cvv2: await decode(data.cvv2Cipher),nickname: await decode(data.nicknameCipher),category: await decode(data.categoryCipher)
    };
  }));
  const authenticators = await Promise.all(authSnapshot.docs.map(async (entry) => {
    const data = entry.data();
    return {
      issuer: await cipher.decrypt(data.issuerCipher),
      account: await cipher.decrypt(data.accountCipher),
      secret: await cipher.decrypt(data.secretCipher),
      algorithm: await cipher.decrypt(data.algorithmCipher),
      digits: data.digits || 6,
      period: data.period || 30
    };
  }));
  renderPasswords(passwords);
  renderCards(cards);
  renderAuthenticators(authenticators);
  startPasswordRealtimeSync(user.uid, cipher);
}

function startPasswordRealtimeSync(uid, cipher) {
  passwordUnsubscribe?.();extraUnsubscribers.splice(0).forEach(stop=>stop());
  const generation=++syncGeneration;
  function watch(collectionName,decode,render) {
    let request=0;
    return onSnapshot(collection(db,"vaults",uid,collectionName),async snapshot=>{
      const version=++request;
      try {
        const items=await Promise.all(snapshot.docs.filter(entry=>entry.data().deleted!==true).map(entry=>decode(entry.id,entry.data())));
        if(generation===syncGeneration && version===request && cipher===activeRecoveryKey)render(items);
      } catch(error){if(generation===syncGeneration)showError(error);}
    },showError);
  }
  const decrypt=async(value)=>value ? cipher.decrypt(value) : '';
  passwordUnsubscribe=watch('portableItems',async(id,data)=>({id,platform:await decrypt(data.platformCipher),username:await decrypt(data.usernameCipher),password:await decrypt(data.passwordCipher),domain:await decrypt(data.domainCipher),notes:await decrypt(data.notesCipher),category:await decrypt(data.categoryCipher),previousCategory:await decrypt(data.previousCategoryCipher),archived:data.archived===true || data.isArchived===true,updatedAt:data.updatedAt?.toMillis?.() || 0}),renderPasswords);
  extraUnsubscribers.push(watch('portableCards',async(id,data)=>({id,number:await decrypt(data.numberCipher),holder:await decrypt(data.cardholderCipher),expiry:await decrypt(data.expiryCipher),brand:await decrypt(data.brandCipher),bank:await decrypt(data.bankCipher),cvv:await decrypt(data.cvvCipher),cvv2:await decrypt(data.cvv2Cipher),nickname:await decrypt(data.nicknameCipher),category:await decrypt(data.categoryCipher)}),renderCards));
  extraUnsubscribers.push(watch('portableAuthenticators',async(id,data)=>({id,issuer:await decrypt(data.issuerCipher),account:await decrypt(data.accountCipher),secret:await decrypt(data.secretCipher),algorithm:await decrypt(data.algorithmCipher),digits:data.digits || 6,period:data.period || 30}),renderAuthenticators));
  extraUnsubscribers.push(onSnapshot(doc(db,'vaults',uid,'portablePersonalInfo','profile'),async snapshot=>{
    try{const values={};for(const [key] of personalFieldDefinitions)values[key]=await decrypt(snapshot.data()?.[key+'Cipher']);
      if(generation===syncGeneration && cipher===activeRecoveryKey && !personalFormDirty)for(const input of document.querySelectorAll('[data-personal-field]'))input.value=values[input.dataset.personalField] || '';
    }catch(error){showError(error);}
  },showError));
  let folderVersion=0;
  extraUnsubscribers.push(onSnapshot(doc(db,'vaults',uid),async snapshot=>{
    const version=++folderVersion;
    try {const encoded=snapshot.get('folderDefinitionsCipher');const folders=encoded?JSON.parse(await decrypt(encoded)):[];
      if(generation!==syncGeneration || version!==folderVersion)return;
      currentFolders=folders;renderPasswords(currentPasswords);
    }catch(error){showError(error);}
  },showError));
  extraUnsubscribers.push(watch('portableTrash',async(id,data)=>{
    try{return {id,title:await decrypt(data.titleCipher),subtitle:await decrypt(data.subtitleCipher),kind:await decrypt(data.kindCipher)};}
    catch{return {id,locked:true,title:approvalText('Locked deleted record'),subtitle:approvalText('This record cannot be decrypted with the current vault password. Its encrypted copy has been preserved.')};}
  },renderTrash));
}

let brandIcons = {};
const selectionBar = document.createElement('div');
selectionBar.className = 'hold-selection-bar'; selectionBar.hidden = true;
const selectionCount = document.createElement('span');
const cancelSelection = document.createElement('button');
cancelSelection.type = 'button'; cancelSelection.textContent = 'Cancel selection';
selectionBar.append(selectionCount, cancelSelection);
$("passwordsList").before(selectionBar);
const vaultSelection = installHoldSelection($("passwordsList"), (count, active) => {
  selectionBar.hidden = !active; selectionCount.textContent = `${count} selected`;
});
cancelSelection.addEventListener('click', () => vaultSelection.clear());
fetch('resources/assets/icons/brands/index.json').then(response=>response.json()).then(index=>{brandIcons=index;if(activeRecoveryKey)renderPasswords(currentPasswords);}).catch(()=>{});
function renderPasswords(passwords) {
  if (!activeRecoveryKey) { $("passwordsList").replaceChildren(); $("passwordsList").classList.add("hidden"); $("passwordsLocked").classList.remove("hidden"); return; }
  currentPasswords = passwords;
  const mode = $("vaultSort")?.value || "newest";
  const visiblePasswords = visibleItems(passwords,scope,$("vaultSearch").value).sort((a, b) => {
    if (mode === "az") return (a.platform || a.domain || "").localeCompare(b.platform || b.domain || "");
    if (mode === "za") return (b.platform || b.domain || "").localeCompare(a.platform || a.domain || "");
    return mode === "oldest" ? (a.updatedAt || 0) - (b.updatedAt || 0) : (b.updatedAt || 0) - (a.updatedAt || 0);
  });
  const list = $("passwordsList");
  list.replaceChildren();
  for (const item of visiblePasswords) {
    const article = document.createElement("article");
    article.className = "password-item";
    article.dataset.recordId = item.id;
    article.dataset.category = item.category || "";
    const logo = document.createElement("div");
    logo.className = "password-logo";
    logo.textContent = (item.platform || "Z").charAt(0).toUpperCase();
    if(localStorage.getItem('zpassWebsiteIcons')!=='false') {
      const key=(item.platform || '').trim().toLowerCase();
      const domain=(item.domain || '').replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].split('.')[0].toLowerCase();
      const filename=brandIcons[key] || brandIcons[domain];
      if(filename){const icon=document.createElement('img');icon.src='resources/assets/icons/brands/'+encodeURIComponent(filename);icon.alt='';logo.replaceChildren(icon);}
    }
    const colorSeed = [...(item.domain || item.platform || "zpass")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    logo.style.setProperty("--logo-hue", String(colorSeed % 360));
    const meta = document.createElement("div");
    meta.className = "password-meta";meta.dataset.private="";
    const platform = document.createElement("b");
    const username = document.createElement("small");
    platform.textContent = item.platform || item.domain || "Hesap";
    username.textContent = item.username;
    meta.append(platform, username);
    const secret = document.createElement("div");
    secret.className = "password-secret";
    const secretLabel = document.createElement("small");
    secretLabel.textContent = "Şifre";
    const code = document.createElement("code");
    code.textContent = "••••••••••••";
    secret.append(secretLabel, code);
    const actions = document.createElement("div");
    actions.className = "password-actions";
    const reveal = document.createElement("button");
    reveal.type = "button";
    reveal.textContent = "Göster";
    let visible = false;
    reveal.addEventListener("click", () => {
      visible = !visible;
      code.textContent = visible ? item.password : "••••••••••••";
      reveal.textContent = visible ? "Gizle" : "Göster";
      if (visible) setTimeout(() => {
        visible = false;
        code.textContent = "••••••••••••";
        reveal.textContent = "Göster";
      }, 30000);
    });
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Kopyala";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(item.password);
      copy.textContent = "Kopyalandı";
      setTimeout(() => copy.textContent = "Kopyala", 1500);
    });
    const more = document.createElement("button");
    more.type = "button";
    more.textContent = "•••";
    const menu = document.createElement("div");
    menu.className = "item-menu hidden";
    const edit = document.createElement("button");
    edit.textContent = "Düzenle";
    edit.addEventListener("click", () => editPasswordItem(item));
    const duplicate = document.createElement("button");
    duplicate.textContent = "Çoğalt";
    duplicate.addEventListener("click", () => duplicatePasswordItem(item));
    const move = document.createElement("button");
    move.textContent = "Kategoriye taşı";
    move.addEventListener("click", () => movePasswordItem(item));
    menu.append(edit, duplicate, move);
    more.addEventListener("click", () => menu.classList.toggle("hidden"));
    actions.append(reveal, copy, more, menu);
    article.append(logo, meta, secret, actions);
    article.addEventListener("click",event=>{if(!event.target.closest("button"))showLoginDetails(item);});
    list.append(article);
  }
  vaultSelection.refresh();
  $("sideItemCount").textContent = `${visiblePasswords.length} items`;
  renderCategories(passwords);refreshDetails(visiblePasswords);
  $("passwordsLocked").classList.add("hidden");
  list.classList.remove("hidden");
  if (!visiblePasswords.length) {const empty=document.createElement("div");empty.className="empty-state";empty.textContent=window.ZPassI18n.get("No items found.");list.append(empty);}
}

function renderCategories(passwords) {
  const container=$("categoryList");container.replaceChildren();
  const names=[...new Set([...currentFolders.filter(folder=>folder.Visible!==false).map(folder=>folder.Title),...passwords.filter(item=>!archived(item)).map(item=>item.category).filter(Boolean)])].filter(name=>!archived({category:name})).sort();
  for(const category of names) {
    const row=document.createElement('div');row.className='category-row';
    const node=document.createElement('button');node.className='category-button';
    const image=document.createElement('img');const folder=currentFolders.find(folder=>folder.Title===category);
    image.src='/resources/assets/icons/ui/'+(folder?.Icon || 'o-c-personal.png').split('/').pop();image.alt='';
    const label=document.createElement('span');label.dataset.private='';label.textContent=category;
    node.append(image,label);node.addEventListener('click',()=>{showPanel('overview');setScope('folder',category);});
    const remove=document.createElement('button');remove.className='category-delete';remove.textContent='×';remove.setAttribute('aria-label',window.ZPassI18n.get('Delete'));
    remove.addEventListener('click',async()=>{
      const result=await inputDialog('Delete category',[{name:'confirm',label:category,options:[{value:'no',label:window.ZPassI18n.get('Cancel')},{value:'yes',label:window.ZPassI18n.get('Delete')}]}],'Delete');
      if(result?.confirm!=='yes')return;
      try {
        await Promise.all(currentPasswords.filter(item=>item.category===category).map(item=>setPasswordLocation(item,'',archived(item))));
        await saveFolderChanges([], [category]);
        if(scope.folder===category)setScope('all');
      } catch(error){showError(error);}
    });
    row.append(node,remove);container.append(row);
  }
}
async function saveFolderChanges(upserts,deleted=[]) {
  if(!activeRecoveryKey || !auth.currentUser)throw Error('Vault locked');
  const cipher=activeRecoveryKey, reference=doc(db,'vaults',auth.currentUser.uid);
  await runTransaction(db,async transaction=>{
    const snapshot=await transaction.get(reference),encoded=snapshot.get('folderDefinitionsCipher');
    const previous=encoded?JSON.parse(await cipher.decrypt(encoded)):[];
    const names=new Map(previous.map(folder=>[folder.Title.trim().toLowerCase(),folder]));
    deleted.forEach(name=>names.delete(name.trim().toLowerCase()));upserts.forEach(folder=>names.set(folder.Title.trim().toLowerCase(),folder));
    transaction.update(reference,{folderDefinitionsCipher:await cipher.encrypt(JSON.stringify([...names.values()])),foldersUpdatedAt:serverTimestamp()});
  });
}
$("addCategory").addEventListener('click',async()=>{
  if(!activeRecoveryKey){requestVaultUnlock();return;}
  const result=await inputDialog('Create vault',[{name:'title',label:'Title',required:true},{name:'icon',label:'Icon',options:[{value:'o-c-personal.png',label:'Personal'},{value:'famliy.png',label:'Family'},{value:'window-code-2.png',label:'Development'},{value:'shop-outline-48.png',label:'Shopping'}]}],'Create vault');
  if(!result?.title.trim())return;
  try {await saveFolderChanges([{Title:result.title.trim(),Icon:result.icon,Color:'#9BA9BC',Visible:true}]);showPanel('overview');setScope('folder',result.title.trim());}catch(error){showError(error);}
});

function renderCards(cards) {
  currentCards = cards;
  const list = $("cardsList");
  list.replaceChildren();
  for (const card of cards) {
    const article = document.createElement("article");
    article.className = "cloud-card";
    const digits = card.number.replace(/\D/g, "");
    article.innerHTML = "<header><b></b><span class=\"card-network\"></span></header><div class=\"number\"></div><footer><span></span><span></span></footer>";
    article.querySelector("header b").textContent = card.bank || "PassGram Card";
    const detectedBrand = detectCardBrand(card.number);
    const network = article.querySelector(".card-network");
    if (detectedBrand) {
      const logo = document.createElement("img");
      logo.className = "card-network-logo";
      logo.src = `/images/ui/cards/${detectedBrand.asset}.png`;
      logo.alt = detectedBrand.label;
      logo.loading = "lazy";
      network.append(logo);
      network.setAttribute("aria-label", detectedBrand.label);
    } else {
      network.textContent = "CARD";
    }
    article.querySelector(".number").textContent = `•••• •••• •••• ${digits.slice(-4)}`;
    article.querySelector("footer span:first-child").textContent = card.holder || "CARDHOLDER";
    article.querySelector("footer span:last-child").textContent = card.expiry || "MM/YY";
    article.tabIndex = 0; article.setAttribute('role','button'); article.setAttribute('aria-label','Verify identity to view card');
    article.addEventListener('click',()=>viewProtectedCard(card));
    article.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();viewProtectedCard(card);}});
    list.append(article);
  }
  $("cardsLocked").classList.add("hidden");
  list.classList.remove("hidden");
  if (!cards.length) list.textContent = "No cards yet. Cards saved on your connected devices sync automatically.";
}

function detectCardBrand(cardNumber) {
  const digits = String(cardNumber || "").replace(/\D/g, "");
  if (digits.length < 4) return null;
  const prefix2 = Number(digits.slice(0, 2));
  const prefix3 = Number(digits.slice(0, 3));
  const prefix4 = Number(digits.slice(0, 4));
  const prefix6 = Number(digits.slice(0, 6));
  if (/^3[47]/.test(digits)) return { asset: "american-express", label: "American Express" };
  if (/^4/.test(digits)) return { asset: "visa", label: "Visa" };
  if ((prefix2 >= 51 && prefix2 <= 55) || (prefix4 >= 2221 && prefix4 <= 2720)) {
    return { asset: "mastercard", label: "Mastercard" };
  }
  if (/^6011|^65|^64[4-9]/.test(digits) || (prefix6 >= 622126 && prefix6 <= 622925)) {
    return { asset: "discover", label: "Discover" };
  }
  if (/^3(?:0[0-5]|[68])/.test(digits)) return { asset: "diners-club", label: "Diners Club" };
  if (prefix2 === 35) return { asset: "jcb", label: "JCB" };
  if (prefix2 === 62) return { asset: "union-pay", label: "UnionPay" };
  if (prefix2 === 50 || (prefix2 >= 56 && prefix2 <= 69)) return { asset: "maestro", label: "Maestro" };
  if (digits.length >= 4 && prefix3 >= 300 && prefix3 <= 305) return { asset: "diners-club", label: "Diners Club" };
  return null;
}

function setCountryWithFlag(element, countryCode) {
  if (!element) return;
  const code = String(countryCode || "").trim().toUpperCase();
  element.replaceChildren();
  if (!/^[A-Z]{2}$/.test(code)) {
    element.textContent = "—";
    return;
  }

  const countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
  const assetName = (countryName || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const flag = document.createElement("img");
  flag.className = "country-flag";
  flag.src = `/images/ui/flags-svg/${code.toLowerCase()}.svg`;
  flag.alt = "";
  flag.loading = "lazy";
  flag.addEventListener("error", () => flag.remove(), { once: true });
  element.append(flag, document.createTextNode(countryName || code));
}

function renderAuthenticators(accounts) {
  const list = $("authList");
  list.replaceChildren();
  unlockedAuthenticators = [];
  for (const account of accounts) {
    const article = document.createElement("article");
    article.className = "totp-item";
    const info = document.createElement("div");
    const issuer = document.createElement("b");
    const name = document.createElement("small");
    const code = document.createElement("strong");
    issuer.textContent = account.issuer;
    name.textContent = account.account;
    info.append(issuer, name);
    article.append(info, code);
    list.append(article);
    unlockedAuthenticators.push({ ...account, element: code });
  }
  $("authLocked").classList.add("hidden");
  list.classList.remove("hidden");
  if (!accounts.length) list.textContent = "Bulut yedeğinde Authenticator hesabı bulunamadı. APK’de Back up now düğmesine basın.";
  refreshTotpCodes();
}

// Shared by both unlock paths: the app's rotating code (primary) and the manual
// recovery password (fallback for vaults that predate the code, or accounts that
// haven't turned it on). Throws if the key doesn't match this vault's keyCheck.
async function unlockCloudVault(keyMaterial) {
  await unlockPortableData(keyMaterial);
  if ($("toolbarUnlock")) {
    $("toolbarUnlock").textContent = "● Kasa açık";
    $("toolbarUnlock").disabled = true;
  }
  if ($("createItemTop")) $("createItemTop").disabled = false;
  $("dashboardMessage").textContent = "Şifreli kasa başarıyla açıldı.";
  $("dashboardMessage").style.color = "#8999B0";
  if (pendingCreateKind) {
    const kind = pendingCreateKind;
    pendingCreateKind = null;
    openDrawer(kind);
  }
}

document.querySelectorAll(".unlock-cloud").forEach((button) => button.addEventListener("click", requestVaultUnlock));
$("unlockRecovery").addEventListener("click", async () => {
  const password = $("recoveryPassword").value;
  if (password.length < 10) return $("recoveryMessage").textContent = "En az 10 karakter girin.";
  $("recoveryMessage").textContent = "Şifreli kasa açılıyor…";
  try {
    await unlockCloudVault(password);
    $("recoveryPassword").value = "";
    $("recoveryMessage").textContent = "";
    $("recoveryDialog").close();
  } catch (error) {
    const failureMessage = error.message || "Bulut kasası açılamadı.";
    $("recoveryMessage").textContent = failureMessage;
    $("dashboardMessage").textContent = failureMessage;
    $("dashboardMessage").style.color = "#CCD6DD";
  }
});

// ---------- Forgot recovery password ----------
// The recovery password IS the vault's encryption key material — nobody, including this
// server, ever held it in the clear, so there is no way to "reset" it and keep the old
// encrypted items readable. This flow instead: (1) proves the request is really the account
// owner via a Firebase Auth email link (magic link, verified by Firebase itself — no custom
// backend needed), landing on zpass.web.app/app-verify, then (2) lets them set a brand-new
// recovery password, which starts a fresh empty vault (see resetPortableVault in app-verify.js).
const FORGOT_RECOVERY_EMAIL_KEY = "zpassForgotRecoveryEmail";

$("openForgotRecovery")?.addEventListener("click", () => {
  const email = auth.currentUser?.email || "";
  $("forgotRecoveryEmail").textContent = email || "your account email";
  $("forgotRecoveryMessage").textContent = "";
  $("recoveryDialog").close();
  $("forgotRecoveryDialog").showModal();
});

$("forgotRecoveryCancel")?.addEventListener("click", () => {
  $("forgotRecoveryDialog").close();
  $("recoveryDialog").showModal();
});

$("forgotRecoverySend")?.addEventListener("click", async () => {
  const email = auth.currentUser?.email;
  if (!email) {
    $("forgotRecoveryMessage").textContent = "Sign in first, then try again.";
    return;
  }
  const button = $("forgotRecoverySend");
  button.disabled = true;
  $("forgotRecoveryMessage").textContent = "Sending verification email…";
  try {
    await sendSignInLinkToEmail(auth, email, {
      url: `${window.location.origin}/app-verify?intent=reset-recovery`,
      handleCodeInApp: true
    });
    localStorage.setItem(FORGOT_RECOVERY_EMAIL_KEY, email);
    $("forgotRecoveryMessage").style.color = "#8999B0";
    $("forgotRecoveryMessage").textContent = `Verification link sent to ${email}. Open it on this device to continue.`;
  } catch (error) {
    $("forgotRecoveryMessage").style.color = "#CCD6DD";
    $("forgotRecoveryMessage").textContent = error.message || "Could not send the verification email.";
  } finally {
    button.disabled = false;
  }
});

const drawerFields = {
  authenticator: `<div class="drawer-group"><label>Issuer<input name="issuer" required></label><label>Account<input name="account" required></label><label>Secret (Base32)<input name="secret" required pattern="[A-Za-z2-7 =]+" minlength="16" autocomplete="off"></label><label>Algorithm<select name="algorithm"><option>SHA1</option><option>SHA256</option><option>SHA512</option></select></label><label>Digits<select name="digits"><option>6</option><option>7</option><option>8</option></select></label><label>Period (seconds)<input name="period" type="number" value="30" min="1" max="300" required></label></div>`,
  login: `<div class="drawer-group"><label>E-posta veya kullanıcı adı<input name="username" required placeholder="name@example.com"></label><label>Şifre<input name="password" type="password" required placeholder="Güçlü şifre"></label><label>Web sitesi<input name="website" placeholder="https://"></label></div>`,
  card: `<div class="drawer-group"><label>Kart üzerindeki isim<input name="holder" required placeholder="Name on card"></label><label>Card number<input name="number" inputmode="numeric" maxlength="19" autocomplete="cc-number" required placeholder="1234 5678 9012 3456"><span class="card-network-preview" role="status" aria-live="polite"><span>Card network will be detected</span></span></label><label>Expiry date<input name="expiry" required placeholder="MM/YY"></label><label>Security code<input name="cvv" type="password" maxlength="4" autocomplete="cc-csc" placeholder="CVV"></label><label>Bank<input name="bank" placeholder="Bank name"></label><label>CVV2<input name="cvv2" type="password" maxlength="4" autocomplete="off"></label></div>`,
  identity: `<div class="drawer-group"><label>Ad Soyad<input name="fullName" required placeholder="Ad Soyad"></label><label>E-posta<input name="identityEmail" type="email" placeholder="name@example.com"></label><label>Telefon<input name="phone" type="tel" placeholder="+1"></label></div><div class="drawer-group"><label>Ülke / Bölge<input name="country" placeholder="Ülke"></label><label>İl / Eyalet<input name="state" placeholder="İl veya eyalet"></label><label>Şehir / İlçe<input name="city" placeholder="Şehir veya ilçe"></label><label>Sokak adresi<input name="address" placeholder="Tam adres"></label><label>Posta kodu<input name="postal" placeholder="Posta kodu"></label></div>`
};
const drawerNames = { login: "New login", card: "New card", authenticator: "Authenticator", identity: "New identity" };

function requestCreate(kind) {
  if (!activeRecoveryKey) {
    pendingCreateKind = kind;
    requestVaultUnlock();
  } else openDrawer(kind);
}
function openDrawer(kind) {
  editingPassword = null;
  $("itemDrawer").dataset.kind = kind;
  $("drawerTitle").textContent = drawerNames[kind];
  $("dynamicFields").innerHTML = drawerFields[kind];
  $("itemForm").reset();
  const titleInput=$("itemForm").elements.title;
  titleInput.required=kind!=='authenticator';titleInput.closest('label').hidden=kind==='authenticator';
  $("itemForm").elements.notes.closest('label').hidden=kind==='authenticator';
  const category=document.createElement('label');category.textContent=window.ZPassI18n.get('Category');
  const categoryInput=document.createElement('input');categoryInput.name='category';categoryInput.value=scope.view==='folder'?scope.folder:pendingNewCategory;
  category.append(categoryInput);$("dynamicFields").append(category);
  if (kind === "card") {
    const numberInput = $("itemForm").elements.number;
    const preview = $("dynamicFields").querySelector(".card-network-preview");
    numberInput.addEventListener("input", () => {
      const detected = detectCardBrand(numberInput.value);
      preview.replaceChildren();
      if (detected) {
        const logo = document.createElement("img");
        logo.src = `/images/ui/cards/${detected.asset}.png`;
        logo.alt = "";
        preview.append(logo, document.createTextNode(detected.label));
      } else {
        preview.textContent = numberInput.value.replace(/\D/g, "").length < 4
          ? "Card network will be detected"
          : "Card network not recognized";
      }
    });
  }
  $("drawerMessage").textContent = "";
  document.querySelectorAll(".type-tabs button").forEach((button) => button.classList.toggle("active", button.dataset.kind === kind));
  $("drawerBackdrop").classList.remove("hidden");
  $("itemDrawer").classList.add("open");
  $("itemDrawer").setAttribute("aria-hidden", "false");
}
function closeDrawer() {
  $("drawerBackdrop").classList.add("hidden");
  $("itemDrawer").classList.remove("open");
  $("itemDrawer").setAttribute("aria-hidden", "true");
  $("itemForm").reset();$("dynamicFields").replaceChildren();editingPassword=null;
}
document.querySelectorAll(".create-kind").forEach((button) => button.addEventListener("click", () => requestCreate(button.dataset.kind)));
document.querySelectorAll(".type-tabs button").forEach((button) => button.addEventListener("click", () => openDrawer(button.dataset.kind)));
$("closeDrawer").addEventListener("click", closeDrawer);
$("drawerBackdrop").addEventListener("click", closeDrawer);

function editPasswordItem(item) {
  openDrawer("login");
  editingPassword = item;
  $("drawerTitle").textContent = "Girişi düzenle";
  const form = $("itemForm");
  form.elements.title.value = item.platform;
  form.elements.username.value = item.username;
  form.elements.password.value = item.password;
  form.elements.website.value = item.domain;
  form.elements.notes.value = item.notes;form.elements.category.value=item.category || "";
}

async function encryptedPasswordPayload(item) {
  return {
    platformCipher: await activeRecoveryKey.encrypt(item.platform),
    usernameCipher: await activeRecoveryKey.encrypt(item.username),
    passwordCipher: await activeRecoveryKey.encrypt(item.password),
    domainCipher: await activeRecoveryKey.encrypt(item.domain),
    notesCipher: await activeRecoveryKey.encrypt(item.notes),
    categoryCipher: await activeRecoveryKey.encrypt(item.category || ""),
    archived: Boolean(item.archived), isArchived: Boolean(item.archived),
    cryptoVersion: 1,
    updatedAt: serverTimestamp()
  };
}

async function duplicatePasswordItem(item) {
  if (!activeRecoveryKey || !auth.currentUser) return;
  const copy = { ...item, id: undefined, platform: `${item.platform} Kopya` };
  await addDoc(collection(db, "vaults", auth.currentUser.uid, "portableItems"), await encryptedPasswordPayload(copy));
}

async function setPasswordLocation(item,category,isArchived) {
  if(!activeRecoveryKey || !auth.currentUser)throw Error('Vault locked');
  await updateDoc(doc(db,'vaults',auth.currentUser.uid,'portableItems',item.id),{categoryCipher:await activeRecoveryKey.encrypt(category),archived:isArchived,isArchived,updatedAt:serverTimestamp()});
}
async function movePasswordItem(item) {
  const result=await inputDialog('Move to category',[{name:'category',label:'Category',value:item.category || ''}],'Move items');
  if(result===null)return;
  const category=result.category.trim();
  try {
    await setPasswordLocation(item,category,archived({category}));
    if(category && !archived({category}))await saveFolderChanges([{Title:category,Icon:'o-c-personal.png',Color:'#9BA9BC',Visible:true}]);
  }catch(error){showError(error);}
}
async function archivePasswordItem(item) {
  const restore=archived(item);
  const previous=archived({category:item.category})?item.previousCategory || '':item.category || '';
  await updateDoc(doc(db,'vaults',auth.currentUser.uid,'portableItems',item.id),{
    categoryCipher:await activeRecoveryKey.encrypt(restore?previous:'Archive'),
    previousCategoryCipher:await activeRecoveryKey.encrypt(previous),archived:!restore,isArchived:!restore,updatedAt:serverTimestamp()
  });
}

$("saveItem").addEventListener("click", async () => {
  const form = $("itemForm");
  if (!form.reportValidity() || !activeRecoveryKey || !auth.currentUser) return;
  const values = Object.fromEntries(new FormData(form));
  const kind = $("itemDrawer").dataset.kind;
  $("drawerMessage").textContent = "Şifrelenip kaydediliyor…";
  try {
    if (kind === "login") {
      if (!editingPassword?.id && !canSaveWebLogin()) return;
      const item = { platform: values.title, username: values.username, password: values.password, domain: values.website, notes: values.notes, category: values.category?.trim() || "", archived: values.category===editingPassword?.category ? archived(editingPassword) : archived({category:values.category}) };
      if (editingPassword?.id) {
        await updateDoc(doc(db, "vaults", auth.currentUser.uid, "portableItems", editingPassword.id), await encryptedPasswordPayload(item));
      } else {
        await addDoc(collection(db, "vaults", auth.currentUser.uid, "portableItems"), await encryptedPasswordPayload(item));
      }
      pendingNewCategory = "";
    } else if (kind === "card") {
      const detectedBrand = detectCardBrand(values.number);
      const item = { number: values.number, holder: values.holder, expiry: values.expiry, brand: detectedBrand?.label || "CARD", bank: values.bank };
      const savedCard = await addDoc(collection(db, "vaults", auth.currentUser.uid, "portableCards"), {
        numberCipher: await activeRecoveryKey.encrypt(item.number), cardholderCipher: await activeRecoveryKey.encrypt(item.holder),
        expiryCipher: await activeRecoveryKey.encrypt(item.expiry), brandCipher: await activeRecoveryKey.encrypt(item.brand),
        bankCipher: await activeRecoveryKey.encrypt(item.bank), nicknameCipher: await activeRecoveryKey.encrypt(values.title),
        cvvCipher: await activeRecoveryKey.encrypt(values.cvv), cvv2Cipher: await activeRecoveryKey.encrypt(values.cvv2 || ""),
        categoryCipher: await activeRecoveryKey.encrypt(values.category?.trim() || ""), cryptoVersion: 1, updatedAt: serverTimestamp()
      });
      item.id=savedCard.id; item.cvv=values.cvv; item.cvv2=values.cvv2 || "";
      renderCards([...currentCards.filter(card=>card.id!==item.id), item]);
    } else if(kind==='authenticator') {
      await totpCode(values.secret,values.algorithm,Number(values.digits),Number(values.period));
      await addDoc(collection(db,'vaults',auth.currentUser.uid,'portableAuthenticators'),{
        issuerCipher:await activeRecoveryKey.encrypt(values.issuer),accountCipher:await activeRecoveryKey.encrypt(values.account),secretCipher:await activeRecoveryKey.encrypt(values.secret.replace(/\s/g,'').toUpperCase()),algorithmCipher:await activeRecoveryKey.encrypt(values.algorithm),digits:Number(values.digits),period:Number(values.period),cryptoVersion:1,updatedAt:serverTimestamp()
      });
    } else {
      const payload = {};
      for (const [name, value] of Object.entries(values)) payload[`${name}Cipher`] = await activeRecoveryKey.encrypt(value);
      payload.cryptoVersion = 1; payload.updatedAt = serverTimestamp();
      await addDoc(collection(db, "vaults", auth.currentUser.uid, "portableIdentities"), payload);
    }
    $("drawerMessage").textContent = "Güvenle kaydedildi.";
    setTimeout(closeDrawer, 500);
  } catch {
    $("drawerMessage").textContent = "Öğe kaydedilemedi.";
  }
});

let selectedUpgradePlan = "PLUS";
let selectedUpgradeBilling = "MONTHLY";
function closeUpgrade() { $("upgradeDialog").close(); }
function updateUpgradePlanPrices() {
  document.querySelectorAll(".upgrade-plan").forEach((item) => {
    const priceEl = item.querySelector(".upgrade-plan-price");
    if (!priceEl) return;
    if (selectedUpgradeBilling === "YEARLY") {
      priceEl.textContent = `$${item.dataset.yearly} / year`;
    } else {
      priceEl.textContent = `$${item.dataset.monthly} / month`;
    }
  });
}
function setUpgradeBilling(billing) {
  selectedUpgradeBilling = billing;
  document.querySelectorAll(".upgrade-billing-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.billing === billing));
  updateUpgradePlanPrices();
}
$("openUpgrade").addEventListener("click", () => $("upgradeDialog").showModal());
$("closeUpgrade").addEventListener("click", closeUpgrade);
$("skipUpgrade").addEventListener("click", closeUpgrade);
$("upgradeMonthly").addEventListener("click", () => setUpgradeBilling("MONTHLY"));
$("upgradeYearly").addEventListener("click", () => setUpgradeBilling("YEARLY"));
document.querySelectorAll(".upgrade-plan").forEach((button) => button.addEventListener("click", () => {
  selectedUpgradePlan = button.dataset.plan;
  document.querySelectorAll(".upgrade-plan").forEach((item) => item.classList.toggle("selected", item === button));
  $("chooseUpgrade").textContent = selectedUpgradePlan === "PRO" ? "Choose PassGram Pro" : "Choose PassGram Plus";
}));
$("chooseUpgrade").addEventListener("click", () => {
  window.location.href = `/checkout.html?product=zpass&plan=${selectedUpgradePlan}&billing=${selectedUpgradeBilling}`;
});

function renderTrash(items) {
  const list=$("trashList");if(!list)return;list.replaceChildren();
  for(const item of items){const row=document.createElement('article');row.className='totp-item';row.dataset.private='';const title=document.createElement('b');title.textContent=item.title;const subtitle=document.createElement('small');subtitle.textContent=item.subtitle;row.append(title,subtitle);list.append(row);}
  if(!items.length)list.textContent=window.ZPassI18n.get('No items found.');
}
installDesktopUi({panel:showPanel,create:requestCreate,close:closeDrawer,render:()=>renderPasswords(currentPasswords),edit:editPasswordItem,move:movePasswordItem,archive:archivePasswordItem});

const websiteIconsControl=document.getElementById('websiteIcons');
websiteIconsControl.checked=localStorage.getItem('zpassWebsiteIcons')!=='false';
websiteIconsControl.addEventListener('change',()=>{localStorage.setItem('zpassWebsiteIcons',String(websiteIconsControl.checked));renderPasswords(currentPasswords);});
document.getElementById('savePreferredName').addEventListener('click',()=>{
  const name=document.getElementById('webPreferredName').value.trim();
  if(!auth.currentUser)return;localStorage.setItem('zpassPreferredName:'+auth.currentUser.uid,name);
  document.getElementById('sideName').textContent=name || auth.currentUser.email?.split('@')[0] || 'PassGram';
});

const checkoutIntent=document.getElementById('checkoutIntent');
if(checkoutIntent && sessionStorage.getItem('zpassAfterLogin')) {
  checkoutIntent.hidden=false;
  document.getElementById('checkoutIntentText').textContent='Sign in to continue to checkout.';
}
document.getElementById('skipCheckout')?.addEventListener('click',()=>{
  sessionStorage.removeItem('zpassAfterLogin');sessionStorage.removeItem('zpassCheckoutCreated');checkoutIntent.hidden=true;
});

let cardVerificationBusy=false;
async function viewProtectedCard(card) {
  if(cardVerificationBusy || !activeRecoveryKey || !auth.currentUser)return;
  cardVerificationBusy=true;
  const key=activeRecoveryKey,uid=auth.currentUser.uid;
  const dialog=document.createElement('dialog');dialog.className='desktop-dialog';
  const heading=document.createElement('h2');heading.textContent='Approve on your phone';
  const codeElement=document.createElement('p');codeElement.style.cssText='font-size:64px;text-align:center;color:#9BA9BC';
  const message=document.createElement('p');message.textContent=approvalText('Confirm this code in PassGram on your phone.');
  const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
  dialog.append(heading,codeElement,message,cancel);document.body.append(dialog);dialog.showModal();
  let reference,unsubscribe,timer,countdown;
  try {
    const codes=distinctCodes(3);codeElement.textContent=codes[0];
    reference=await addDoc(collection(db,'loginRequests'),{uid,purpose:'CARD_VIEW',cardId:card.id,deviceLabel:`Browser · ${navigator.platform || 'Web'}`,locationLabel:'',locationKind:'unavailable',accountEmail:auth.currentUser.email || '',displayCode:codes[0],candidateCodes:codes.join(','),status:'pending',createdAt:serverTimestamp()});
    const approved=await new Promise(resolve=>{
      let settled=false;const finish=value=>{if(settled)return;settled=true;resolve(value);};
      dialog.addEventListener('close',()=>finish(false),{once:true});
      const deadline=Date.now()+60000;
      const tick=()=>{message.textContent=approvalText('Expires in {0}s',Math.max(0,Math.ceil((deadline-Date.now())/1000)));};tick();countdown=setInterval(tick,250);
      timer=setTimeout(()=>{codeElement.textContent='--';finish(false);},60000);
      unsubscribe=onSnapshot(reference,snapshot=>{const data=snapshot.data();if(data?.status==='approved')finish(true);else if(!data || data.status==='denied')finish(false);},()=>finish(false));
      if(!dialog.open)finish(false);
    });
    dialog.close();
    if(!approved || activeRecoveryKey!==key || auth.currentUser?.uid!==uid)return;
    const details=document.createElement('dialog');details.className='desktop-dialog';
    const title=document.createElement('h2');title.textContent=card.bank || 'Payment card';details.append(title);
    for(const [label,value] of [['Cardholder',card.holder],['Number',card.number],['Expiry',card.expiry],['CVV',card.cvv],['CVV2',card.cvv2]]) {
      const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.readOnly=true;input.value=value || '';input.dataset.private='';row.append(input);details.append(row);
    }
    const close=document.createElement('button');close.textContent='Close';close.onclick=()=>details.close();details.append(close);document.body.append(details);details.showModal();
    const expiry=setTimeout(()=>details.close(),60000);
    const locked=setInterval(()=>{if(activeRecoveryKey!==key || auth.currentUser?.uid!==uid)details.close();},500);
    details.addEventListener('close',()=>{clearTimeout(expiry);clearInterval(locked);details.querySelectorAll('input').forEach(input=>input.value='');details.remove();},{once:true});
  } catch { showError(Error('Could not verify card access. Check your connection and try again.')); }
  finally {clearInterval(countdown);clearTimeout(timer);unsubscribe?.();if(reference)deleteDoc(reference).catch(()=>{});dialog.remove();cardVerificationBusy=false;}
}
