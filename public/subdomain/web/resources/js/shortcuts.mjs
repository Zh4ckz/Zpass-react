// X / Telegram style keyboard shortcuts for PassGram Web.
// "/" and Ctrl/Cmd+K (search) live in chat-search.mjs; this adds navigation, list movement and a "?" help sheet.
const SHORTCUTS = [
  ['/', 'Search people, bots and chats'],
  ['Ctrl K', 'Search from anywhere'],
  ['g h', 'Home'],
  ['g v', 'Vault'],
  ['g c', 'Chats'],
  ['g a', 'Authenticator'],
  ['g s', 'Secure'],
  ['g ,', 'Settings'],
  ['g p', 'Premium'],
  ['j', 'Next chat'],
  ['k', 'Previous chat'],
  ['Enter', 'Open selected search result'],
  ['Esc', 'Close search, sheet or chat'],
  ['?', 'Show keyboard shortcuts'],
];
const GO = { h: 'home', v: 'vault', c: 'chats', a: 'auth', s: 'secure', ',': 'settings' };

const typing = () => {
  const el = document.activeElement;
  return Boolean(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable));
};
const view = (name) => document.querySelector(`.ap-nav button[data-view="${name}"]`);
const signedIn = () => Boolean(view('home') && view('home').offsetParent !== null);

let help = null;
function toggleHelp(force) {
  if (!help) {
    help = document.createElement('dialog');
    help.className = 'ap-shortcuts';
    help.setAttribute('aria-labelledby', 'ap-shortcuts-title');
    help.innerHTML = `<div class="ap-shortcuts-head"><h2 id="ap-shortcuts-title">Keyboard shortcuts</h2><button type="button" class="ap-shortcuts-close" aria-label="Close">×</button></div>
      <dl>${SHORTCUTS.map(([k, d]) => `<div><dt>${k.split(' ').map((p) => `<kbd>${p}</kbd>`).join(' ')}</dt><dd>${d}</dd></div>`).join('')}</dl>`;
    help.querySelector('.ap-shortcuts-close').addEventListener('click', () => help.close());
    help.addEventListener('click', (e) => { if (e.target === help) help.close(); });
    document.body.appendChild(help);
  }
  const open = force ?? !help.open;
  if (open && !help.open) help.showModal(); else if (!open && help.open) help.close();
}

function moveChat(step) {
  const items = [...document.querySelectorAll('#ap-chat-items .ap-chat-item')];
  if (!items.length) return;
  const current = items.findIndex((b) => b.classList.contains('on'));
  const next = items[Math.min(items.length - 1, Math.max(0, current + step))] || items[0];
  next.click();
  next.scrollIntoView({ block: 'nearest' });
}

let pendingG = 0;
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing()) return;
  if (document.querySelector('dialog[open]:not(.ap-shortcuts)')) return; // let other dialogs (Premium) own the keyboard
  const key = e.key;
  if (key === '?') { e.preventDefault(); toggleHelp(); return; }
  if (!signedIn()) return;
  if (pendingG && Date.now() - pendingG < 1200) {
    pendingG = 0;
    if (GO[key]) { e.preventDefault(); view(GO[key])?.click(); return; }
    if (key === 'p') { e.preventDefault(); document.getElementById('pg-premium-open')?.click(); return; }
  }
  if (key === 'g') { pendingG = Date.now(); return; }
  pendingG = 0;
  const inChats = view('chats')?.classList.contains('on');
  if (inChats && key === 'j') { e.preventDefault(); moveChat(1); }
  else if (inChats && key === 'k') { e.preventDefault(); moveChat(-1); }
  else if (key === 'Escape' && document.getElementById('ap-v-chats')?.classList.contains('thread-open')) {
    document.getElementById('ap-thread-back')?.click();
  }
});
