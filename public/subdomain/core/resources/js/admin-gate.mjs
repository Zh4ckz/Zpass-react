// Z Pass admin gate, shared by api / bots / core.zpas.org.
//  - Visitors see a raw 404 JSON response.
//  - Signed-in accounts without admin rights see a 403 JSON response.
//  - Administrators (custom claim `admin`, or the verified owner address) get the console.
// The console holds no secrets: every action goes to the zbotGateway /admin API, which checks the
// same admin rule on the server. Open <page>#signin to sign in.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBvnc-swQuAx_Fe67TUY7TGoM4VdG89cI4',
  authDomain: 'passgram-org.firebaseapp.com',
  projectId: 'passgram-org',
  storageBucket: 'passgram-org.firebasestorage.app',
  messagingSenderId: '157086803240',
  appId: '1:157086803240:web:152ae9d14c582db8c91c1d',
};
export const GATEWAY = 'https://zpass-zbot.rezanhassoun.workers.dev';
const OWNER_EMAILS = ['zh4ckz@proton.me'];
const NOT_FOUND = { ok: false, error_code: 404, description: 'Not Found' };
const FORBIDDEN = { ok: false, error_code: 403, description: 'Forbidden: you are not authorized' };
const SUB = location.pathname.match(/^\/subdomain\/([a-z]+)\//)?.[1] || location.hostname.split('.')[0];
const RES = `/subdomain/${SUB}/resources`;

// ---------- tiny DOM helpers ----------
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const path = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const icons = {
  home: path('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  bot: path('<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/>'),
  api: path('<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>'),
  docs: path('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
  web: path('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  search: path('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  plus: path('<path d="M12 5v14M5 12h14"/>'),
  trash: path('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  power: path('<path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0"/>'),
  refresh: path('<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>'),
  menu: path('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  out: path('<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4"/>'),
  sun: path('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  users: path('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
  chat: path('<path d="M4 5h16v11H8l-4 4z"/>'),
  ban: path('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
  app: path('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
  check: path('<path d="m5 12 5 5 9-10"/>'),
};

let toastWrap;
export function toast(message, kind = 'ok') {
  toastWrap ||= document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast-wrap' }));
  const item = Object.assign(document.createElement('div'), { className: `toast ${kind}`, textContent: message });
  toastWrap.append(item);
  setTimeout(() => item.remove(), 4200);
}

// Confirm dialog. With `typed`, the user must type that exact word to continue.
export function confirmDialog({ title, text, action = 'Confirm', danger = false, typed = '' }) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3><p>${esc(text)}</p>
      ${typed ? `<label class="field"><span>Type <code>${esc(typed)}</code> to continue</span><input class="input mono" autocomplete="off"></label>` : ''}
      <div class="form-actions"><button class="btn ghost" data-no>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes ${typed ? 'disabled' : ''}>${esc(action)}</button></div></div>`;
    const yes = $('[data-yes]', back), input = $('input', back);
    const done = (value) => { back.remove(); resolve(value); };
    input?.addEventListener('input', () => { yes.disabled = input.value.trim() !== typed; });
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-no]')) done(false); });
    yes.addEventListener('click', () => done(true));
    document.body.append(back);
    (input || yes).focus();
  });
}

// ---------- gate views ----------
function rawJson(body) {
  document.title = String(body.error_code);
  document.body.className = 'gate';
  document.body.innerHTML = `<pre>${esc(JSON.stringify(body))}</pre>`;
}

function loadFonts() {
  if ($('link[data-admin-fonts]')) return;
  const link = Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap',
  });
  link.dataset.adminFonts = '';
  document.head.append(link);
}

function signInView(auth, notice = '') {
  loadFonts();
  document.title = 'Sign in';
  document.body.className = 'ad';
  document.body.innerHTML = `<main class="signin"><form class="signin-card" autocomplete="on">
    <img src="${RES}/assets/app-logo/zpass.png" alt="" width="48" height="48" style="border-radius:14px">
    <div><h1>Administrator sign in</h1><p>Only Z Pass administrators can open this console.</p></div>
    <label class="field"><span>Email</span><input class="input" type="email" name="email" autocomplete="username" required></label>
    <label class="field"><span>Password</span><input class="input" type="password" name="password" autocomplete="current-password" required></label>
    <div class="err" role="alert">${esc(notice)}</div>
    <button class="btn primary" type="submit">Sign in</button>
    <div class="or">or</div>
    <button class="btn" type="button" data-google>Continue with Google</button>
  </form></main>`;
  const form = $('form'), err = $('.err');
  const run = async (fn) => {
    $$('button', form).forEach((b) => { b.disabled = true; });
    err.textContent = '';
    try { await fn(); } catch (e) { err.textContent = friendly(e); $$('button', form).forEach((b) => { b.disabled = false; }); }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); run(() => signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value)); });
  $('[data-google]').addEventListener('click', () => run(() => signInWithPopup(auth, new GoogleAuthProvider())));
}

function friendly(error) {
  const code = String(error?.code || '');
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return 'Email or password is not correct.';
  if (/too-many-requests/.test(code)) return 'Too many attempts. Try again later.';
  if (/unauthorized-domain/.test(code)) return 'This domain is not enabled for sign-in in Firebase.';
  if (/popup/.test(code)) return 'The sign-in window was closed.';
  return error?.message || 'Sign in failed.';
}

const isAdminToken = (claims) => claims.admin === true
  || (claims.email_verified === true && OWNER_EMAILS.includes(String(claims.email || '').toLowerCase()));

// ---------- console shell ----------
const SITES = [
  { key: 'core', label: 'Overview', icon: 'home', url: 'https://core.zpas.org/' },
  { key: 'bots', label: 'Bots', icon: 'bot', url: 'https://bots.zpas.org/' },
  { key: 'api', label: 'API & config', icon: 'api', url: 'https://api.zpas.org/' },
];
const LINKS = [
  { label: 'Bot API docs', icon: 'docs', url: 'https://docs.zpas.org/' },
  { label: 'PassGram Web', icon: 'web', url: 'https://web.zpas.org/' },
];

function shell(session) {
  loadFonts();
  const light = (() => { try { return localStorage.getItem('zp-admin-theme') === 'light'; } catch { return false; } })();
  document.body.className = `ad${light ? ' light' : ''}`;
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const href = (site) => (local ? `/subdomain/${site.key}/index.html${location.search}` : site.url);
  const name = session.email || session.uid;
  document.body.innerHTML = `<div class="shell">
    <aside class="side" id="side">
      <a class="brand" href="${href(SITES[0])}"><img src="${RES}/assets/app-logo/zpass.png" alt=""><span><b>Z Pass</b><small>Admin console</small></span></a>
      <div class="group">Manage</div>
      ${SITES.map((s) => `<a class="nav-link${s.key === SUB ? ' on' : ''}" href="${href(s)}">${icons[s.icon]}${esc(s.label)}</a>`).join('')}
      <div class="group">Public</div>
      ${LINKS.map((l) => `<a class="nav-link" href="${l.url}" target="_blank" rel="noopener">${icons[l.icon]}${esc(l.label)}<span class="ext">↗</span></a>`).join('')}
      <div class="spacer"></div>
      <button class="nav-link" type="button" data-theme>${icons.sun}Light / dark</button>
      <div class="me"><span class="av">${esc(name.slice(0, 1).toUpperCase())}</span><div><b title="${esc(name)}">${esc(name)}</b><small>Administrator</small></div>
        <button class="btn ghost icon sm" type="button" data-signout title="Sign out" aria-label="Sign out">${icons.out}</button></div>
    </aside>
    <main class="main" id="main"></main>
  </div>`;
  $('[data-theme]').addEventListener('click', () => {
    const on = document.body.classList.toggle('light');
    try { localStorage.setItem('zp-admin-theme', on ? 'light' : 'dark'); } catch {}
  });
  $('[data-signout]').addEventListener('click', session.signOut);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-burger]')) { document.body.classList.toggle('menu-open'); return; }
    if (document.body.classList.contains('menu-open') && !e.target.closest('#side')) document.body.classList.remove('menu-open');
  });
  return $('#main');
}

// Page title row used by every panel.
export function topBar(title, subtitle, actions = '') {
  return `<div class="top"><button class="btn icon burger" type="button" data-burger aria-label="Menu">${icons.menu}</button>
    <div class="grow"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${actions}</div>`;
}

// ---------- API client ----------
function client(getToken) {
  return async function api(method, body = {}) {
    const res = await fetch(`${GATEWAY}/admin/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok || !data?.ok) throw new Error(data?.description || `Request failed (${res.status})`);
    return data.result;
  };
}

// ---------- entry ----------
export function startAdmin(render) {
  rawJson(NOT_FOUND);
  // Local design preview only: a test harness may provide a fake session on localhost.
  const preview = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && window.__zpAdminPreview;
  if (preview) {
    const session = { uid: 'preview', email: preview.email, api: preview.api, signOut: () => rawJson(NOT_FOUND) };
    render(shell(session), session);
    return;
  }
  const auth = getAuth(initializeApp(firebaseConfig));
  let rendered = false;
  const wantsSignIn = () => location.hash === '#signin';
  window.addEventListener('hashchange', () => { if (wantsSignIn() && !auth.currentUser) signInView(auth); });
  onAuthStateChanged(auth, async (user) => {
    if (!user) { rendered = false; if (wantsSignIn()) signInView(auth); else rawJson(NOT_FOUND); return; }
    let claims = {};
    try { claims = (await user.getIdTokenResult(true)).claims; } catch {}
    if (!isAdminToken(claims)) {
      if (wantsSignIn()) { await signOut(auth); signInView(auth, 'This account is not authorized.'); } else rawJson(FORBIDDEN);
      return;
    }
    if (rendered) return;
    rendered = true;
    if (wantsSignIn()) history.replaceState(null, '', location.pathname + location.search);
    const session = {
      uid: user.uid, email: user.email || '',
      api: client(() => user.getIdToken()),
      signOut: async () => { await signOut(auth); rawJson(NOT_FOUND); },
    };
    render(shell(session), session);
  });
}
