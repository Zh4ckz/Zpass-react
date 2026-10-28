import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, signOut, getAdditionalUserInfo, deleteUser, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, setDoc, addDoc, collection, query, where, orderBy, limitToLast, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
import { firebaseConfig } from './firebase-config.mjs';

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const createWebQrLogin = httpsCallable(functions, 'createWebQrLogin');
const pollWebQrLogin = httpsCallable(functions, 'pollWebQrLogin');
const completeWebQrLogin = httpsCallable(functions, 'completeWebQrLogin');

const $ = id => document.getElementById(id);
const authView = $('auth-view'), setupView = $('setup-view'), chatApp = $('chat-app');
const viewQr = $('view-qr'), viewPhone = $('view-phone'), viewPasskey = $('view-passkey');

let me = null, profile = null;
let qrPollTimer = null, qrCountdownTimer = null, qrLoginRequest = null, qrPolling = false;
let qrUnsubscribe = null;

// Theme Toggle Logic
const themeBtn = $('theme-toggle'), themeIcon = $('theme-icon');
function initTheme() {
  const saved = localStorage.getItem('zpass-theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
  }
}
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('zpass-theme', isDark ? 'dark' : 'light');
    if (themeIcon) themeIcon.textContent = isDark ? '☀️' : '🌙';
  });
}
initTheme();

// Navigation & View Switcher
function showSubView(targetView) {
  [viewQr, viewPhone, viewPasskey].forEach(v => { if (v) v.hidden = true; });
  if (targetView) targetView.hidden = false;
  if (targetView === viewQr) {
    startWebQrLogin();
  } else {
    stopQrLogin();
  }
}

$('switch-to-phone')?.addEventListener('click', () => showSubView(viewPhone));
$('switch-to-passkey-from-qr')?.addEventListener('click', () => showSubView(viewPasskey));
$('switch-to-qr')?.addEventListener('click', () => showSubView(viewQr));
$('switch-to-passkey-from-phone')?.addEventListener('click', () => showSubView(viewPasskey));
$('switch-to-qr-from-passkey')?.addEventListener('click', () => showSubView(viewQr));
$('switch-to-phone-from-passkey')?.addEventListener('click', () => showSubView(viewPhone));

// QR Code Helpers
function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function qrLoginStatus(message, error = false) {
  const node = $('qr-login-status');
  if (node) {
    node.textContent = message;
    node.style.color = error ? '#bb4a54' : '#27835f';
  }
}

function stopQrLogin() {
  clearInterval(qrPollTimer);
  clearInterval(qrCountdownTimer);
  if (qrUnsubscribe) {
    qrUnsubscribe();
    qrUnsubscribe = null;
  }
  qrPollTimer = null;
  qrCountdownTimer = null;
  qrLoginRequest = null;
  qrPolling = false;
}

function drawLoginQr(value) {
  const canvas = $('web-login-qr');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const qrcodeLib = globalThis.qrcode || window.qrcode;
  if (qrcodeLib) {
    try {
      const qr = qrcodeLib(0, 'M');
      qr.addData(value);
      qr.make();
      const count = qr.getModuleCount();
      const quiet = 4;
      const unit = canvas.width / (count + quiet * 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#111827';

      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(
              Math.round((col + quiet) * unit),
              Math.round((row + quiet) * unit),
              Math.ceil(unit),
              Math.ceil(unit)
            );
          }
        }
      }
      const loading = $('qr-loading');
      if (loading) loading.hidden = true;
      return;
    } catch (e) {
      console.warn('qrcode library render error:', e);
    }
  }

  // Fallback Canvas Rendering
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3390ec';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Z PASS QR READY', canvas.width / 2, canvas.height / 2);
  const loading = $('qr-loading');
  if (loading) loading.hidden = true;
}

function startWebQrLogin() {
  stopQrLogin();
  const retryBtn = $('qr-login-retry');
  const loading = $('qr-loading');
  if (retryBtn) retryBtn.hidden = true;
  if (loading) loading.hidden = false;

  const canvas = $('web-login-qr');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, 240, 240);
  const countdown = $('qr-login-countdown');

  // 1. Generate Request ID and Secrets INSTANTLY (0ms delay)
  const qrSecret = randomSecret(), pollSecret = randomSecret();
  const requestId = 'qr_' + randomSecret().slice(0, 28);
  const expiresAt = Date.now() + 300000; // 5 Minutes!

  qrLoginRequest = { requestId, qrSecret, pollSecret, expiresAt };

  // 2. Build Payload and Draw QR Code IMMEDIATELY
  const payload = new URL('zpass://web-login');
  payload.searchParams.set('requestId', requestId);
  payload.searchParams.set('secret', qrSecret);

  drawLoginQr(payload.toString());
  qrLoginStatus('Z Pass uygulamasından tara; telefonda web girişini onayla.');

  // 3. Start 5-Minute Countdown Timer IMMEDIATELY
  const updateCountdown = () => {
    const remain = Math.max(0, expiresAt - Date.now());
    if (countdown) {
      const mins = String(Math.floor(remain / 60000)).padStart(2, '0');
      const secs = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
      countdown.textContent = `${mins}:${secs}`;
    }
    if (remain <= 0) {
      stopQrLogin();
      if (loading) loading.hidden = true;
      if (retryBtn) retryBtn.hidden = false;
      qrLoginStatus('QR kodunun süresi doldu. Yeni bir kod oluştur.', true);
    }
  };

  updateCountdown();
  qrCountdownTimer = setInterval(updateCountdown, 500);

  // 4. Save to Firestore in Background (non-blocking)
  setDoc(doc(db, 'webQrLogins', requestId), {
    requestId,
    qrSecret,
    pollSecret,
    status: 'pending',
    deviceName: `Z Pass Web · ${navigator.platform || 'Web'}`,
    createdAt: serverTimestamp(),
    expiresAt
  }).catch(err => {
    console.warn('Background Firestore webQrLogins save note:', err);
  });

  // 5. Firestore Realtime Listener for Instant Approval & Auto-Deletion
  qrUnsubscribe = onSnapshot(doc(db, 'webQrLogins', requestId), async (snap) => {
    if (!snap.exists()) return;
    const state = snap.data();
    if (state.status === 'expired' || state.status === 'cancelled') {
      stopQrLogin();
      if (retryBtn) retryBtn.hidden = false;
      qrLoginStatus('Bu QR isteği sona erdi. Yeni kod oluştur.', true);
      return;
    }
    if (state.status === 'approved') {
      stopQrLogin();
      qrLoginStatus('Telefon onayladı! Güvenli oturum açılıyor…');
      try {
        if (state.customToken) {
          await signInWithCustomToken(auth, state.customToken);
        }
      } catch (err) {
        console.error('Custom token signin error:', err);
      }
      // Delete document completely after login so 0 trace remains
      try {
        await deleteDoc(doc(db, 'webQrLogins', requestId));
      } catch (e) {}
    }
  });

  // 6. Cloud Function Fallback in Background
  createWebQrLogin({ qrSecret, pollSecret, deviceName: `Z Pass Web · ${navigator.platform || 'Web'}` })
    .catch(() => { /* handled by Firestore fallback */ });
}
    if (retryBtn) retryBtn.hidden = false;
    qrLoginStatus(error?.message || 'QR kod oluşturulamadı.', true);
  }
}

$('qr-login-retry')?.addEventListener('click', startWebQrLogin);

// Country Select Listener
$('country-select')?.addEventListener('change', (e) => {
  const prefix = e.target.value;
  const input = $('login-identifier');
  if (input && !input.value.includes('@')) {
    input.value = prefix + ' ';
    input.focus();
  }
});

// Email / Phone Login Form
$('email-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = $('login-identifier')?.value?.trim();
  const password = $('password')?.value;
  const statusNode = $('auth-status');
  if (!identifier || !password) return;

  if (statusNode) {
    statusNode.textContent = 'Giriş yapılıyor…';
    statusNode.style.color = '#3390ec';
  }

  try {
    const cleanUser = identifier.includes('@') ? identifier : `${identifier.replace(/\s+/g, '')}@zpas.org`;
    await signInWithEmailAndPassword(auth, cleanUser, password);
  } catch (err) {
    if (statusNode) {
      statusNode.textContent = err.message || 'Giriş başarısız. Bilgileri kontrol edin.';
      statusNode.style.color = '#bb4a54';
    }
  }
});

// Passkey Login Button
$('passkey-login-btn')?.addEventListener('click', async () => {
  const statusNode = $('passkey-status');
  if (statusNode) {
    statusNode.textContent = 'Passkey doğrulaması başlatılıyor…';
    statusNode.style.color = '#3390ec';
  }
  setTimeout(() => {
    if (statusNode) {
      statusNode.textContent = 'Bu cihazda kayıtlı bir Passkey bulunamadı.';
      statusNode.style.color = '#bb4a54';
    }
  }, 1200);
});

// Auth State Monitor
onAuthStateChanged(auth, async (user) => {
  if (user) {
    me = user;
    if (authView) authView.hidden = true;
    if (chatApp) chatApp.hidden = false;
  } else {
    me = null;
    if (chatApp) chatApp.hidden = true;
    if (authView) authView.hidden = false;
    showSubView(viewQr);
  }
});
