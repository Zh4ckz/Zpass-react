// Global PassGram search in the Chats view, matching the Android app (ChatRepository.search):
//  - "zbot" prefix -> the verified system bot Zbot
//  - usernames (4-32 chars, a-z 0-9 _) -> prefix search on chat_profiles.username (max 20)
//  - never looks up by email, phone, Firebase UID or payment ID
// Keyboard: Ctrl/Cmd+K or "/" focuses search, Up/Down select, Enter opens, Esc clears.
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, orderBy, startAt, endAt, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.mjs';

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const input = document.getElementById('ap-chat-search');
const list = document.getElementById('ap-chat-items');
const threadEmpty = document.getElementById('ap-thread-empty');
if (input && list) start();

function start() {
  const ZBOT = { uid: 'system_zbot', username: 'zbot', displayName: 'Zbot', verified: true, isBot: true, bio: 'The official PassGram bot.' };
  let me = auth.currentUser?.uid || null;
  onAuthStateChanged(auth, (u) => { me = u?.uid || null; });

  const box = document.createElement('div');
  box.id = 'ap-search-results';
  box.className = 'ap-search-results';
  box.hidden = true;
  box.setAttribute('role', 'listbox');
  list.insertAdjacentElement('afterend', box);

  const panel = document.createElement('div');
  panel.id = 'ap-search-profile';
  panel.className = 'ap-search-profile';
  panel.hidden = true;
  threadEmpty?.insertAdjacentElement('afterend', panel);

  input.setAttribute('placeholder', 'Search chats, people and bots');
  input.setAttribute('aria-controls', 'ap-search-results');
  input.setAttribute('autocomplete', 'off');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const name = (p) => p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.username || 'PassGram user';
  const initial = (p) => (name(p).trim()[0] || '?').toUpperCase();
  const BADGE = '<svg class="ap-verified" viewBox="0 0 24 24" aria-label="Verified" role="img"><path fill="currentColor" d="M12 1.5l2.6 2 3.2-.3 1 3.1 2.8 1.6-.8 3.1 1.4 2.9-2.4 2.1-.3 3.2-3.2.6-1.8 2.7-3-1.1-3 1.1-1.8-2.7-3.2-.6-.3-3.2L1.8 14l1.4-2.9-.8-3.1 2.8-1.6 1-3.1 3.2.3z"/><path fill="#fff" d="M10.4 15.6l-3.2-3.2 1.4-1.4 1.8 1.8 4.9-4.9 1.4 1.4z"/></svg>';

  let results = [];
  let active = -1;
  let seq = 0;
  let timer = 0;

  async function searchProfiles(q) {
    if (!/^[a-z0-9_]{4,32}$/.test(q) || !me) return [];
    const snap = await getDocs(query(collection(db, 'chat_profiles'), orderBy('username'), startAt(q), endAt(q + ''), limit(20)));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => p.uid !== me && p.username && p.deleted !== true);
  }

  async function run() {
    const q = input.value.trim().toLowerCase().replace(/^@/, '');
    const mine = ++seq;
    list.classList.toggle('ap-searching', Boolean(q));
    if (!q) { results = []; render(q, false); return; }
    const system = 'zbot'.startsWith(q) ? [ZBOT] : [];
    results = system; render(q, /^[a-z0-9_]{4,32}$/.test(q));
    try {
      const found = await searchProfiles(q);
      if (mine !== seq) return;
      results = [...system, ...found.filter((p) => p.username !== 'zbot')];
    } catch (error) {
      if (mine !== seq) return;
      console.warn('PassGram search failed:', error);
    }
    render(q, false);
  }

  function render(q, loading) {
    box.hidden = !q;
    if (!q) { box.innerHTML = ''; active = -1; return; }
    active = results.length ? Math.min(Math.max(active, 0), results.length - 1) : -1;
    const hint = q.length < 4 && !results.length ? 'Type at least 4 letters to search usernames.' : loading ? 'Searching…' : results.length ? '' : 'No people or bots found.';
    box.innerHTML = `<div class="ap-search-head">Global search</div>` +
      results.map((p, i) => `<button type="button" role="option" class="ap-chat-item ap-search-item${i === active ? ' on' : ''}" aria-selected="${i === active}" data-index="${i}">
        <span class="ap-avatar sm">${esc(initial(p))}</span>
        <span class="ap-li-main"><b>${esc(name(p))}${p.verified ? BADGE : ''}${p.isBot ? '<span class="ap-bot-tag">Bot</span>' : ''}</b><small>@${esc(p.username)}</small></span>
      </button>`).join('') +
      (hint ? `<div class="none">${esc(hint)}</div>` : '');
  }

  function open(i) {
    const p = results[i];
    if (!p) return;
    active = i; render(input.value.trim(), false);
    if (threadEmpty) threadEmpty.hidden = true;
    document.getElementById('ap-thread-open')?.setAttribute('hidden', '');
    const link = p.uid === 'system_zbot' ? '' : `https://zpas.org/${encodeURIComponent(p.username)}`;
    panel.innerHTML = `<div class="ap-profile-card">
      <span class="ap-avatar lg">${esc(initial(p))}</span>
      <h2>${esc(name(p))}${p.verified ? BADGE : ''}</h2>
      <p class="ap-profile-handle">@${esc(p.username)}${p.isBot ? ' · <span class="ap-bot-tag">Bot</span>' : ''}</p>
      ${p.bio ? `<p class="ap-profile-bio">${esc(p.bio)}</p>` : ''}
      <div class="ap-empty-actions">${link ? `<a class="ap-btn" href="${link}" target="_blank" rel="noopener">Open profile</a>` : ''}<span class="ap-profile-note">Start this chat in the PassGram app. It will then appear here.</span></div>
    </div>`;
    panel.hidden = false;
  }

  function closePanel() { panel.hidden = true; panel.innerHTML = ''; if (threadEmpty && !document.querySelector('#ap-v-chats.thread-open')) threadEmpty.hidden = false; }

  input.addEventListener('input', () => { clearTimeout(timer); active = 0; timer = setTimeout(run, 220); });
  input.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (results.length) { active = (active + 1) % results.length; render(input.value.trim(), false); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (results.length) { active = (active - 1 + results.length) % results.length; render(input.value.trim(), false); } }
    else if (e.key === 'Enter') { e.preventDefault(); open(active < 0 ? 0 : active); }
    else if (e.key === 'Escape') { e.preventDefault(); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); closePanel(); input.blur(); }
  });
  box.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-index]'); if (b) { e.preventDefault(); open(Number(b.dataset.index)); } });
  list.addEventListener('click', closePanel);

  // Ctrl/Cmd+K anywhere, or "/" when not typing: jump to Chats and focus search (like Telegram).
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
      e.preventDefault();
      document.querySelector('.ap-nav button[data-view="chats"]')?.click();
      setTimeout(() => { input.focus(); input.select(); }, 0);
    }
  });
}
