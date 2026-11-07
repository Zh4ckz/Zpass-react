// bots.zpas.org: manage every Z Pass bot (administrators only).
import { startAdmin, topBar, icons, esc, $, $$, toast, confirmDialog } from './admin-gate.mjs';

const initials = (bot) => (bot.name || bot.username || '?').trim().slice(0, 1).toUpperCase();
const when = (ms) => (ms ? new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const COMMAND = /^[a-z][a-z0-9_]{0,31}$/;

startAdmin((main, { api }) => {
  const state = { bots: [], id: '', tab: 'profile', query: '', loading: true, commands: [] };
  const current = () => state.bots.find((b) => b.id === state.id);

  main.innerHTML = `${topBar('Bots', 'Every bot on Z Pass: profile, commands, menu button and mini app.',
    `<button class="btn" type="button" data-reload>${icons.refresh}<span>Refresh</span></button>`)}
    <div class="grid stats" id="bot-stats"></div>
    <div class="bots-layout" style="margin-top:16px">
      <section class="card list-card">
        <form class="search" data-search><span>${icons.search}</span><input class="input" type="search" placeholder="Search @username or bot ID" aria-label="Search bots"></form>
        <div class="bot-list" id="bot-list"></div>
      </section>
      <section class="card" id="bot-detail"></section>
    </div>`;

  async function load(query = state.query) {
    state.loading = true; state.query = query; renderList();
    try {
      state.bots = await api('bots', { query });
      if (!state.bots.some((b) => b.id === state.id)) state.id = state.bots[0]?.id || '';
    } catch (e) { toast(e.message, 'bad'); state.bots = []; }
    state.loading = false;
    renderStats(); renderList(); renderDetail();
  }

  function renderStats() {
    const total = state.bots.length, off = state.bots.filter((b) => b.disabled).length;
    const apps = state.bots.filter((b) => b.menuButton?.type === 'web_app').length;
    const cmds = state.bots.reduce((n, b) => n + (b.commands?.length || 0), 0);
    const tile = (icon, label, value, foot) => `<div class="card stat"><div class="label"><i>${icons[icon]}</i>${label}</div><div class="value">${value}</div><div class="foot">${foot}</div></div>`;
    $('#bot-stats').innerHTML = tile('bot', 'Bots', total, state.query ? 'Search result' : 'Newest 200')
      + tile('check', 'Active', total - off, `${off} disabled`)
      + tile('chat', 'Commands', cmds, 'Across all bots')
      + tile('app', 'Mini apps', apps, 'Menu opens a web app');
  }

  function renderList() {
    const list = $('#bot-list');
    if (state.loading) { list.innerHTML = '<div class="loading"><span class="spin"></span>Loading bots…</div>'; return; }
    if (!state.bots.length) { list.innerHTML = `<div class="empty">${icons.bot}<b>No bots found</b>${state.query ? 'Try another username or ID.' : 'Bots created in the app appear here.'}</div>`; return; }
    list.innerHTML = state.bots.map((b) => `<button class="bot-item${b.id === state.id ? ' on' : ''}" type="button" data-pick="${esc(b.id)}">
      <span class="bot-av${b.disabled ? ' off' : ''}">${esc(initials(b))}</span>
      <div><b>${esc(b.name)}</b><small>@${esc(b.username)} · ${b.commands?.length || 0} command${b.commands?.length === 1 ? "" : "s"}</small></div>
      ${b.disabled ? '<span class="pill bad">Off</span>' : ''}</button>`).join('');
  }

  function renderDetail() {
    const box = $('#bot-detail'), bot = current();
    if (state.loading) { box.innerHTML = '<div class="loading"><span class="spin"></span></div>'; return; }
    if (!bot) { box.innerHTML = `<div class="empty">${icons.bot}<b>Select a bot</b>Choose a bot on the left to manage it.</div>`; return; }
    state.commands = (bot.commands || []).map((c) => ({ ...c }));
    const tab = (key, label) => `<button class="tab${state.tab === key ? ' on' : ''}" type="button" data-tab="${key}">${label}</button>`;
    box.innerHTML = `<div class="detail-head">
        <span class="bot-av lg${bot.disabled ? ' off' : ''}">${esc(initials(bot))}</span>
        <div class="who"><h2>${esc(bot.name)}</h2>
          <div class="meta"><span>@${esc(bot.username)}</span>${bot.disabled ? '<span class="pill bad">Disabled</span>' : '<span class="pill ok">Active</span>'}
          <span>Created ${when(bot.createdAt)}</span><span title="Owner account">Owner <code>${esc(bot.owner)}</code></span></div></div>
        <div class="actions">
          <button class="btn" type="button" data-toggle>${icons.power}${bot.disabled ? 'Enable' : 'Disable'}</button>
          <button class="btn danger" type="button" data-delete>${icons.trash}Delete</button></div>
      </div>
      <div class="tabs" role="tablist">${tab('profile', 'Profile')}${tab('commands', `Commands · ${bot.commands?.length || 0}`)}${tab('menu', 'Menu & mini app')}${tab('api', 'Bot API')}</div>
      <div id="tab-body"></div>`;
    renderTab();
  }

  function renderTab() {
    const body = $('#tab-body'), bot = current();
    if (!bot || !body) return;
    if (state.tab === 'profile') {
      body.innerHTML = `<form class="form" data-profile>
        <label class="field"><span>Name</span><input class="input" name="name" maxlength="64" value="${esc(bot.name)}" required></label>
        <label class="field"><span>About · shown on the bot profile</span><input class="input" name="about" maxlength="120" value="${esc(bot.about)}"><small class="hint">Up to 120 characters.</small></label>
        <label class="field"><span>Description · shown in an empty chat ("What can this bot do?")</span><textarea class="textarea" name="description" maxlength="512">${esc(bot.description)}</textarea><small class="hint">Up to 512 characters.</small></label>
        <div class="form-actions"><button class="btn primary" type="submit">Save profile</button></div></form>`;
      return;
    }
    if (state.tab === 'commands') {
      body.innerHTML = `<p class="sub">Commands appear in the <code>/</code> menu of the chat. Lowercase letters, digits and <code>_</code>, up to 32 characters. Up to 100 commands.</p>
        <div class="cmd-list" id="cmd-list"></div>
        <div class="form-actions" style="margin-top:14px;justify-content:space-between">
          <button class="btn" type="button" data-add>${icons.plus}Add command</button>
          <button class="btn primary" type="button" data-save-commands>Save commands</button></div>`;
      renderCommands();
      return;
    }
    if (state.tab === 'menu') {
      const menu = bot.menuButton || { type: 'commands' };
      const option = (value, title, text) => `<label><input type="radio" name="type" value="${value}" ${menu.type === value ? 'checked' : ''}><b>${title}</b><small>${text}</small></label>`;
      body.innerHTML = `<div class="grid menu-grid"><form class="form" data-menu>
          <div class="field"><span>Button next to the message box</span><div class="choice">
            ${option('commands', 'Command list', 'Opens the / menu')}
            ${option('web_app', 'Mini app', 'Opens a web page')}
            ${option('default', 'None', 'No button')}</div></div>
          <div class="form" data-webapp ${menu.type === 'web_app' ? '' : 'hidden'}>
            <label class="field"><span>Button text</span><input class="input" name="text" maxlength="32" value="${esc(menu.text || 'Open app')}"></label>
            <label class="field"><span>Mini app URL</span><input class="input mono" name="url" type="url" placeholder="https://example.com/app" value="${esc(menu.url || '')}"><small class="hint">HTTPS only. The page opens inside the chat.</small></label>
          </div>
          <div class="form-actions"><button class="btn primary" type="submit">Save menu</button></div>
        </form><div id="phone"></div></div>`;
      renderPhone();
      return;
    }
    const base = 'https://botapi.zpas.org';
    body.innerHTML = `<p class="sub">The bot program uses its private token. Tokens are never shown here: the owner gets it once in Zbot and can replace it there.</p>
      <pre class="code">${esc(`# Check the token
curl ${base}/getMe -H "Authorization: Bearer $TOKEN"

# Read messages users sent to @${bot.username}
curl "${base}/getUpdates?offset=0&limit=50" -H "Authorization: Bearer $TOKEN"

# Reply
curl -X POST ${base}/sendMessage -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"chat_id":"USER_ID","text":"Hello"}'

# Commands and menu button from code
curl -X POST ${base}/setMyCommands -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" -d '{"commands":[{"command":"start","description":"Start"}]}'
curl -X POST ${base}/setChatMenuButton -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"menu_button":{"type":"web_app","text":"Open","web_app":{"url":"https://example.com"}}}'`)}</pre>
      <dl class="kv" style="margin-top:16px"><dt>Bot ID</dt><dd><code>${esc(bot.id)}</code></dd><dt>Username</dt><dd>@${esc(bot.username)}</dd><dt>Docs</dt><dd><a href="https://docs.zpas.org/" target="_blank" rel="noopener">docs.zpas.org ↗</a></dd></dl>`;
  }

  function renderCommands() {
    const list = $('#cmd-list');
    if (!list) return;
    if (!state.commands.length) { list.innerHTML = '<div class="cmd-empty">No commands yet. Add the first one, for example <code>start</code>.</div>'; return; }
    list.innerHTML = state.commands.map((c, i) => `<div class="cmd-row">
      <span class="slash">/</span>
      <input class="input cmd-name" data-i="${i}" data-k="command" value="${esc(c.command)}" placeholder="command" maxlength="32" aria-label="Command">
      <input class="input cmd-desc" data-i="${i}" data-k="description" value="${esc(c.description)}" placeholder="What it does" maxlength="100" aria-label="Description">
      <button class="btn icon danger" type="button" data-remove="${i}" title="Remove" aria-label="Remove command">${icons.trash}</button></div>`).join('');
  }

  function renderPhone() {
    const bot = current(), box = $('#phone'), form = $('[data-menu]');
    if (!bot || !box || !form) return;
    const type = form.type.value, text = form.text.value.trim() || 'Open app';
    const cmds = (bot.commands || []).slice(0, 4);
    box.innerHTML = `<div class="phone"><div class="phone-screen">
      <div class="phone-top"><span class="bot-av">${esc(initials(bot))}</span><div><b>${esc(bot.name)}</b><small>bot</small></div></div>
      <div class="phone-body"><div class="bubble">${esc(bot.description || 'What can this bot do?')}</div>
        ${type === 'commands' && cmds.length ? `<div class="cmd-pop">${cmds.map((c) => `<div><b>/${esc(c.command)}</b>${esc(c.description)}</div>`).join('')}</div>` : ''}</div>
      <div class="phone-bar">${type === 'web_app' ? `<span class="menu-btn">${icons.app}${esc(text)}</span>` : type === 'commands' ? '<span class="menu-btn cmds">/</span>' : ''}<span class="phone-input">Message</span></div>
    </div></div>`;
  }

  // Applies a change to the cached bot and repaints.
  function patch(id, changes) {
    const bot = state.bots.find((b) => b.id === id);
    if (bot) Object.assign(bot, changes);
    renderStats(); renderList();
  }

  async function busy(button, fn) {
    if (button) button.disabled = true;
    try { await fn(); } catch (e) { toast(e.message, 'bad'); } finally { if (button) button.disabled = false; }
  }

  main.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const bot = current();
    if (t.matches('[data-reload]')) return load();
    if (t.dataset.pick) { state.id = t.dataset.pick; renderList(); renderDetail(); return; }
    if (t.dataset.tab) { state.tab = t.dataset.tab; $$('.tab', main).forEach((b) => b.classList.toggle('on', b === t)); renderTab(); return; }
    if (!bot) return;
    if (t.matches('[data-add]')) {
      if (state.commands.length >= 100) return toast('Up to 100 commands are allowed.', 'bad');
      state.commands.push({ command: '', description: '' }); renderCommands();
      $$('#cmd-list .cmd-name').at(-1)?.focus();
      return;
    }
    if (t.dataset.remove) { state.commands.splice(Number(t.dataset.remove), 1); renderCommands(); return; }
    if (t.matches('[data-save-commands]')) {
      const commands = state.commands.map((c) => ({ command: c.command.trim().replace(/^\//, '').toLowerCase(), description: c.description.trim() })).filter((c) => c.command || c.description);
      const bad = commands.find((c) => !COMMAND.test(c.command) || !c.description);
      if (bad) return toast(bad.command && COMMAND.test(bad.command) ? `Add a description for /${bad.command}.` : `"${bad.command || '(empty)'}" is not a valid command.`, 'bad');
      return busy(t, async () => {
        const result = await api('setCommands', { id: bot.id, commands });
        patch(bot.id, { commands: result.commands });
        $(`[data-tab="commands"]`).textContent = `Commands · ${result.commands.length}`;
        state.commands = result.commands.map((c) => ({ ...c })); renderCommands();
        toast('Commands saved.');
      });
    }
    if (t.matches('[data-toggle]')) {
      const disabled = !bot.disabled;
      if (disabled && !(await confirmDialog({ title: `Disable @${bot.username}?`, text: 'The bot stops receiving and sending messages until you enable it again. The owner cannot edit it.', action: 'Disable', danger: true }))) return;
      return busy(t, async () => { await api('disable', { id: bot.id, disabled }); patch(bot.id, { disabled }); renderDetail(); toast(disabled ? 'Bot disabled.' : 'Bot enabled.'); });
    }
    if (t.matches('[data-delete]')) {
      const ok = await confirmDialog({ title: `Delete @${bot.username}?`, text: 'This removes the bot, its username, commands and all its conversations. This cannot be undone.', action: 'Delete forever', danger: true, typed: bot.username });
      if (!ok) return;
      return busy(t, async () => {
        await api('delete', { id: bot.id });
        state.bots = state.bots.filter((b) => b.id !== bot.id);
        state.id = state.bots[0]?.id || '';
        renderStats(); renderList(); renderDetail();
        toast(`@${bot.username} deleted.`);
      });
    }
  });

  main.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.k) { state.commands[Number(el.dataset.i)][el.dataset.k] = el.value; return; }
    const form = el.closest('[data-menu]');
    if (form) { $('[data-webapp]', form).hidden = form.type.value !== 'web_app'; renderPhone(); }
  });

  main.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target, bot = current(), button = $('button[type="submit"]', form);
    if (form.matches('[data-search]')) return load($('input', form).value.trim());
    if (!bot) return;
    if (form.matches('[data-profile]')) {
      const changed = ['name', 'about', 'description'].filter((f) => form[f].value.trim() !== (bot[f] || ''));
      if (!changed.length) return toast('Nothing to save.');
      if (changed.some((f) => !form[f].value.trim())) return toast('Fields cannot be emptied; type a new value.', 'bad');
      return busy(button, async () => {
        for (const field of changed) await api('edit', { id: bot.id, field, value: form[field].value.trim() });
        patch(bot.id, Object.fromEntries(changed.map((f) => [f, form[f].value.trim()])));
        $('.detail-head h2').textContent = current().name;
        toast('Profile saved.');
      });
    }
    if (form.matches('[data-menu]')) {
      const type = form.type.value;
      const body = type === 'web_app' ? { id: bot.id, type, text: form.text.value.trim(), url: form.url.value.trim() } : { id: bot.id, type };
      return busy(button, async () => { const r = await api('setMenu', body); patch(bot.id, { menuButton: r.menuButton }); toast('Menu saved.'); });
    }
  });

  load('');
});
