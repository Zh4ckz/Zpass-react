// core.zpas.org: administrator overview of the Z Pass system.
import { startAdmin, topBar, icons, esc, $, toast } from './admin-gate.mjs';

const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const LOCAL_PAGES = { bots: '/subdomain/bots/index.html', api: '/subdomain/api/index.html' };
const link = (key) => (local ? `${LOCAL_PAGES[key]}${location.search}` : `https://${key}.zpas.org/`);
const json = async (url) => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');
const ago = (iso) => {
  const t = Date.parse(iso || '');
  if (!t) return '—';
  const d = Math.round((Date.now() - t) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

startAdmin((main, { api, email }) => {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  main.innerHTML = `${topBar(`${hello}`, `Signed in as ${email || 'administrator'}. Here is how Z Pass is doing.`,
    `<button class="btn" type="button" data-reload>${icons.refresh}<span>Refresh</span></button>`)}
    <div class="grid stats" id="stats"></div>
    <div class="grid two" style="margin-top:16px">
      <section class="card"><div class="card-head"><div><h2>${icons.app} App versions</h2><p class="sub">From the public update files the apps read.</p></div></div><div id="versions"><div class="loading"><span class="spin"></span></div></div></section>
      <section class="card"><div class="card-head"><div><h2>${icons.check} Service status</h2><p class="sub">Live checks from this browser.</p></div></div><div id="health"><div class="loading"><span class="spin"></span></div></div></section>
    </div>
    <section class="card" style="margin-top:16px"><h2>Shortcuts</h2><p class="sub">Admin tools and public pages.</p>
      <div class="grid stats">
        ${[['bots', 'bot', 'Bots', 'Commands, menu, mini apps'], ['api', 'api', 'API & config', 'Public JSON the apps read']].map(([k, i, t, s]) => `<a class="card stat" href="${link(k)}" style="box-shadow:none"><div class="label"><i>${icons[i]}</i>${t}</div><div class="foot" style="margin-top:8px">${s} →</div></a>`).join('')}
        <a class="card stat" href="https://docs.zpas.org/" target="_blank" rel="noopener" style="box-shadow:none"><div class="label"><i>${icons.docs}</i>Docs</div><div class="foot" style="margin-top:8px">Bot API, MTProto, TL schema ↗</div></a>
        <a class="card stat" href="https://web.zpas.org/" target="_blank" rel="noopener" style="box-shadow:none"><div class="label"><i>${icons.web}</i>PassGram Web</div><div class="foot" style="margin-top:8px">web.zpas.org ↗</div></a>
      </div></section>`;

  async function stats() {
    const box = $('#stats');
    const tile = (icon, label, value, foot) => `<div class="card stat"><div class="label"><i>${icons[icon]}</i>${label}</div><div class="value">${value}</div><div class="foot">${foot}</div></div>`;
    box.innerHTML = tile('users', 'Accounts', '…', 'Chat profiles') + tile('bot', 'Bots', '…', '') + tile('chat', 'Bot chats', '…', '') + tile('ban', 'Disabled bots', '…', '');
    try {
      const s = await api('stats');
      box.innerHTML = tile('users', 'Accounts', fmt(s.profiles), 'Chat profiles, bots included')
        + tile('bot', 'Bots', fmt(s.bots), `${fmt(s.bots - s.disabledBots)} active`)
        + tile('chat', 'Bot chats', fmt(s.botChats), 'People who started a bot')
        + tile('ban', 'Disabled bots', fmt(s.disabledBots), 'Turned off by an admin');
    } catch (e) { toast(e.message, 'bad'); box.innerHTML = tile('ban', 'Stats unavailable', '—', esc(e.message)); }
  }

  async function versions() {
    const box = $('#versions');
    try {
      const [v, r] = await Promise.all([json('/api/zpass-version.json'), json('/api/app-releases.json')]);
      const rows = Object.entries(r.platforms || {}).map(([name, p]) => `<tr><td><b style="text-transform:capitalize">${esc(name)}</b></td><td>${esc(p.version || '—')}</td><td>${p.published ? '<span class="pill ok">Published</span>' : '<span class="pill">Hidden</span>'}</td><td>${ago(p.releasedAt)}</td></tr>`).join('');
      box.innerHTML = `<div class="table-wrap"><table class="table"><tr><th>Platform</th><th>Version</th><th>State</th><th>Released</th></tr>${rows}</table></div>
        <dl class="kv" style="margin-top:14px"><dt>Latest code</dt><dd>${esc(v.latestVersionName)} (${esc(v.latestVersionCode)})</dd>
        <dt>Minimum supported</dt><dd>${esc(v.minimumSupportedVersionCode)}</dd>
        <dt>Force update</dt><dd>${v.forceUpdate ? '<span class="pill warn">On</span>' : '<span class="pill plain">Off</span>'}</dd>
        <dt>Maintenance</dt><dd>${v.maintenanceMode ? '<span class="pill bad">On</span>' : '<span class="pill ok">Off</span>'}</dd></dl>`;
    } catch (e) { box.innerHTML = `<div class="empty"><b>Could not read version files</b>${esc(e.message)}</div>`; }
  }

  async function health() {
    const box = $('#health');
    const check = async (label, fn) => {
      const start = performance.now();
      try { await fn(); return { label, ok: true, ms: Math.round(performance.now() - start) }; } catch (e) { return { label, ok: false, note: e.message }; }
    };
    const rows = await Promise.all([
      check('Admin API (zbotGateway)', () => api('whoami')),
      check('Update file', () => json('/api/zpass-version.json')),
      check('Release file', () => json('/api/app-releases.json')),
      check('Payment config', () => json('/api/payment-config.json')),
    ]);
    box.innerHTML = `<div class="table-wrap"><table class="table">${rows.map((r) => `<tr><td>${esc(r.label)}</td><td style="text-align:right">${r.ok ? `<span class="pill ok">OK · ${r.ms} ms</span>` : `<span class="pill bad" title="${esc(r.note)}">Failing</span>`}</td></tr>`).join('')}</table></div>`;
  }

  const refresh = () => { stats(); versions(); health(); };
  main.addEventListener('click', (e) => { if (e.target.closest('[data-reload]')) refresh(); });
  refresh();
});
