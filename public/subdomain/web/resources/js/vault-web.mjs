// Vault (passwords + cards) and Authenticator on PassGram Web, unlocked for 15 minutes by approving on the phone.
//
// Flow (same protocol the Android app already implements in LoginApproval.kt / LoginApprovalDialog.kt):
//  1. This browser creates a one-time ECDH P-256 key and a loginRequests doc {purpose:'LOGIN', protocolVersion:2, requestPublicKey}.
//  2. The user taps the matching 2-digit code in PassGram on the phone. The phone wraps the vault password for THIS key only
//     and writes approvedSecretEnc + responsePublicKey.
//  3. We unwrap it, open vaults/{uid} (Argon2id + PBKDF2, see vault-crypto.mjs), decrypt portableItems / portableCards /
//     portableAuthenticators in memory, and delete the request doc.
//  4. After 15 minutes without activity, or on "Lock now", everything decrypted is dropped.
// Nothing decrypted is ever written to storage. This module owns the #ap-v-vault and #ap-v-auth views.
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, deleteDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.mjs';
import { createApprovalKeys, unwrapApprovalSecret, openVault, totp, forgetTotpKeys } from './vault-crypto.mjs?v=1';

const ARGON2_SRC = '/resources/js/argon2.umd.min.js'; // hash-wasm (MIT), already shipped with the site
const UNLOCK_MS = 15 * 60 * 1000;
const REQUEST_MS = 60 * 1000;

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const vaultView = document.getElementById('ap-v-vault');
const authView = document.getElementById('ap-v-auth');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ICON = {
  lock: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  unlock: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4.5"/><path d="M11.5 11.5L20 3M15.5 7.5l2.5 2.5"/></svg>',
};

let state = { phase: 'locked', error: '' }; // locked | waiting | opening | unlocked
let data = null;      // { items, cards, auths }
let until = 0;        // unlocked until (ms)
let request = null;   // { ref, unsub, timer, privateKey, publicB64 }
let tab = 'passwords';
let query = '';
let open = new Set();     // expanded rows
let revealed = new Set(); // revealed secrets
let codes = new Map();    // auth index -> {code, remaining, period}

// ---------- styles (shipped with the module so a stale cached stylesheet can never break this view) ----------
const style = document.createElement('style');
style.textContent = `
#ap-v-vault>:not(.zv-root),#ap-v-auth>:not(.zv-root){display:none!important}
.zv-root{display:grid;gap:14px}
.zv-card{border-radius:var(--r-lg,22px);background:var(--card);border:1px solid var(--glass-line);box-shadow:var(--shadow-sm);padding:18px}
.zv-center{text-align:center;padding:40px 24px;display:grid;justify-items:center;gap:10px}
.zv-center h2{margin:6px 0 0;font-size:20px;color:var(--ink)}
.zv-center p{margin:0;max-width:440px;color:var(--muted);line-height:1.55}
.zv-ic{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(135deg,#339af0,#1c6dd9);color:#fff;box-shadow:0 12px 28px rgba(28,109,217,.3)}
.zv-ic svg,.zv-btn svg,.zv-bar svg,.zv-search svg,.zv-icon-btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.zv-btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:14px;padding:12px 20px;font:600 14px/1 Inter,system-ui,sans-serif;cursor:pointer;background:linear-gradient(135deg,#339af0,#1c6dd9);color:#fff}
.zv-btn.ghost{background:var(--soft);color:var(--ink)}
.zv-btn:disabled{opacity:.6;cursor:default}
.zv-err{color:#d64545;font-size:13px;min-height:18px}
.zv-code{font:800 54px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;color:var(--ink);padding:10px 26px;border-radius:20px;background:var(--soft)}
.zv-muted{color:var(--muted);font-size:13px}
.zv-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:16px;background:rgba(18,184,134,.12);color:#0c8a63;font-weight:700;font-size:14px}
.zv-bar .zv-spacer{flex:1}
.zv-bar button{border:0;background:none;color:#1c6dd9;font:700 14px Inter,system-ui,sans-serif;cursor:pointer}
.zv-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.zv-tabs{display:inline-flex;padding:4px;border-radius:14px;background:var(--soft);gap:4px}
.zv-tabs button{border:0;background:none;padding:8px 14px;border-radius:10px;font:600 13.5px Inter,system-ui,sans-serif;color:var(--muted);cursor:pointer}
.zv-tabs button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 4px rgba(15,23,42,.08)}
.zv-search{flex:1;min-width:200px;display:flex;align-items:center;gap:8px;height:42px;padding:0 14px;border-radius:999px;background:var(--soft);color:var(--muted)}
.zv-search input{flex:1;border:0;outline:0;background:none;font:14px Inter,system-ui,sans-serif;color:var(--ink)}
.zv-list{display:grid;gap:8px}
.zv-row{border-radius:16px;background:var(--card);border:1px solid var(--glass-line)}
.zv-row-head{display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer;width:100%;border:0;background:none;text-align:left;color:inherit;font:inherit}
.zv-av{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff;font-weight:800;flex:none}
.zv-main{flex:1;min-width:0;display:grid;gap:2px}
.zv-main b{font-size:14.5px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zv-main small{font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zv-icon-btn{width:36px;height:36px;border-radius:10px;border:0;display:grid;place-items:center;background:var(--soft);color:var(--ink);cursor:pointer;flex:none}
.zv-icon-btn:hover{background:var(--soft-acc,#e3eefc)}
.zv-detail{padding:0 14px 14px 66px;display:grid;gap:8px}
.zv-field{display:flex;align-items:center;gap:10px;font-size:13.5px}
.zv-field span{width:92px;color:var(--muted);flex:none}
.zv-field code{flex:1;min-width:0;font:600 14px ui-monospace,Consolas,monospace;color:var(--ink);overflow-wrap:anywhere}
.zv-notes{white-space:pre-wrap;color:var(--ink);font-size:13.5px}
.zv-empty{padding:30px;text-align:center;color:var(--muted)}
.zv-otp{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;background:var(--card);border:1px solid var(--glass-line);cursor:pointer;width:100%;text-align:left;font:inherit;color:inherit}
.zv-otp:hover{border-color:#339af0}
.zv-otp-code{font:800 26px/1 ui-monospace,Consolas,monospace;letter-spacing:.08em;color:#1c6dd9}
.zv-ring{width:34px;height:34px;flex:none}
.zv-ring circle{fill:none;stroke-width:3.5}
.zv-ring .bg{stroke:var(--soft)}
.zv-ring .fg{stroke:#339af0;stroke-linecap:round;transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset 1s linear}
.zv-ring.low .fg{stroke:#e8590c}
.zv-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 16px;border-radius:12px;font:600 13.5px Inter,system-ui,sans-serif;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,.25)}
`;
document.head.appendChild(style);

const roots = {};
for (const [name, view] of [['vault', vaultView], ['auth', authView]]) {
  if (!view) continue;
  const root = document.createElement('div');
  root.className = 'zv-root';
  view.prepend(root);
  roots[name] = root;
}

// ---------- helpers ----------
function toast(text) {
  const t = document.createElement('div'); t.className = 'zv-toast'; t.textContent = text; document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); toast(`${label} copied`); } catch { toast('Copy failed'); }
}
const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const avatar = (name) => `<span class="zv-av" style="background:linear-gradient(135deg,hsl(${hue(name)} 70% 55%),hsl(${(hue(name) + 40) % 360} 70% 45%))">${esc((String(name).trim()[0] || '?').toUpperCase())}</span>`;
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const masked = '••••••••••';
const cardTail = (n) => String(n || '').replace(/\D/g, '').slice(-4);
const spaced = (code) => code.length === 6 ? code.slice(0, 3) + ' ' + code.slice(3) : code.length === 8 ? code.slice(0, 4) + ' ' + code.slice(4) : code;
let loadArgon = null;
function argon2id() {
  if (window.hashwasm?.argon2id) return Promise.resolve(window.hashwasm.argon2id);
  loadArgon ||= new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = ARGON2_SRC; s.async = true;
    s.onload = () => (window.hashwasm?.argon2id ? resolve(window.hashwasm.argon2id) : reject(Error('Argon2 unavailable')));
    s.onerror = () => { loadArgon = null; reject(Error('Argon2 unavailable')); };
    document.head.appendChild(s);
  });
  return loadArgon;
}
function distinctCodes() {
  const out = []; const r = new Uint32Array(16); crypto.getRandomValues(r);
  for (const n of r) { const c = String(10 + (n % 90)); if (!out.includes(c)) out.push(c); if (out.length === 3) break; }
  return out;
}

// ---------- unlock flow ----------
function stopRequest(remove) {
  if (!request) return;
  clearTimeout(request.timer); try { request.unsub?.(); } catch {}
  if (remove && request.ref) deleteDoc(request.ref).catch(() => {});
  request = null;
}

async function startUnlock() {
  const user = auth.currentUser;
  if (!user || state.phase === 'waiting' || state.phase === 'opening') return;
  stopRequest(true);
  state = { phase: 'waiting', error: '', code: '--', deadline: Date.now() + REQUEST_MS };
  render();
  try {
    const keys = await createApprovalKeys();
    const codesList = distinctCodes();
    const ref = await addDoc(collection(db, 'loginRequests'), {
      uid: user.uid, purpose: 'LOGIN', protocolVersion: 2, requestPublicKey: keys.publicB64,
      deviceLabel: 'PassGram Web · Vault', accountEmail: user.email || '', locationLabel: '', locationKind: 'unavailable',
      displayCode: codesList[0], candidateCodes: [...codesList].sort(() => Math.random() - 0.5).join(','),
      status: 'pending', createdAt: serverTimestamp(),
    });
    request = { ref, privateKey: keys.privateKey, publicB64: keys.publicB64, uid: user.uid };
    state = { phase: 'waiting', error: '', code: codesList[0], deadline: Date.now() + REQUEST_MS };
    request.timer = setTimeout(() => { stopRequest(true); fail('The request expired. Try again.'); }, REQUEST_MS + 2000);
    request.unsub = onSnapshot(ref, (snap) => {
      const d = snap.data();
      if (!d || !request || request.ref.id !== ref.id) return;
      if (d.status === 'denied') { stopRequest(true); fail('The request was denied on your phone.'); }
      else if (d.status === 'approved') finishUnlock(d);
    }, () => { stopRequest(false); fail('Could not reach the approval service. Check your connection.'); });
    render();
  } catch (error) {
    console.warn('Vault unlock request failed:', error);
    stopRequest(true); fail('Could not start the request. Try again.');
  }
}

async function finishUnlock(d) {
  const req = request; stopRequest(false);
  state = { phase: 'opening', error: '' }; render();
  try {
    if (!d.approvedSecretEnc || !d.responsePublicKey) throw Object.assign(Error('no-secret'), { user: 'Your phone approved, but did not send a vault key. Update PassGram on your phone and try again.' });
    const password = await unwrapApprovalSecret({ privateKey: req.privateKey, requestPublicB64: req.publicB64, responsePublicB64: d.responsePublicKey, requestId: req.ref.id, uid: req.uid, approvedSecretEnc: d.approvedSecretEnc });
    deleteDoc(req.ref).catch(() => {});
    const meta = await getDoc(doc(db, 'vaults', req.uid));
    const vault = await openVault(password, meta.exists() ? meta.data() : null, await argon2id());
    if (vault === undefined) throw Object.assign(Error('no-vault'), { user: 'There is no cloud vault yet. In PassGram on your phone, turn on cloud backup with a recovery password.' });
    if (vault === null) throw Object.assign(Error('locked'), { user: 'Your vault is locked on your phone. Open the Vault in PassGram, then try again.' });
    data = await loadVault(req.uid, vault);
    until = Date.now() + UNLOCK_MS;
    state = { phase: 'unlocked', error: '' };
    open = new Set(); revealed = new Set(); query = '';
    render(); void refreshCodes();
  } catch (error) {
    if (req?.ref) deleteDoc(req.ref).catch(() => {});
    console.warn('Vault unlock failed:', error?.message);
    fail(error.user || 'Could not open your vault. Try again.');
  }
}

async function loadVault(uid, vault) {
  const live = (snap) => snap.docs.filter((d) => d.data().deleted !== true);
  const dec = (v) => (v ? vault.decrypt(v).catch(() => '') : Promise.resolve(''));
  const [itemsSnap, cardsSnap, authSnap] = await Promise.all(['portableItems', 'portableCards', 'portableAuthenticators'].map((c) => getDocs(collection(db, 'vaults', uid, c))));
  const items = await Promise.all(live(itemsSnap).map(async (e) => { const x = e.data(); return { id: e.id, platform: await dec(x.platformCipher), username: await dec(x.usernameCipher), password: await dec(x.passwordCipher), domain: await dec(x.domainCipher), notes: await dec(x.notesCipher), category: await dec(x.categoryCipher) }; }));
  const cards = await Promise.all(live(cardsSnap).map(async (e) => { const x = e.data(); return { id: e.id, number: await dec(x.numberCipher), holder: await dec(x.cardholderCipher), expiry: await dec(x.expiryCipher), brand: await dec(x.brandCipher), bank: await dec(x.bankCipher), nickname: await dec(x.nicknameCipher), cvv: await dec(x.cvvCipher), cvv2: await dec(x.cvv2Cipher) }; }));
  const auths = await Promise.all(live(authSnap).map(async (e) => { const x = e.data(); return { id: e.id, issuer: await dec(x.issuerCipher), account: await dec(x.accountCipher), secret: await dec(x.secretCipher), algorithm: await dec(x.algorithmCipher), digits: x.digits || 6, period: x.period || 30 }; }));
  const byName = (k) => (a, b) => String(a[k]).localeCompare(String(b[k]));
  return { items: items.sort(byName('platform')), cards: cards.sort(byName('nickname')), auths: auths.filter((a) => a.secret).sort(byName('issuer')) };
}

function fail(message) { state = { phase: 'locked', error: message }; render(); }

function lock(message = '') {
  stopRequest(true);
  data = null; until = 0; codes = new Map(); open = new Set(); revealed = new Set(); query = '';
  forgetTotpKeys();
  state = { phase: 'locked', error: message };
  render();
}

// ---------- rendering ----------
function lockedView(kind) {
  const s = state;
  const title = kind === 'auth' ? 'Your authenticator codes are locked' : 'Your vault is locked';
  if (s.phase === 'waiting') {
    return `<div class="zv-card zv-center"><p class="zv-muted">Open PassGram on your phone and tap this number</p><div class="zv-code">${esc(s.code)}</div>
      <p class="zv-muted" data-zv-countdown>${s.code === '--' ? 'Sending the request…' : 'Expires in ' + mmss(s.deadline - Date.now())}</p>
      <p class="zv-muted">Keep the Vault open in the app so your phone can share it securely with this browser.</p>
      <button class="zv-btn ghost" type="button" data-zv="cancel">Cancel</button></div>`;
  }
  if (s.phase === 'opening') {
    return `<div class="zv-card zv-center"><div class="zv-ic">${ICON.unlock}</div><h2>Opening your vault…</h2><p>Decrypting on this device. Your password never leaves your phone unencrypted.</p></div>`;
  }
  return `<div class="zv-card zv-center"><div class="zv-ic">${kind === 'auth' ? ICON.key : ICON.lock}</div><h2>${title}</h2>
    <p>Approve on your phone to open your passwords, cards and authenticator codes here for 15 minutes. They are decrypted only in this browser and locked again after 15 minutes of inactivity.</p>
    <button class="zv-btn" type="button" data-zv="unlock">${ICON.unlock}Unlock for 15 minutes</button>
    <div class="zv-err" role="alert">${esc(s.error)}</div></div>`;
}

function bar() {
  return `<div class="zv-bar">${ICON.unlock}<span>Unlocked · <b data-zv-left>${mmss(until - Date.now())}</b></span><span class="zv-spacer"></span><button type="button" data-zv="lock">Lock now</button></div>`;
}

function match(...fields) { const q = query.trim().toLowerCase(); return !q || fields.some((f) => String(f || '').toLowerCase().includes(q)); }

function passwordsList() {
  const rows = data.items.filter((i) => match(i.platform, i.username, i.domain, i.category, i.notes));
  if (!rows.length) return `<div class="zv-card zv-empty">${data.items.length ? 'No matching passwords.' : 'No passwords in your vault yet.'}</div>`;
  return rows.map((i) => {
    const key = 'p:' + i.id, isOpen = open.has(key), show = revealed.has(key);
    return `<div class="zv-row"><div class="zv-row-head" data-zv="toggle" data-key="${esc(key)}" role="button" tabindex="0">${avatar(i.platform || i.domain || '?')}
      <span class="zv-main"><b>${esc(i.platform || i.domain || 'Untitled')}</b><small>${esc(i.username || '—')}</small></span>
      ${i.username ? `<button class="zv-icon-btn" type="button" title="Copy username" data-zv="copy" data-kind="p-user" data-id="${esc(i.id)}">${ICON.copy}</button>` : ''}
      <button class="zv-icon-btn" type="button" title="Copy password" data-zv="copy" data-kind="p-pass" data-id="${esc(i.id)}">${ICON.key}</button></div>
      ${isOpen ? `<div class="zv-detail">
        ${i.username ? `<div class="zv-field"><span>Username</span><code>${esc(i.username)}</code></div>` : ''}
        <div class="zv-field"><span>Password</span><code>${show ? esc(i.password) : masked}</code><button class="zv-icon-btn" type="button" title="${show ? 'Hide' : 'Show'}" data-zv="reveal" data-key="${esc(key)}">${ICON.eye}</button></div>
        ${i.domain ? `<div class="zv-field"><span>Website</span><code>${esc(i.domain)}</code></div>` : ''}
        ${i.category ? `<div class="zv-field"><span>Category</span><code>${esc(i.category)}</code></div>` : ''}
        ${i.notes ? `<div class="zv-field"><span>Notes</span><div class="zv-notes">${esc(i.notes)}</div></div>` : ''}</div>` : ''}</div>`;
  }).join('');
}

function cardsList() {
  const rows = data.cards.filter((c) => match(c.nickname, c.bank, c.brand, c.holder, cardTail(c.number)));
  if (!rows.length) return `<div class="zv-card zv-empty">${data.cards.length ? 'No matching cards.' : 'No cards in your vault yet.'}</div>`;
  return rows.map((c) => {
    const key = 'c:' + c.id, isOpen = open.has(key), show = revealed.has(key);
    const title = c.nickname || c.bank || c.brand || 'Card';
    return `<div class="zv-row"><div class="zv-row-head" data-zv="toggle" data-key="${esc(key)}" role="button" tabindex="0">${avatar(c.brand || title)}
      <span class="zv-main"><b>${esc(title)}</b><small>${esc([c.brand, '•••• ' + cardTail(c.number), c.expiry].filter(Boolean).join(' · '))}</small></span>
      <button class="zv-icon-btn" type="button" title="Copy number" data-zv="copy" data-kind="c-num" data-id="${esc(c.id)}">${ICON.copy}</button></div>
      ${isOpen ? `<div class="zv-detail">
        <div class="zv-field"><span>Number</span><code>${show ? esc(c.number) : '•••• •••• •••• ' + esc(cardTail(c.number))}</code><button class="zv-icon-btn" type="button" title="${show ? 'Hide' : 'Show'}" data-zv="reveal" data-key="${esc(key)}">${ICON.eye}</button></div>
        ${c.holder ? `<div class="zv-field"><span>Cardholder</span><code>${esc(c.holder)}</code></div>` : ''}
        ${c.expiry ? `<div class="zv-field"><span>Expires</span><code>${esc(c.expiry)}</code></div>` : ''}
        ${c.cvv ? `<div class="zv-field"><span>CVV</span><code>${show ? esc(c.cvv) : '•••'}</code><button class="zv-icon-btn" type="button" title="Copy CVV" data-zv="copy" data-kind="c-cvv" data-id="${esc(c.id)}">${ICON.copy}</button></div>` : ''}
        ${c.bank ? `<div class="zv-field"><span>Bank</span><code>${esc(c.bank)}</code></div>` : ''}</div>` : ''}</div>`;
  }).join('');
}

function authList() {
  const rows = data.auths.map((a, i) => ({ a, i })).filter(({ a }) => match(a.issuer, a.account));
  if (!rows.length) return `<div class="zv-card zv-empty">${data.auths.length ? 'No matching accounts.' : 'No authenticator accounts yet.'}</div>`;
  return rows.map(({ a, i }) => {
    const c = codes.get(i);
    const frac = c ? c.remaining / c.period : 1, len = 2 * Math.PI * 14;
    return `<button class="zv-otp" type="button" data-zv="copy" data-kind="otp" data-index="${i}" title="Copy code">${avatar(a.issuer || a.account)}
      <span class="zv-main"><b>${esc(a.issuer || 'Account')}</b><small>${esc(a.account)}</small></span>
      <span class="zv-otp-code" data-otp="${i}">${c ? esc(spaced(c.code)) : '••• •••'}</span>
      <svg class="zv-ring${c && c.remaining <= 5 ? ' low' : ''}" viewBox="0 0 34 34" data-ring="${i}"><circle class="bg" cx="17" cy="17" r="14"/><circle class="fg" cx="17" cy="17" r="14" stroke-dasharray="${len.toFixed(2)}" stroke-dashoffset="${(len * (1 - frac)).toFixed(2)}"/></svg></button>`;
  }).join('');
}

function render() {
  const unlocked = state.phase === 'unlocked' && data;
  if (roots.vault) {
    const focused = document.activeElement?.dataset?.zvSearch === 'vault';
    roots.vault.innerHTML = !unlocked ? lockedView('vault') : `${bar()}
      <div class="zv-tools"><div class="zv-tabs"><button type="button" data-zv="tab" data-tab="passwords" class="${tab === 'passwords' ? 'on' : ''}">Passwords · ${data.items.length}</button><button type="button" data-zv="tab" data-tab="cards" class="${tab === 'cards' ? 'on' : ''}">Cards · ${data.cards.length}</button></div>
      <label class="zv-search">${ICON.search}<input data-zv-search="vault" type="search" placeholder="Search your vault" value="${esc(query)}" autocomplete="off"></label></div>
      <div class="zv-list">${tab === 'cards' ? cardsList() : passwordsList()}</div>`;
    if (focused) { const i = roots.vault.querySelector('[data-zv-search]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
  if (roots.auth) {
    const focused = document.activeElement?.dataset?.zvSearch === 'auth';
    roots.auth.innerHTML = !unlocked ? lockedView('auth') : `${bar()}
      <div class="zv-tools"><label class="zv-search">${ICON.search}<input data-zv-search="auth" type="search" placeholder="Search accounts" value="${esc(query)}" autocomplete="off"></label></div>
      <div class="zv-list">${authList()}</div>`;
    if (focused) { const i = roots.auth.querySelector('[data-zv-search]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
}

async function refreshCodes() {
  if (state.phase !== 'unlocked' || !data) return;
  const now = Date.now();
  await Promise.all(data.auths.map(async (a, i) => { try { codes.set(i, await totp(a, now)); } catch { codes.delete(i); } }));
  // update in place (no full re-render, so hover/focus stay put)
  for (const [i, c] of codes) {
    const el = document.querySelector(`[data-otp="${i}"]`); if (el) el.textContent = spaced(c.code);
    const ring = document.querySelector(`[data-ring="${i}"]`);
    if (ring) { const len = 2 * Math.PI * 14; ring.querySelector('.fg').setAttribute('stroke-dashoffset', (len * (1 - c.remaining / c.period)).toFixed(2)); ring.classList.toggle('low', c.remaining <= 5); }
  }
}

// ---------- events ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-zv]');
  if (!t || !t.closest('.zv-root')) return;
  const act = t.dataset.zv;
  if (act === 'unlock') startUnlock();
  else if (act === 'cancel') { stopRequest(true); fail(''); }
  else if (act === 'lock') lock();
  else if (act === 'tab') { tab = t.dataset.tab; render(); }
  else if (act === 'toggle') { if (e.target.closest('button')) return; const k = t.dataset.key; open.has(k) ? open.delete(k) : open.add(k); render(); }
  else if (act === 'reveal') { e.stopPropagation(); const k = t.dataset.key; revealed.has(k) ? revealed.delete(k) : revealed.add(k); render(); }
  else if (act === 'copy' && data) {
    e.stopPropagation();
    const k = t.dataset.kind, item = data.items.find((x) => x.id === t.dataset.id), card = data.cards.find((x) => x.id === t.dataset.id);
    if (k === 'p-user' && item) copy(item.username, 'Username');
    else if (k === 'p-pass' && item) copy(item.password, 'Password');
    else if (k === 'c-num' && card) copy(card.number.replace(/\s/g, ''), 'Card number');
    else if (k === 'c-cvv' && card) copy(card.cvv, 'CVV');
    else if (k === 'otp') { const c = codes.get(Number(t.dataset.index)); if (c) copy(c.code, 'Code'); }
  }
});
document.addEventListener('keydown', (e) => {
  const t = e.target.closest?.('[data-zv="toggle"]');
  if (t && (e.key === 'Enter' || e.key === ' ') && e.target === t) { e.preventDefault(); t.click(); }
});
document.addEventListener('input', (e) => { if (e.target.dataset?.zvSearch) { query = e.target.value; render(); } });
// Activity keeps the vault open (the APK's rule: locks after 15 minutes of inactivity).
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { if (state.phase === 'unlocked') until = Date.now() + UNLOCK_MS; }, { passive: true }));

setInterval(() => {
  if (state.phase === 'unlocked') {
    if (Date.now() >= until) { lock('Locked after 15 minutes of inactivity.'); return; }
    document.querySelectorAll('[data-zv-left]').forEach((el) => { el.textContent = mmss(until - Date.now()); });
    void refreshCodes();
  } else if (state.phase === 'waiting' && state.code !== '--') {
    document.querySelectorAll('[data-zv-countdown]').forEach((el) => { el.textContent = 'Expires in ' + mmss(state.deadline - Date.now()); });
  }
}, 1000);

onAuthStateChanged(auth, (user) => { if (!user) lock(); });
window.addEventListener('pagehide', () => lock());
render();

// Local UI test hook only (never active on web.zpas.org): lets a headless test render the unlocked views with fake data.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  window.__zvTest = { unlockWith(fake) { data = fake; until = Date.now() + UNLOCK_MS; state = { phase: 'unlocked', error: '' }; render(); return refreshCodes(); }, lock };
}
