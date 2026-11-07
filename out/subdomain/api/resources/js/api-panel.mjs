// api.zpas.org: the public JSON files the apps read, and the Bot API endpoints (administrators only).
// The JSON files themselves stay public: the Android and Windows apps download them.
import { startAdmin, topBar, icons, esc, $, toast, GATEWAY } from './admin-gate.mjs';

const FILES = [
  { file: 'zpass-version.json', title: 'App update', text: 'Latest version, minimum version, force update and maintenance switch.' },
  { file: 'app-releases.json', title: 'Releases', text: 'Download details per platform.' },
  { file: 'payment-config.json', title: 'Payment plans', text: 'Plans and prices shown in the apps.' },
  { file: 'payment-target.json', title: 'Payment target', text: 'Address of the payment backend.' },
];
const METHODS = [
  ['getMe', 'GET/POST', 'Bot identity, checks the token'],
  ['getUpdates', 'GET/POST', 'Messages users sent to the bot'],
  ['sendMessage', 'POST', 'Reply to a user who started the bot'],
  ['getMyCommands', 'GET/POST', 'Read the / command list'],
  ['setMyCommands', 'POST', 'Replace the / command list'],
  ['deleteMyCommands', 'POST', 'Remove all commands'],
  ['getChatMenuButton', 'GET/POST', 'Read the menu button'],
  ['setChatMenuButton', 'POST', 'Command list, mini app or none'],
];
const size = (n) => (n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

startAdmin((main, { api }) => {
  main.innerHTML = `${topBar('API & config', 'Public files the apps download, and the Bot API.', `<button class="btn" type="button" data-reload>${icons.refresh}<span>Refresh</span></button>`)}
    <section class="card"><div class="card-head"><div><h2>${icons.app} App config files</h2><p class="sub">Served at <code>api.zpas.org/api/&lt;file&gt;</code>. They must stay public, the apps read them on start.</p></div></div>
      <div class="table-wrap"><table class="table" id="files"></table></div></section>
    <section class="card"><div class="card-head"><div><h2 id="viewer-title">Preview</h2><p class="sub" id="viewer-sub">Choose a file above.</p></div><button class="btn sm" type="button" data-copy hidden>Copy</button></div>
      <pre class="code" id="viewer">—</pre></section>
    <section class="card"><div class="card-head"><div><h2>${icons.bot} Bot API</h2><p class="sub">Bot programs call these with <code>Authorization: Bearer &lt;token&gt;</code>. Full guide on <a href="https://docs.zpas.org/" target="_blank" rel="noopener">docs.zpas.org ↗</a></p></div><span id="gw"></span></div>
      <div class="table-wrap"><table class="table"><tr><th>Method</th><th>HTTP</th><th>What it does</th></tr>
      ${METHODS.map(([m, h, t]) => `<tr><td><code>${m}</code></td><td>${h}</td><td>${t}</td></tr>`).join('')}</table></div>
      <dl class="kv" style="margin-top:14px"><dt>Public address</dt><dd><code>https://botapi.zpas.org/&lt;method&gt;</code></dd><dt>Worker</dt><dd><code>${esc(GATEWAY)}</code></dd></dl></section>`;

  let shown = '';
  async function files() {
    const table = $('#files');
    table.innerHTML = '<tr><th>File</th><th>Purpose</th><th>Size</th><th>Updated</th><th></th></tr>' + FILES.map((f) => `<tr data-row="${f.file}"><td><code>${f.file}</code></td><td>${f.title}<div class="hint">${f.text}</div></td><td data-size>…</td><td data-updated>…</td><td style="text-align:right"><button class="btn sm" type="button" data-view="${f.file}">View</button></td></tr>`).join('');
    await Promise.all(FILES.map(async (f) => {
      const row = $(`[data-row="${f.file}"]`);
      try {
        const res = await fetch(`/api/${f.file}`, { cache: 'no-store' });
        const text = await res.text();
        if (!res.ok) throw new Error(res.status);
        const data = JSON.parse(text);
        f.text_ = JSON.stringify(data, null, 2);
        $('[data-size]', row).textContent = size(text.length);
        $('[data-updated]', row).innerHTML = data.updatedAt ? esc(new Date(data.updatedAt).toLocaleString()) : '<span class="hint">—</span>';
      } catch (e) {
        $('[data-size]', row).innerHTML = '<span class="pill bad">Missing</span>';
        $('[data-updated]', row).textContent = '—';
      }
    }));
    if (!shown) view(FILES[0].file);
  }

  function view(file) {
    const f = FILES.find((x) => x.file === file);
    shown = file;
    $('#viewer-title').textContent = f.file;
    $('#viewer-sub').textContent = f.text;
    $('#viewer').textContent = f.text_ || 'Not available.';
    $('[data-copy]').hidden = !f.text_;
  }

  async function gateway() {
    const start = performance.now();
    try { await api('whoami'); $('#gw').innerHTML = `<span class="pill ok">Online · ${Math.round(performance.now() - start)} ms</span>`; }
    catch (e) { $('#gw').innerHTML = `<span class="pill bad" title="${esc(e.message)}">Offline</span>`; }
  }

  main.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.view) view(t.dataset.view);
    if (t.matches('[data-reload]')) { shown = ''; files(); gateway(); }
    if (t.matches('[data-copy]')) { try { await navigator.clipboard.writeText($('#viewer').textContent); toast('Copied.'); } catch { toast('Copy failed.', 'bad'); } }
  });
  files(); gateway();
});
