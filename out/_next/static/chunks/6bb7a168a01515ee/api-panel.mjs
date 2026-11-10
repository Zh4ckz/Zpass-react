// api.zpas.org: the public JSON files the apps read (editable here), and the Bot API endpoints (administrators only).
// The files stay public: the Android and Windows apps download them from api.zpas.org/api/<file>.
// Saving here stores the text in Firestore (config/api_<name>); the bot worker serves that version instead of
// the website's file right away. "Use website file" deletes the saved version again.
import { startAdmin, topBar, icons, esc, $, toast, confirmDialog, GATEWAY } from './admin-gate.mjs';

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
const when = (ms) => (ms ? new Date(ms).toLocaleString() : '—');

// JSON check with the line of the mistake
function check(text) {
  try { const data = JSON.parse(text); return data && typeof data === 'object' ? { ok: true } : { ok: false, error: 'The file must be a JSON object or list.' }; }
  catch (e) {
    const at = Number(/position (\d+)/.exec(e.message)?.[1]);
    const line = Number.isFinite(at) ? text.slice(0, at).split('\n').length : Number(/line (\d+)/.exec(e.message)?.[1]) || 0;
    return { ok: false, error: e.message.replace(/^JSON\.parse: /, ''), line };
  }
}

startAdmin((main, { api }) => {
  main.innerHTML = `${topBar('API & config', 'Public files the apps download, and the Bot API.', `<button class="btn" type="button" data-reload>${icons.refresh}<span>Refresh</span></button>`)}
    <section class="card"><div class="card-head"><div><h2>${icons.app} App config files</h2><p class="sub">Served at <code>api.zpas.org/api/&lt;file&gt;</code>; the apps read them on start. Edit a file and press Save: the apps get the new version within a minute.</p></div></div>
      <div class="table-wrap"><table class="table" id="files"></table></div></section>
    <section class="card" id="editor-card"><div class="card-head"><div><h2 id="ed-title">Editor</h2><p class="sub" id="ed-sub">Choose a file above.</p></div>
      <div class="ed-actions"><button class="btn sm ghost" type="button" data-format>{ } Format</button><button class="btn sm ghost" type="button" data-revert>Revert</button>
      <button class="btn sm danger" type="button" data-reset hidden>Use website file</button><button class="btn sm primary" type="button" data-save>${icons.check}<span>Save</span></button></div></div>
      <div class="ed-meta" id="ed-meta"></div>
      <div class="ed" id="ed"><pre class="ed-gutter" aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="File content" disabled></textarea></div>
      <div class="ed-status" id="ed-status"></div></section>
    <section class="card"><div class="card-head"><div><h2>@ Reserved usernames</h2><p class="sub">Countries, government and system names nobody can take, and giving a username to someone, are edited in the admin console.</p></div>
      <a class="btn sm" href="https://zpas.org/admin#usernames" target="_blank" rel="noopener">Open Usernames ↗</a></div></section>
    <section class="card"><div class="card-head"><div><h2>${icons.bot} Bot API</h2><p class="sub">Bot programs call these with <code>Authorization: Bearer &lt;token&gt;</code>. Full guide on <a href="https://docs.zpas.org/" target="_blank" rel="noopener">docs.zpas.org ↗</a></p></div><span id="gw"></span></div>
      <div class="table-wrap"><table class="table"><tr><th>Method</th><th>HTTP</th><th>What it does</th></tr>
      ${METHODS.map(([m, h, t]) => `<tr><td><code>${m}</code></td><td>${h}</td><td>${t}</td></tr>`).join('')}</table></div>
      <dl class="kv" style="margin-top:14px"><dt>Public address</dt><dd><code>https://botapi.zpas.org/&lt;method&gt;</code></dd><dt>Worker</dt><dd><code>${esc(GATEWAY)}</code></dd></dl></section>`;

  const area = $('#ed textarea'), gutter = $('#ed .ed-gutter');
  let current = null; // { file, saved, original }
  let status = {};

  async function files() {
    const table = $('#files');
    table.innerHTML = '<tr><th>File</th><th>Purpose</th><th>Source</th><th>Size</th><th>Updated</th><th></th></tr>' + FILES.map((f) => `<tr data-row="${f.file}"><td><code>${f.file}</code></td><td>${f.title}<div class="hint">${f.text}</div></td><td data-src>…</td><td data-size>…</td><td data-updated>…</td><td style="text-align:right"><button class="btn sm" type="button" data-edit="${f.file}">Edit</button></td></tr>`).join('');
    try { status = Object.fromEntries((await api('configList')).map((s) => [s.file, s])); }
    catch (e) { status = {}; toast('Could not read saved versions: ' + e.message, 'bad'); }
    await Promise.all(FILES.map(async (f) => {
      const row = $(`[data-row="${f.file}"]`), s = status[f.file];
      $('[data-src]', row).innerHTML = s?.saved ? '<span class="pill acc">Edited here</span>' : '<span class="pill">Website file</span>';
      try {
        const res = await fetch(`/api/${f.file}`, { cache: 'no-store' });
        const text = await res.text();
        if (!res.ok) throw new Error(res.status);
        f.live = text;
        $('[data-size]', row).textContent = size(text.length);
        let updated = s?.saved ? s.updatedAt : 0;
        if (!updated) try { updated = Date.parse(JSON.parse(text).updatedAt) || 0; } catch {}
        $('[data-updated]', row).innerHTML = updated ? esc(when(updated)) + (s?.updatedBy ? `<div class="hint">${esc(s.updatedBy)}</div>` : '') : '<span class="hint">—</span>';
      } catch {
        $('[data-size]', row).innerHTML = '<span class="pill bad">Missing</span>';
        $('[data-updated]', row).textContent = '—';
      }
    }));
    if (!current) open(FILES[0].file);
  }

  async function open(file) {
    if (current && area.value !== current.original && !(await confirmDialog({ title: 'Discard changes?', text: `Your changes to ${current.file} are not saved.`, action: 'Discard', danger: true }))) return;
    const f = FILES.find((x) => x.file === file);
    area.disabled = true;
    $('#ed-title').textContent = f.file;
    $('#ed-sub').textContent = f.text;
    let text = f.live || '', saved = false, meta = 'Loaded from the website file.';
    try {
      const got = await api('configGet', { file });
      if (got.saved) { text = got.text; saved = true; meta = `Edited here · saved ${when(got.updatedAt)}${got.updatedBy ? ` by ${got.updatedBy}` : ''}`; }
    } catch (e) { meta = 'Could not reach the server; showing the live file.'; }
    if (!saved) { try { text = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
    current = { file, saved, original: text };
    area.value = text;
    area.disabled = false;
    $('#ed-meta').innerHTML = `<span class="pill ${saved ? 'acc' : ''}">${saved ? 'Edited here' : 'Website file'}</span> <span class="hint">${esc(meta)}</span>`;
    $('[data-reset]').hidden = !saved;
    document.querySelectorAll('[data-edit]').forEach((b) => b.classList.toggle('primary', b.dataset.edit === file));
    refresh();
    area.scrollTop = 0;
  }

  function refresh() {
    const lines = area.value.split('\n').length;
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    gutter.scrollTop = area.scrollTop;
    const c = check(area.value), dirty = current && area.value !== current.original;
    $('#ed').classList.toggle('invalid', !c.ok);
    $('[data-save]').disabled = !current || !c.ok || !dirty;
    $('[data-revert]').disabled = !dirty;
    $('[data-format]').disabled = !c.ok;
    $('#ed-status').className = 'ed-status ' + (c.ok ? 'ok' : 'bad');
    $('#ed-status').innerHTML = !current ? '' : c.ok
      ? `${icons.check}<span>Valid JSON · ${size(area.value.length)}${dirty ? ' · unsaved changes (Ctrl+S to save)' : ''}</span>`
      : `<span>✕ ${esc(c.error)}</span>${c.line ? ` <button class="linkbtn" type="button" data-line="${c.line}">Go to line ${c.line}</button>` : ''}`;
  }

  async function save() {
    if (!current || !check(area.value).ok || area.value === current.original) return;
    if (!(await confirmDialog({ title: `Save ${current.file}?`, text: 'The apps download the new version within a minute. A wrong value here can break app updates or payments, so double-check it.', action: 'Save' }))) return;
    $('[data-save]').disabled = true;
    try {
      await api('configSave', { file: current.file, text: area.value });
      toast(`${current.file} saved. It is live.`);
      const file = current.file; current = null; await files(); await open(file);
    } catch (e) { toast(e.message, 'bad'); refresh(); }
  }

  async function reset() {
    if (!current?.saved) return;
    if (!(await confirmDialog({ title: `Use the website file for ${current.file}?`, text: 'Your edited version is deleted; the apps get the file that is deployed with the website again.', action: 'Use website file', danger: true }))) return;
    try {
      await api('configReset', { file: current.file });
      toast('Back to the website file.');
      const file = current.file; current = null; await files(); await open(file);
    } catch (e) { toast(e.message, 'bad'); }
  }

  function goTo(line) {
    const all = area.value.split('\n'), at = all.slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0);
    area.focus(); area.selectionStart = at; area.selectionEnd = at + (all[line - 1] || '').length;
    area.scrollTop = Math.max(0, (line - 5) * 21);
  }

  area.addEventListener('input', refresh);
  area.addEventListener('scroll', () => { gutter.scrollTop = area.scrollTop; });
  area.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    if (e.key === 'Tab') { e.preventDefault(); area.setRangeText('  ', area.selectionStart, area.selectionEnd, 'end'); refresh(); }
  });
  window.addEventListener('beforeunload', (e) => { if (current && area.value !== current.original) e.preventDefault(); });

  async function gateway() {
    const start = performance.now();
    try { await api('whoami'); $('#gw').innerHTML = `<span class="pill ok">Online · ${Math.round(performance.now() - start)} ms</span>`; }
    catch (e) { $('#gw').innerHTML = `<span class="pill bad" title="${esc(e.message)}">Offline</span>`; }
  }

  main.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.edit) open(t.dataset.edit);
    if (t.dataset.line) goTo(Number(t.dataset.line));
    if (t.matches('[data-save]')) save();
    if (t.matches('[data-reset]')) reset();
    if (t.matches('[data-revert]') && current) { area.value = current.original; refresh(); }
    if (t.matches('[data-format]')) { try { area.value = JSON.stringify(JSON.parse(area.value), null, 2); refresh(); } catch {} }
    if (t.matches('[data-reload]')) { files(); gateway(); }
  });
  files(); gateway();
});
