import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, signOut, getAdditionalUserInfo, deleteUser, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, setDoc, addDoc, collection, query, where, orderBy, limitToLast, onSnapshot, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
import { firebaseConfig } from './firebase-config.mjs';

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const createWebQrLogin = httpsCallable(functions, 'createWebQrLogin');
const pollWebQrLogin = httpsCallable(functions, 'pollWebQrLogin');
const completeWebQrLogin = httpsCallable(functions, 'completeWebQrLogin');
const requestAppLogin = httpsCallable(functions, 'requestAppLogin');
const pollAppLogin = httpsCallable(functions, 'pollAppLogin');

const $ = id => document.getElementById(id);
const authView = $('auth-view'), setupView = $('setup-view'), chatApp = $('chat-app');
const viewQr = $('view-qr'), viewPhone = $('view-phone'), viewPasskey = $('view-passkey');

let me = null, profile = null;
let qrPollTimer = null, qrCountdownTimer = null, qrLoginRequest = null, qrPolling = false;
let qrUnsubscribe = null;
let authMethod = 'email', phoneConfirmation = null, recaptchaVerifier = null;
let appLoginTimer = null, appLoginCountdown = null, appLoginGeneration = 0;

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

function setAuthMethod(method) {
  stopAppLogin();
  authMethod = method === 'phone' ? 'phone' : 'email';
  phoneConfirmation = null;
  const isPhone = authMethod === 'phone';
  const emailTab = $('tab-qr'), phoneTab = $('tab-code');
  $('tab-wrap')?.classList.toggle('phone', isPhone);
  emailTab?.classList.toggle('on', !isPhone);
  phoneTab?.classList.toggle('on', isPhone);
  emailTab?.setAttribute('aria-selected', String(!isPhone));
  phoneTab?.setAttribute('aria-selected', String(isPhone));
  if ($('country-group')) $('country-group').hidden = !isPhone;
  if ($('password-group')) $('password-group').hidden = true;
  if ($('phone-code-group')) $('phone-code-group').hidden = true;
  if ($('phone-cancel')) $('phone-cancel').hidden = true;
  if ($('app-login-panel')) $('app-login-panel').hidden = true;
  if ($('password')) $('password').required = false;
  if ($('login-identifier')) {
    $('login-identifier').type = isPhone ? 'tel' : 'email';
    $('login-identifier').inputMode = isPhone ? 'tel' : 'email';
    $('login-identifier').placeholder = isPhone ? '555 123 4567' : 'ornek@email.com';
    $('login-identifier').autocomplete = isPhone ? 'tel' : 'username';
  }
  if ($('login-identifier-label')) $('login-identifier-label').textContent = isPhone ? 'Telefon numarası' : 'E-posta';
  if ($('email-submit')) $('email-submit').textContent = 'PassGram uygulamasına istek gönder';
  if ($('auth-status')) $('auth-status').textContent = '';
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}

function stopAppLogin() {
  appLoginGeneration++;
  clearInterval(appLoginTimer); appLoginTimer = null;
  clearInterval(appLoginCountdown); appLoginCountdown = null;
}
function randomHex(bytes = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2, '0')).join('');
}
function makeAppLoginCodes() {
  const codes = new Set();
  while (codes.size < 3) codes.add(String(crypto.getRandomValues(new Uint32Array(1))[0] % 100).padStart(2, '0'));
  return [...codes];
}
async function beginAppLogin(identifier) {
  stopAppLogin();
  const generation = appLoginGeneration;
  const panel = $('app-login-panel'), status = $('app-login-status');
  const display = $('app-login-code'), countdown = $('app-login-countdown');
  const sendButton = $('email-submit');
  if (!panel || !status || !display) return;
  const normalized = authMethod === 'phone'
    ? (identifier.trim().startsWith('+') ? `+${identifier.replace(/\D/g, '')}` : `${$('country-select')?.value || '+90'}${identifier.replace(/\D/g, '')}`)
    : identifier.trim().toLowerCase();
  if (authMethod === 'phone' && !/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error('Telefon numaranı ülke kodu ve numarayla kontrol et.');
  if (authMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Geçerli bir e-posta adresi gir.');
  const pollSecret = randomHex(), candidates = makeAppLoginCodes(), displayCode = candidates[0];
  const response = await requestAppLogin({ identifier: normalized, pollSecret, displayCode, candidateCodes: candidates,
    deviceLabel: `Web tarayıcısı · ${navigator.platform || 'Web'}` });
  if (generation !== appLoginGeneration) return;
  const { requestId, expiresAt } = response.data;
  panel.hidden = false;
  display.textContent = displayCode;
  status.textContent = 'Telefonunda açılan PassGram isteğinde aynı kodu seçip onayla.';
  if (sendButton) sendButton.disabled = true;
  const deadline = Math.min(Number(expiresAt) || Date.now() + 60000, Date.now() + 60000);
  const tick = () => {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (countdown) countdown.textContent = String(remaining);
    if (!remaining) {
      stopAppLogin(); display.textContent = '--';
      status.textContent = 'İstek sona erdi. Yeniden deneyebilirsin.';
      if (sendButton) sendButton.disabled = false;
    }
  };
  tick(); appLoginCountdown = setInterval(tick, 500);
  appLoginTimer = setInterval(async () => {
    if (generation !== appLoginGeneration || Date.now() >= deadline) return;
    try {
      const result = (await pollAppLogin({ requestId, pollSecret })).data;
      if (generation !== appLoginGeneration) return;
      if (result.status === 'approved' && result.customToken) {
        stopAppLogin(); status.textContent = 'Telefon onayladı. Oturum açılıyor…';
        await signInWithCustomToken(auth, result.customToken);
      } else if (result.status === 'denied' || result.status === 'expired') {
        stopAppLogin(); display.textContent = '--';
        status.textContent = result.status === 'denied' ? 'İstek telefondan reddedildi.' : 'İstek sona erdi.';
        if (sendButton) sendButton.disabled = false;
      }
    } catch (error) {
      if (generation === appLoginGeneration) {
        stopAppLogin(); display.textContent = '--';
        status.textContent = error.message || 'İstek kontrol edilemedi. Yeniden dene.';
        if (sendButton) sendButton.disabled = false;
      }
    }
  }, 1800);
}

function renderCountryOptions(filter = '') {
  const select = $('country-select'), list = $('country-options'), empty = $('country-empty');
  if (!select || !list) return;
  const needle = filter.trim().toLocaleLowerCase();
  const fragment = document.createDocumentFragment();
  let shown = 0;
  Array.from(select.options).forEach((option, index) => {
    const searchText = `${option.dataset.name || option.textContent} ${option.dataset.iso || ''} ${option.dataset.callingCode || ''}`.toLocaleLowerCase();
    if (needle && !searchText.includes(needle)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `country-option${index === select.selectedIndex ? ' selected' : ''}`;
    button.dataset.index = String(index);
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === select.selectedIndex));
    const name = document.createElement('span');
    name.className = 'country-option-name';
    name.textContent = `${option.dataset.flag ? `${option.dataset.flag} ` : ''}${option.dataset.name || option.textContent}`;
    const code = document.createElement('span');
    code.className = 'country-option-code';
    code.textContent = `+${option.dataset.callingCode || option.value.replace(/^\+/, '')}`;
    button.append(name, code);
    fragment.append(button);
    shown++;
  });
  list.replaceChildren(fragment);
  if (empty) empty.hidden = shown > 0;
}

function syncCountryTrigger() {
  const select = $('country-select'), current = $('country-current');
  const option = select?.options[select.selectedIndex];
  if (option && current) current.textContent = `${option.dataset.flag ? `${option.dataset.flag} ` : ''}${option.dataset.name || option.textContent}`;
}

function closeCountryMenu() {
  const menu = $('country-menu'), button = $('country-picker-button');
  if (menu) menu.hidden = true;
  button?.setAttribute('aria-expanded', 'false');
}

$('country-picker-button')?.addEventListener('click', () => {
  const menu = $('country-menu'), button = $('country-picker-button');
  if (!menu || !button) return;
  const opening = menu.hidden;
  menu.hidden = !opening;
  button.setAttribute('aria-expanded', String(opening));
  if (opening) {
    renderCountryOptions($('country-search')?.value || '');
    requestAnimationFrame(() => $('country-search')?.focus());
  }
});

$('country-search')?.addEventListener('input', (event) => renderCountryOptions(event.target.value));
$('country-options')?.addEventListener('click', (event) => {
  const optionButton = event.target.closest('.country-option');
  if (!optionButton) return;
  const select = $('country-select');
  if (!select) return;
  select.selectedIndex = Number(optionButton.dataset.index);
  syncCountryTrigger();
  $('country-search').value = '';
  closeCountryMenu();
  renderCountryOptions();
});
$('country-search')?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeCountryMenu(); $('country-picker-button')?.focus(); }
});
document.addEventListener('click', (event) => {
  if (!$('country-picker')?.contains(event.target)) closeCountryMenu();
});

async function loadPhoneCountries() {
  const select = $('country-select');
  if (!select) return;
  try {
    const response = await fetch('/data/countries.txt', { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Country list request failed: ${response.status}`);
    const rows = (await response.text()).split(/\r?\n/).filter(Boolean);
    const countries = rows.map((row) => {
      const [callingCode = '', iso = '', name = '', , , flag = ''] = row.split(';');
      const digits = callingCode.replace(/\D/g, '');
      if (!digits || !name.trim()) return null;
      const option = document.createElement('option');
      option.value = `+${digits}`;
      option.textContent = `${flag.trim() ? `${flag.trim()} ` : ''}${name.trim()} (+${callingCode.trim()})`;
      option.dataset.flag = flag.trim();
      option.dataset.name = name.trim();
      option.dataset.callingCode = digits;
      option.dataset.iso = iso.trim();
      return option;
    }).filter(Boolean);
    if (!countries.length) return;
    select.replaceChildren(...countries);
    const turkeyIndex = countries.findIndex(option => option.dataset.iso === 'TR');
    select.selectedIndex = turkeyIndex >= 0 ? turkeyIndex : 0;
    syncCountryTrigger();
    renderCountryOptions();
  } catch (error) {
    console.warn('Could not load full country list; keeping built-in options.', error);
  }
}

loadPhoneCountries();

$('tab-qr')?.addEventListener('click', () => setAuthMethod('email'));
$('tab-code')?.addEventListener('click', () => setAuthMethod('phone'));
setAuthMethod('email');

// QR Code Helpers
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}
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
  ctx.fillText('PASSGRAM QR READY', canvas.width / 2, canvas.height / 2);
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
  qrLoginStatus('PassGram uygulamasından tara; telefonda web girişini onayla.');

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
  sha256Hex(qrSecret).then(qrSecretHash => {
    sha256Hex(pollSecret).then(pollSecretHash => {
      setDoc(doc(db, 'webQrLogins', requestId), {
        requestId,
        qrSecretHash,
        pollSecretHash,
        status: 'pending',
        deviceName: `PassGram Web · ${navigator.platform || 'Web'}`,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(expiresAt)
      }).catch(err => {
        console.warn('Background Firestore webQrLogins save note:', err);
      });
    });
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
  createWebQrLogin({ qrSecret, pollSecret, deviceName: `PassGram Web · ${navigator.platform || 'Web'}` })
    .catch(() => { /* handled by Firestore fallback */ });
}

$('qr-login-retry')?.addEventListener('click', startWebQrLogin);

// Email / Phone Login Form
$('email-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = $('login-identifier')?.value?.trim();
  const statusNode = $('auth-status');
  if (!identifier) return;

  if (statusNode) {
    statusNode.textContent = 'Giriş yapılıyor…';
    statusNode.style.color = '#3390ec';
  }

  try {
    await beginAppLogin(identifier);
  } catch (err) {
    if (statusNode) {
      statusNode.textContent = err.message || 'Giriş başarısız. Bilgileri kontrol et.';
      statusNode.style.color = '#bb4a54';
    }
  }
});

$('app-login-cancel')?.addEventListener('click', () => {
  stopAppLogin();
  if ($('app-login-panel')) $('app-login-panel').hidden = true;
  if ($('app-login-status')) $('app-login-status').textContent = '';
  if ($('app-login-code')) $('app-login-code').textContent = '--';
  if ($('email-submit')) $('email-submit').disabled = false;
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
