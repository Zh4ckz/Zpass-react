import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, signOut, getAdditionalUserInfo, deleteUser, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, setDoc, addDoc, collection, query, where, orderBy, limitToLast, onSnapshot, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
import { firebaseConfig } from './firebase-config.mjs';
import { t, initI18n } from './web-i18n.mjs';

initI18n();

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const registerWebLoginSession = httpsCallable(functions, 'registerWebLoginSession');
const requestAppLoginOtp = httpsCallable(functions, 'requestAppLoginOtp');
const verifyAppLoginOtp = httpsCallable(functions, 'verifyAppLoginOtp');
const cancelAppLoginOtp = httpsCallable(functions, 'cancelAppLoginOtp');
const pollAppLogin = httpsCallable(functions, 'pollAppLogin');

const $ = id => document.getElementById(id);
const authView = $('auth-view'), setupView = $('setup-view'), chatApp = $('chat-app');
const viewQr = $('view-qr'), viewPhone = $('view-phone'), viewPasskey = $('view-passkey');

let me = null, profile = null;
let qrPollTimer = null, qrCountdownTimer = null, qrLoginRequest = null, qrLoginGeneration = 0;
const qrUnsubscribers = [];
let authMethod = 'email', phoneConfirmation = null, recaptchaVerifier = null;
let appLoginTimer = null, appLoginCountdown = null, appLoginGeneration = 0;
let appLoginRequest = null;
let webSessionUnsubscribe = null;

// Theme Toggle Logic
const themeBtn = $('theme-toggle');
function initTheme() {
  const saved = localStorage.getItem('zpass-theme');
  const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
  themeBtn?.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
}
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('zpass-theme', isDark ? 'dark' : 'light');
    themeBtn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
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
  const activeRequest = appLoginRequest;
  stopAppLogin();
  if (activeRequest) {
    cancelAppLoginOtp(activeRequest).catch(error => console.warn('Could not cancel previous app login request:', error));
  }
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
    $('login-identifier').placeholder = isPhone ? '555 123 4567' : 'name@example.com';
    $('login-identifier').autocomplete = isPhone ? 'tel' : 'username';
    if (isPhone) $('login-identifier').setAttribute('aria-describedby', 'phone-input-hint');
    else $('login-identifier').removeAttribute('aria-describedby');
    if (isPhone) syncCountryTrigger();
  }
  if ($('phone-input-hint')) $('phone-input-hint').hidden = !isPhone;
  if ($('email-submit')) $('email-submit').disabled = false;
  if ($('login-identifier-label')) $('login-identifier-label').textContent = isPhone ? 'Phone number' : 'Email';
  if ($('email-submit')) $('email-submit').textContent = 'Send request to the PassGram app';
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
  appLoginRequest = null;
  clearAppLoginOtp();
}
function randomHex(bytes = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2, '0')).join('');
}
function getWebSessionId() {
  const key = 'zpass-web-session-id';
  let sessionId = localStorage.getItem(key);
  if (!sessionId || !/^[a-f0-9]{32,64}$/i.test(sessionId)) {
    sessionId = randomHex(16);
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}
function getWebDeviceName() {
  return `PassGram Web · ${navigator.userAgentData?.platform || navigator.platform || 'Web'}`.slice(0, 80);
}
function watchWebSession(user) {
  webSessionUnsubscribe?.();
  webSessionUnsubscribe = null;
  if (!user) return;
  try {
    const sessionId = getWebSessionId();
    webSessionUnsubscribe = onSnapshot(doc(db, 'users', user.uid, 'devices', sessionId), snapshot => {
      if (snapshot.exists() && snapshot.data().revoked === true) {
        signOut(auth).catch(error => console.error('Could not sign out a terminated web session:', error));
      }
    }, error => console.error('Web session revocation listener failed:', error));
  } catch (error) {
    console.error('Could not watch the web session:', error);
  }
}
function getBrowserCoordinates() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const latitude = Number(coords.latitude.toFixed(3));
      const longitude = Number(coords.longitude.toFixed(3));
      resolve(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null);
    }, () => resolve(null), { enableHighAccuracy: false, maximumAge: 0, timeout: 8000 });
  });
}
async function getPreviouslyGrantedBrowserCoordinates() {
  try {
    if (!navigator.permissions?.query) return null;
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state !== 'granted' || !navigator.geolocation) return null;
    return await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const latitude = Number(coords.latitude.toFixed(3));
        const longitude = Number(coords.longitude.toFixed(3));
        resolve(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null);
      }, () => resolve(null), { enableHighAccuracy: false, maximumAge: 60000, timeout: 3000 });
    });
  } catch {
    return null;
  }
}
function appLoginOtpInputs() {
  return Array.from($('app-login-otp-inputs')?.querySelectorAll('.otp-input') || []);
}
function setAppLoginOtp(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 6);
  const inputs = appLoginOtpInputs();
  inputs.forEach((input, index) => { input.value = digits[index] || ''; });
  const verify = $('app-login-verify');
  if (verify) verify.disabled = digits.length !== 6;
  if (digits.length) inputs[Math.min(digits.length, inputs.length - 1)]?.focus();
}
function clearAppLoginOtp() {
  appLoginOtpInputs().forEach(input => { input.value = ''; });
  const verify = $('app-login-verify');
  if (verify) verify.disabled = true;
}
async function beginAppLogin(identifier) {
  stopAppLogin();
  const generation = appLoginGeneration;
  const panel = $('app-login-panel'), status = $('app-login-status');
  const countdown = $('app-login-countdown');
  const sendButton = $('email-submit');
  const resendButton = $('app-login-resend');
  if (!panel || !status) return;
  const normalized = authMethod === 'phone'
    ? normalizePhoneNumber(identifier)
    : identifier.trim().toLowerCase();
  if (authMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Enter a valid email address.');
  panel.hidden = false;
  status.textContent = 'Preparing app code…';
  clearAppLoginOtp();
  if (sendButton) sendButton.disabled = true;
  if (resendButton) resendButton.disabled = true;
  const pollSecret = randomHex();
  const coordinates = await getBrowserCoordinates();
  if (generation !== appLoginGeneration) return;
  const deviceLabel = `Web browser · ${navigator.userAgentData?.platform || navigator.platform || 'Web'}`;
  const response = await requestAppLoginOtp({
    identifier: normalized,
    pollSecret,
    deviceLabel,
    ...(coordinates || {})
  });
  if (generation !== appLoginGeneration) return;
  const { requestId, expiresAt } = response.data;
  const requestedAt = Date.now();
  appLoginRequest = { requestId, pollSecret };
  $('app-login-account').textContent = normalized;
  $('app-login-device').textContent = deviceLabel;
  $('app-login-location').textContent = coordinates
    ? `${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)}`
    : 'Location unavailable';
  status.textContent = 'Open your registered PassGram app and enter the code after biometric verification.';
  const deadline = Math.min(Number(expiresAt) || Date.now() + 60000, Date.now() + 60000);
  const tick = () => {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (countdown) countdown.textContent = String(remaining);
    const resendRemaining = Math.max(0, 30 - Math.floor((Date.now() - requestedAt) / 1000));
    const resendCountdown = $('app-login-resend-countdown');
    if (resendCountdown) resendCountdown.textContent = String(resendRemaining);
    if (resendButton) resendButton.disabled = resendRemaining > 0 || remaining === 0;
    if (!remaining) {
      stopAppLogin();
      status.textContent = 'The request expired. You can try again.';
      if (sendButton) sendButton.disabled = false;
      if (resendButton) resendButton.disabled = false;
    }
  };
  tick(); appLoginCountdown = setInterval(tick, 500);
  let pollInFlight = false;
  appLoginTimer = setInterval(async () => {
    if (generation !== appLoginGeneration || Date.now() >= deadline || pollInFlight) return;
    pollInFlight = true;
    try {
      const result = (await pollAppLogin({ requestId, pollSecret })).data;
      if (generation !== appLoginGeneration) return;
      if (result.status === 'approved' && result.customToken) {
        stopAppLogin(); status.textContent = 'Code verified. Signing in…';
        try {
          await signInWithCustomToken(auth, result.customToken);
          await registerWebLoginSession({
            deviceId: getWebSessionId(),
            deviceName: getWebDeviceName(),
            loginRequestId: requestId,
            loginMethod: 'APP_OTP'
          });
        } catch (error) {
          console.error('Could not register the web login session:', error);
          if ($('auth-status')) {
            $('auth-status').textContent = error.message || 'The session could not be registered securely.';
            $('auth-status').style.color = '#bb4a54';
          }
          await signOut(auth);
        }
      } else if (['denied', 'expired', 'cancelled', 'locked'].includes(result.status)) {
        stopAppLogin();
        status.textContent = result.status === 'denied' ? 'The sign-in request was denied in the app.'
          : result.status === 'locked' ? 'Too many incorrect codes. Request a new code.'
            : 'The request expired. You can request a new code.';
        if (sendButton) sendButton.disabled = false;
        if (resendButton) resendButton.disabled = false;
      }
    } catch (error) {
      if (generation === appLoginGeneration) {
        stopAppLogin();
        status.textContent = error.message || 'Could not check the request. Try again.';
        if (sendButton) sendButton.disabled = false;
        if (resendButton) resendButton.disabled = false;
      }
    } finally {
      pollInFlight = false;
    }
  }, 1800);
}

appLoginOtpInputs().forEach((input, index, inputs) => {
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '');
    if (digits.length > 1) {
      setAppLoginOtp(digits);
      return;
    }
    input.value = digits.slice(0, 1);
    const allFilled = inputs.every(item => item.value.length === 1);
    if ($('app-login-verify')) $('app-login-verify').disabled = !allFilled;
    if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
    if (event.key === 'ArrowLeft' && index > 0) inputs[index - 1].focus();
    if (event.key === 'ArrowRight' && index < inputs.length - 1) inputs[index + 1].focus();
  });
  input.addEventListener('paste', event => {
    const digits = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    setAppLoginOtp(digits);
  });
});

$('app-login-otp-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const active = appLoginRequest;
  const status = $('app-login-status');
  const code = appLoginOtpInputs().map(input => input.value).join('');
  if (!active || !/^\d{6}$/.test(code)) return;
  const verifyButton = $('app-login-verify');
  if (verifyButton) verifyButton.disabled = true;
  if (status) status.textContent = 'Verifying code…';
  try {
    const result = (await verifyAppLoginOtp({ ...active, verificationCode: code })).data;
    if (result.status === 'verified') {
      if (status) status.textContent = 'Code correct. Signing in securely…';
      clearAppLoginOtp();
    } else if (result.status === 'invalid') {
      if (status) status.textContent = t('Incorrect code. Attempts left: {n}.').replace('{n}', result.attemptsRemaining);
      clearAppLoginOtp();
    } else if (result.status === 'locked') {
      if (status) status.textContent = 'Too many incorrect codes. Request a new code.';
      clearAppLoginOtp();
    } else {
      if (status) status.textContent = 'The code expired. Request a new code.';
      clearAppLoginOtp();
    }
  } catch (error) {
    if (status) status.textContent = error.message || 'Could not verify the code. Try again.';
    if (verifyButton) verifyButton.disabled = false;
  }
});

$('app-login-resend')?.addEventListener('click', async () => {
  const active = appLoginRequest;
  const identifier = $('login-identifier')?.value?.trim();
  const status = $('app-login-status');
  const resendButton = $('app-login-resend');
  if (!identifier || !resendButton) return;
  resendButton.disabled = true;
  try {
    if (active) {
      stopAppLogin();
      await cancelAppLoginOtp(active);
    }
    await beginAppLogin(identifier);
  } catch (error) {
    if (status) status.textContent = error.message || 'Could not send a new code. Try again.';
    if (resendButton) resendButton.disabled = false;
    if ($('email-submit')) $('email-submit').disabled = false;
  }
});

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
  if (!option) return;
  const callingCode = option.dataset.callingCode || option.value.replace(/\D/g, '');
  if (current) current.textContent = `${option.dataset.flag ? `${option.dataset.flag} ` : ''}${option.dataset.name || option.textContent} (+${callingCode})`;
  const input = $('login-identifier');
  if (input) {
    const nationalFormat = (option.dataset.format || '').replace(/^[\d\s()+-]+/, '').trim();
    input.placeholder = option.dataset.iso === 'TR' ? '5XX XXX XX XX' : nationalFormat || 'Phone number';
  }
  const hint = $('phone-input-hint');
  if (hint) hint.textContent = t('Country code +{code} is selected. Enter only your number without repeating the code.').replace('{code}', callingCode);
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
      const [callingCode = '', iso = '', name = '', format = '', length = '', flag = ''] = row.split(';');
      const digits = callingCode.replace(/\D/g, '');
      if (!digits || !name.trim()) return null;
      const option = document.createElement('option');
      option.value = `+${digits}`;
      option.textContent = `${flag.trim() ? `${flag.trim()} ` : ''}${name.trim()} (+${callingCode.trim()})`;
      option.dataset.flag = flag.trim();
      option.dataset.name = name.trim();
      option.dataset.callingCode = digits;
      option.dataset.format = format.trim();
      option.dataset.length = length.trim();
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
function randomRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
  qrLoginGeneration++;
  clearInterval(qrPollTimer);
  clearInterval(qrCountdownTimer);
  qrPollTimer = null;
  qrCountdownTimer = null;
  qrLoginRequest = null;
  qrUnsubscribers.splice(0).forEach(stop => { try { stop(); } catch { /* listener already closed */ } });
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

async function startWebQrLogin() {
  stopQrLogin();
  const generation = qrLoginGeneration;
  const retryBtn = $('qr-login-retry');
  const loading = $('qr-loading');
  if (retryBtn) retryBtn.hidden = true;
  if (loading) loading.hidden = false;

  const canvas = $('web-login-qr');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, 240, 240);
  const countdown = $('qr-login-countdown');

  qrLoginStatus('Creating secure QR code…');

  const pollSecret = randomSecret();

  try {
    const pollHash = await sha256Hex(pollSecret);
    const requestId = randomRequestId();
    const coordinates = await getPreviouslyGrantedBrowserCoordinates();
    if (generation !== qrLoginGeneration) return;
    const requestRef = doc(db, 'webQrRequests', requestId);
    await setDoc(requestRef, {
      status: 'requested',
      pollHash,
      deviceId: getWebSessionId(),
      deviceName: getWebDeviceName().slice(0, 80),
      ...(coordinates ? { locationLabel: `${Number(coordinates.latitude).toFixed(3)}, ${Number(coordinates.longitude).toFixed(3)}` } : {}),
      createdAt: serverTimestamp()
    });
    if (generation !== qrLoginGeneration) return;

    // The local PassGram bot answers with the one-time QR payload.
    const issued = await new Promise((resolve, reject) => {
      let stop = () => {};
      const timer = setTimeout(() => reject(new Error('The sign-in service is offline right now. Try again shortly.')), 15000);
      qrUnsubscribers.push(() => { clearTimeout(timer); stop(); });
      stop = onSnapshot(requestRef, snap => {
        const data = snap.data();
        if (data?.status === 'pending' && data.qrPayload && data.expiresAt) { clearTimeout(timer); resolve(data); }
      }, error => { clearTimeout(timer); reject(error); });
    });
    if (generation !== qrLoginGeneration) return;

    const expiresAt = issued.expiresAt.toMillis();
    qrLoginRequest = { requestId, pollSecret, expiresAt };

    drawLoginQr(issued.qrPayload);
    qrLoginStatus('Scan from the PassGram app and approve the web sign-in on your phone.');

    const updateCountdown = () => {
      const remain = Math.max(0, expiresAt - Date.now());
      if (remain <= 0) {
        stopQrLogin();
        if (loading) loading.hidden = true;
        if (retryBtn) retryBtn.hidden = false;
        qrLoginStatus('The QR code needs refreshing. Generate a new one.', true);
      }
    };

    updateCountdown();
    qrCountdownTimer = setInterval(updateCountdown, 500);

    const resultRef = doc(db, 'webQrResults', pollHash);
    qrUnsubscribers.push(onSnapshot(resultRef, async snap => {
      if (!snap.exists() || qrLoginRequest?.requestId !== requestId) return;
      const state = snap.data();
      if (state.status === 'approved' && state.customToken) {
        stopQrLogin();
        qrLoginStatus('Phone approved! Signing in securely…');
        try {
          await signInWithCustomToken(auth, state.customToken);
        } catch (error) {
          console.error('Custom token sign-in failed:', error);
          if (retryBtn) retryBtn.hidden = false;
          qrLoginStatus('Could not sign in. Generate a new QR code.', true);
        }
        deleteDoc(resultRef).catch(() => {});
      } else if (state.status === 'denied') {
        stopQrLogin();
        if (loading) loading.hidden = true;
        if (retryBtn) retryBtn.hidden = false;
        deleteDoc(resultRef).catch(() => {});
        qrLoginStatus(state.reason === 'revoked'
          ? 'This browser session was ended. Generate a new QR code.'
          : 'The sign-in could not be approved. Generate a new QR code.', true);
      }
    }, error => {
      if (qrLoginRequest?.requestId !== requestId) return;
      console.error('Web QR login listener failed:', error);
      stopQrLogin();
      if (loading) loading.hidden = true;
      if (retryBtn) retryBtn.hidden = false;
      qrLoginStatus('The QR code is unavailable right now. Generate a new one.', true);
    }));
  } catch (err) {
    console.error('Web QR login creation failed:', err);
    if (loading) loading.hidden = true;
    if (retryBtn) retryBtn.hidden = false;
    qrLoginStatus(/offline/.test(err?.message || '') ? err.message : 'Could not create a QR code right now. Try again.', true);
  }
}

$('qr-login-retry')?.addEventListener('click', startWebQrLogin);

function normalizePhoneNumber(identifier) {
  const input = identifier.trim();
  if (!input || !/^[\d\s()+.-]+$/.test(input)) {
    throw new Error('Use only digits and phone formatting characters in your phone number.');
  }
  if (input.startsWith('+')) {
    throw new Error('The country code is already selected. Enter your number without the country code.');
  }

  const digits = input.replace(/\D/g, '');
  const selectedCountry = $('country-select')?.selectedOptions?.[0];
  const code = selectedCountry?.dataset.callingCode
    || selectedCountry?.value.replace(/\D/g, '')
    || '90';
  const expectedLength = Number(selectedCountry?.dataset.length) || 0;
  const nationalLength = expectedLength ? expectedLength - code.length : 0;

  if (expectedLength && digits.startsWith(code) && digits.length === expectedLength) {
    throw new Error('The country code is already selected. Enter only your phone number.');
  }

  if (nationalLength && digits.length !== nationalLength) {
    throw new Error('The phone number length does not match the selected country.');
  }

  const internationalDigits = `${code}${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(internationalDigits)) {
    throw new Error('Check your phone number and country code.');
  }
  return `+${internationalDigits}`;
}

// Email / Phone Login Form
$('email-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = $('login-identifier')?.value?.trim();
  const statusNode = $('auth-status');
  if (!identifier) return;

  if (statusNode) {
    statusNode.textContent = 'Signing in…';
    statusNode.style.color = '#3390ec';
  }

  try {
    await beginAppLogin(identifier);
  } catch (err) {
    if ($('email-submit')) $('email-submit').disabled = false;
    if (statusNode) {
      statusNode.textContent = err.message || 'Sign-in failed. Check your details.';
      statusNode.style.color = '#bb4a54';
    }
    if ($('app-login-status')) $('app-login-status').textContent = err.message || 'Could not send the app code.';
  }
});

$('app-login-cancel')?.addEventListener('click', async () => {
  const active = appLoginRequest;
  const cancelButton = $('app-login-cancel');
  const status = $('app-login-status');
  if (cancelButton) cancelButton.disabled = true;
  if (status) status.textContent = 'Cancelling sign-in request…';
  try {
    if (active) await cancelAppLoginOtp(active);
    stopAppLogin();
    clearAppLoginOtp();
    if ($('app-login-panel')) $('app-login-panel').hidden = true;
    if (status) status.textContent = '';
    if ($('email-submit')) $('email-submit').disabled = false;
  } catch (error) {
    if (status) status.textContent = error.message || 'Could not cancel the request. Try again.';
  } finally {
    if (cancelButton) cancelButton.disabled = false;
  }
});

// Passkey Login Button
$('passkey-login-btn')?.addEventListener('click', async () => {
  const statusNode = $('passkey-status');
  if (statusNode) {
    statusNode.textContent = 'Starting passkey verification…';
    statusNode.style.color = '#3390ec';
  }
  setTimeout(() => {
    if (statusNode) {
      statusNode.textContent = 'No passkey is registered on this device.';
      statusNode.style.color = '#bb4a54';
    }
  }, 1200);
});

// Auth State Monitor
onAuthStateChanged(auth, async (user) => {
  watchWebSession(user);
  if (user) {
    stopAppLogin();
    if ($('app-login-panel')) $('app-login-panel').hidden = true;
    me = user;
    if (authView) authView.hidden = true;
    if (chatApp) chatApp.hidden = false;
  } else {
    me = null;
    if (chatApp) chatApp.hidden = true;
    if (authView) authView.hidden = false;
    showSubView(viewQr);
  }
  window.dispatchEvent(new Event('passgram:ready'));
});
