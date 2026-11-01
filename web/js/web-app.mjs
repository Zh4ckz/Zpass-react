import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.mjs';
import { t, getLanguage, setLanguage } from './web-i18n.mjs';

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const root = $('chat-app');

const TITLES = { home: 'Home', vault: 'Vault', chats: 'Chats', auth: 'Authenticator', secure: 'Secure', settings: 'Settings' };
const PALETTE = ['#7c5cff', '#339af0', '#1f9d6b', '#e8590c', '#d6336c', '#0c8599', '#f59f00'];
const ICON = {
  device: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>'
};

let uid = null, current = 'home';
let profile = {}, plan = null, devices = [], events = [], chats = [];
const peers = new Map();
let stops = [];
let activeChat = null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = s => (String(s || '?').trim()[0] || '?').toUpperCase();
const colorFor = s => PALETTE[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const locale = () => (getLanguage() === 'tr' ? 'tr-TR' : 'en-US');
const fmt = d => d ? d.toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }) : '';
const tsDate = v => (v?.toDate ? v.toDate() : (typeof v === 'number' && v > 0 ? new Date(v) : null));
const sessionId = () => localStorage.getItem('zpass-web-session-id');

let toastTimer = 0;
function toast(msg) {
  const node = $('ap-toast');
  if (!node) return;
  node.textContent = t(msg);
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}

function setMenu(open) { root.classList.toggle('menu-open', open); }

function showView(name) {
  if (!TITLES[name]) name = 'home';
  current = name;
  document.querySelectorAll('.ap-view').forEach(v => { v.hidden = v.id !== `ap-v-${name}`; });
  document.querySelectorAll('.ap-nav button').forEach(b => b.classList.toggle('on', b.dataset.view === name));
  $('ap-title').textContent = t(TITLES[name]);
  setMenu(false);
  try { sessionStorage.setItem('zpass-app-view', name); } catch { /* storage unavailable */ }
}

function displayName() {
  return profile.displayName || profile.username || auth.currentUser?.displayName || 'PassGram';
}

function renderIdentity() {
  const name = displayName();
  const handle = profile.username ? `@${profile.username}` : '';
  ['ap-name', 'ap-set-name'].forEach(id => { $(id).textContent = name; });
  ['ap-handle', 'ap-set-handle'].forEach(id => { $(id).textContent = handle; });
  $('ap-hello').textContent = name;
  ['ap-avatar', 'ap-set-avatar'].forEach(id => {
    const node = $(id);
    node.textContent = initial(name);
    node.style.background = `linear-gradient(135deg, ${colorFor(uid || name)}, #339af0)`;
  });
}

function planLabel() {
  const raw = String(plan?.plan || 'FREE').toUpperCase();
  const active = !plan?.status || ['ACTIVE', 'FREE', 'TRIALING'].includes(String(plan.status).toUpperCase());
  return raw === 'FREE' || !active ? 'Free' : raw.charAt(0) + raw.slice(1).toLowerCase();
}

function renderPlan() {
  const label = planLabel();
  $('ap-stat-plan').textContent = t(label);
  const chip = $('ap-plan-chip');
  chip.hidden = label === 'Free';
  chip.textContent = t(label);
}

function eventItem(e) {
  const date = fmt(tsDate(e.createdAt));
  return `<li><span class="ap-li-ic">${ICON.web}</span><div class="ap-li-main"><b>${esc(e.deviceName || t('Web browser'))}</b><small>${esc(e.locationLabel || t('Location unavailable'))}${date ? ' · ' + esc(date) : ''}</small></div></li>`;
}

function renderEvents() {
  const none = `<li class="none">${esc(t('New device sign-ins will appear here.'))}</li>`;
  $('ap-events').innerHTML = events.length ? events.map(eventItem).join('') : none;
  $('ap-home-events').innerHTML = events.length ? events.slice(0, 4).map(eventItem).join('') : none;
}

function renderDevices() {
  const mine = sessionId();
  const sorted = [...devices].sort((a, b) => (b.id === mine) - (a.id === mine) || (tsDate(b.lastSeenAt)?.getTime() || 0) - (tsDate(a.lastSeenAt)?.getTime() || 0));
  const active = sorted.filter(d => !d.revoked);
  $('ap-stat-devices').textContent = String(active.length);
  $('ap-devices').innerHTML = sorted.length ? sorted.map(d => {
    const isWeb = String(d.platform).toUpperCase() === 'WEB';
    const here = d.id === mine;
    const seen = fmt(tsDate(d.lastSeenAt));
    const meta = [d.platform, d.appVersion].filter(Boolean).join(' · ');
    const action = d.revoked
      ? `<span class="ap-badge off">${esc(t('Revoked'))}</span>`
      : here ? `<span class="ap-badge">${esc(t('This browser'))}</span>`
        : `<button class="ap-btn ghost small" type="button" data-revoke="${esc(d.id)}">${esc(t('Terminate'))}</button>`;
    return `<li><span class="ap-li-ic">${isWeb ? ICON.web : ICON.device}</span><div class="ap-li-main"><b>${esc(d.deviceName || d.platform || t('Device'))}</b><small>${esc(meta)}${seen ? ' · ' + esc(seen) : ''}</small></div>${action}</li>`;
  }).join('') : `<li class="none">${esc(t('No devices yet.'))}</li>`;
}

function renderChats() {
  const q = ($('ap-chat-search').value || '').trim().toLowerCase();
  const rows = chats.map(c => ({ c, p: peers.get(c.peer) || {} }))
    .filter(({ p }) => !q || `${p.displayName || ''} ${p.username || ''}`.toLowerCase().includes(q))
    .sort((a, b) => (b.c.lastAt || 0) - (a.c.lastAt || 0));
  $('ap-stat-chats').textContent = String(chats.length);
  const badge = $('ap-chats-count');
  badge.hidden = !chats.length;
  badge.textContent = String(chats.length);
  $('ap-chat-items').innerHTML = rows.length ? rows.map(({ c, p }) => {
    const name = p.displayName || p.username || t('PassGram user');
    const when = c.lastAt ? new Date(c.lastAt).toLocaleDateString(locale(), { month: 'short', day: 'numeric' }) : '';
    return `<button type="button" class="ap-chat-item${activeChat === c.id ? ' on' : ''}" data-chat="${esc(c.id)}"><span class="ap-avatar sm" style="background:linear-gradient(135deg,${colorFor(c.peer)},#339af0)">${esc(initial(name))}</span><span class="ap-li-main"><b>${esc(name)}</b><small>${ICON.lock}${esc(t('Encrypted message'))}</small></span><time>${esc(when)}</time></button>`;
  }).join('') : `<div class="none">${esc(t(chats.length ? 'No matching chats.' : 'No chats yet. Start one from the app.'))}</div>`;
}

function openChat(id) {
  const c = chats.find(x => x.id === id);
  if (!c) return;
  activeChat = id;
  const p = peers.get(c.peer) || {};
  const name = p.displayName || p.username || t('PassGram user');
  $('ap-thread-name').textContent = name;
  $('ap-thread-handle').textContent = p.username ? `@${p.username}` : '';
  const av = $('ap-thread-avatar');
  av.textContent = initial(name);
  av.style.background = `linear-gradient(135deg, ${colorFor(c.peer)}, #339af0)`;
  $('ap-thread-empty').hidden = true;
  $('ap-thread-open').hidden = false;
  $('ap-v-chats').classList.add('thread-open');
  renderChats();
}

function closeChat() {
  activeChat = null;
  $('ap-thread-empty').hidden = false;
  $('ap-thread-open').hidden = true;
  $('ap-v-chats').classList.remove('thread-open');
  renderChats();
}

async function loadPeers(list) {
  const missing = [...new Set(list.map(c => c.peer))].filter(id => id && !peers.has(id));
  await Promise.all(missing.map(async id => {
    try { peers.set(id, (await getDoc(doc(db, 'chat_profiles', id))).data() || {}); } catch { peers.set(id, {}); }
  }));
}

function syncNight() {
  const dark = document.body.classList.contains('dark-theme');
  ['ap-night', 'ap-night2'].forEach(id => $(id)?.setAttribute('aria-checked', String(dark)));
}

function syncLang() {
  document.querySelectorAll('.ap-seg button').forEach(b => b.classList.toggle('on', b.dataset.lang === getLanguage()));
  $('ap-title').textContent = t(TITLES[current]);
  renderEvents(); renderDevices(); renderChats(); renderPlan();
}

function toggleNight() {
  const dark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('zpass-theme', dark ? 'dark' : 'light');
  syncNight();
}

async function terminate(id) {
  if (!window.confirm(t('Terminate this session?'))) return;
  const data = { revoked: true, revokedAt: serverTimestamp() };
  try {
    await updateDoc(doc(db, 'users', uid, 'devices', id), data);
    updateDoc(doc(db, 'users', uid, 'sessionDirectory', id), data).catch(() => {});
    toast('Session terminated.');
  } catch (error) {
    console.error('Could not terminate session:', error);
    toast('Could not terminate the session.');
  }
}

function listen(ref, onData) {
  stops.push(onSnapshot(ref, onData, error => console.warn('Listener failed:', error?.code || error)));
}

// Small screens get the dedicated mobile interface in a same-origin frame.
const narrow = window.matchMedia('(max-width: 860px)');
let mobileTimer = 0;
function mountMobile() {
  const frame = $('ap-mobile');
  const on = !!uid && narrow.matches;
  root.classList.toggle('mobile-mode', on);
  frame.hidden = !on;
  if (!on) { if (frame.getAttribute('src')) frame.removeAttribute('src'); return; }
  if (frame.getAttribute('src')) return;
  const params = new URLSearchParams({ lang: getLanguage(), n: displayName() });
  if (profile.username) params.set('u', profile.username);
  frame.src = `/mobile?${params}`;
}
narrow.addEventListener('change', mountMobile);
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.data?.type === 'zpass-signout') signOut(auth).catch(() => {});
});

function start(user) {
  uid = user.uid;
  peers.clear();
  activeChat = null;
  renderIdentity();
  let firstProfile = true;
  listen(doc(db, 'chat_profiles', uid), s => {
    profile = s.data() || {};
    renderIdentity();
    if (firstProfile) { firstProfile = false; mountMobile(); }
  });
  mobileTimer = setTimeout(mountMobile, 1500);
  listen(doc(db, 'subscriptions', uid), s => { plan = s.data() || null; renderPlan(); });
  listen(collection(db, 'users', uid, 'devices'), s => { devices = s.docs.map(d => ({ id: d.id, ...d.data() })); renderDevices(); });
  listen(query(collection(db, 'users', uid, 'securityEvents'), orderBy('createdAt', 'desc'), limit(10)), s => { events = s.docs.map(d => d.data()); renderEvents(); });
  listen(query(collection(db, 'chats'), where('participants', 'array-contains', uid)), async s => {
    chats = s.docs.map(d => {
      const data = d.data();
      return { id: d.id, peer: (data.participants || []).find(p => p !== uid) || '', lastAt: Number(data.lastAt) || 0 };
    });
    renderChats();
    await loadPeers(chats);
    renderChats();
  });
  let saved = 'home';
  try { saved = sessionStorage.getItem('zpass-app-view') || 'home'; } catch { /* storage unavailable */ }
  showView(saved);
  syncNight();
  syncLang();
}

function stop() {
  clearTimeout(mobileTimer);
  stops.splice(0).forEach(fn => { try { fn(); } catch { /* listener already closed */ } });
  uid = null; profile = {}; plan = null; devices = []; events = []; chats = [];
  setMenu(false);
  mountMobile();
}

document.querySelectorAll('.ap-nav button').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
root.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) showView(go.dataset.go);
  const rev = e.target.closest('[data-revoke]');
  if (rev) terminate(rev.dataset.revoke);
  const chat = e.target.closest('[data-chat]');
  if (chat) openChat(chat.dataset.chat);
  const lang = e.target.closest('[data-lang]');
  if (lang) { setLanguage(lang.dataset.lang); syncLang(); }
});
$('ap-menu').addEventListener('click', () => setMenu(true));
$('ap-close').addEventListener('click', () => setMenu(false));
$('ap-backdrop').addEventListener('click', () => setMenu(false));
$('ap-night').addEventListener('click', toggleNight);
$('ap-night2').addEventListener('click', toggleNight);
$('ap-chat-search').addEventListener('input', renderChats);
$('ap-thread-back').addEventListener('click', closeChat);
['ap-signout', 'ap-signout2'].forEach(id => $(id).addEventListener('click', () => signOut(auth).catch(() => toast('Could not sign out.'))));
$('ap-copy-id').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(uid || ''); toast('Account ID copied.'); } catch { toast('Could not copy.'); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

onAuthStateChanged(auth, user => {
  stop();
  document.body.classList.toggle('app-mode', !!user);
  if (user) start(user);
});
