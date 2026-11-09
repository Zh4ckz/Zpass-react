import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGateway } from '../src/gateway.js';
import { HttpError } from '../src/policy.js';

// In-memory database with the same interface as src/firestore.js.
function memoryDb() {
  const data = new Map();
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  const docsOf = (collection) => [...data].filter(([k]) => k.startsWith(collection + '/') && k.split('/').length === collection.split('/').length + 1);
  const match = (doc, [field, op, value]) => (op === '==' ? doc[field] === value : op === '>=' ? doc[field] >= value : false);
  return {
    data,
    async get(path) { return clone(data.get(path)) ?? null; },
    async update(path, partial) { if (!data.has(path)) throw Error('missing'); data.set(path, { ...data.get(path), ...clone(partial) }); },
    async query(collection, { where = [], orderBy, limit = Infinity } = {}) {
      let rows = docsOf(collection).filter(([, d]) => where.every((w) => match(d, w)));
      if (orderBy) rows.sort(([, a], [, b]) => (a[orderBy[0]] > b[orderBy[0]] ? 1 : -1) * (orderBy[1] === 'desc' ? -1 : 1));
      return rows.slice(0, limit).map(([path, d]) => ({ id: path.split('/').at(-1), path, data: clone(d) }));
    },
    async count(collection, where = []) { return (await this.query(collection, { where })).length; },
    async transaction(fn) {
      const writes = [];
      const tx = {
        get: async (p) => clone(data.get(p)) ?? null,
        create: (p, v) => { if (data.has(p)) throw Error('exists'); writes.push([p, clone(v)]); },
        set: (p, v) => writes.push([p, clone(v)]),
        update: (p, v) => { if (!data.has(p)) throw Error('missing'); writes.push([p, { ...data.get(p), ...clone(v) }]); },
        delete: (p) => writes.push([p, undefined]),
      };
      const result = await fn(tx);
      for (const [p, v] of writes) (v === undefined ? data.delete(p) : data.set(p, v));
      return result;
    },
    async deleteTree(path) { for (const k of [...data.keys()]) if (k === path || k.startsWith(path + '/')) data.delete(k); },
  };
}

const USERS = {
  owner: { uid: 'owner', email_verified: true },
  attacker: { uid: 'attacker', email_verified: true },
  stranger: { uid: 'stranger', email_verified: true },
  boss: { uid: 'boss', admin: true },
  claimed: { uid: 'claimed', admin: true },
  fake: { uid: 'fake', email: 'support@zpas.org', email_verified: true },
};

function fixture({ requireAppCheck = true } = {}) {
  const db = memoryDb();
  const handle = createGateway({
    db,
    verifyUser: async (t) => { if (!USERS[t]) throw new HttpError(401, 'Sign in required'); return USERS[t]; },
    verifyAppCheck: async (t) => t === 'check',
    requireAppCheck,
  });
  async function call(path, body = {}, token = 'owner', check = 'check', method = 'POST', origin = '') {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (check) headers['x-firebase-appcheck'] = check;
    if (origin) headers.origin = origin;
    const res = await handle(new Request('https://botapi.zpas.org' + path, { method, headers, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }));
    const text = await res.text();
    return { status: res.status, headers: res.headers, ...(text ? JSON.parse(text) : {}) };
  }
  return { call, handle, data: db.data };
}
const REQ = '12345678-1234-1234-1234-123456789abc';

test('management requires a signed-in user and a valid App Check token', async () => {
  const { call } = fixture();
  assert.equal((await call('/manage/list', {}, '')).status, 401);
  assert.equal((await call('/manage/list', {}, 'owner', '')).status, 403);
  assert.equal((await call('/manage/list', {}, 'owner', 'forged')).status, 403);
  assert.equal((await call('/manage/list')).ok, true);
  // Soft mode: missing App Check is accepted, a forged one is still rejected.
  const soft = fixture({ requireAppCheck: false });
  assert.equal((await soft.call('/manage/list', {}, 'owner', '')).ok, true);
  assert.equal((await soft.call('/manage/list', {}, 'owner', 'forged')).status, 403);
});

test('create, uniqueness, ownership and token rotation', async () => {
  const { call, data } = fixture();
  const created = await call('/manage/create', { name: 'Example', username: 'examplebot' });
  assert.equal(created.ok, true);
  const { id, token } = created.result;
  assert.equal(JSON.stringify([...data.values()]).includes(token), false);
  assert.equal((await call('/manage/create', { name: 'Again', username: 'examplebot' })).status, 409);
  assert.equal((await call('/manage/rotate', { id }, 'attacker')).status, 403);
  assert.equal((await call('/getMe', {}, token)).result.username, 'examplebot');
  const rotated = await call('/manage/rotate', { id });
  assert.equal((await call('/getMe', {}, token)).status, 401);
  assert.equal((await call('/api/getMe', {}, rotated.result.token)).ok, true);
  assert.equal((await call(`/bot${rotated.result.token}/getMe`, {}, '', '', 'GET')).ok, true);
});

test('user message becomes an update; retries deduplicate; bot replies only after start', async () => {
  const { call } = fixture();
  const { result: bot } = await call('/manage/create', { name: 'Example', username: 'examplebot' });
  assert.equal((await call('/sendMessage', { chat_id: 'owner', text: 'spam' }, bot.token)).status, 403);
  const input = { username: 'examplebot', text: '/start', requestId: REQ };
  assert.equal((await call('/manage/send', input)).ok, true);
  assert.equal((await call('/manage/send', input)).ok, true);
  const updates = await call('/getUpdates', {}, bot.token);
  assert.equal(updates.result.length, 1);
  assert.equal(updates.result[0].message.text, '/start');
  assert.equal((await call('/getUpdates', { offset: 2 }, bot.token)).result.length, 0);
  assert.equal((await call('/sendMessage', { chat_id: 'owner', text: 'Hello' }, bot.token)).ok, true);
});

test('bots are isolated; unknown methods are explicit', async () => {
  const { call } = fixture();
  const { result: a } = await call('/manage/create', { name: 'First', username: 'firstbot' });
  const { result: b } = await call('/manage/create', { name: 'Second', username: 'secondbot' });
  await call('/manage/send', { username: a.username, text: 'hello', requestId: REQ });
  assert.equal((await call('/getUpdates', {}, b.token)).result.length, 0);
  assert.equal((await call('/sendMessage', { chat_id: 'owner', text: 'Hello' }, b.token)).status, 403);
  assert.equal((await call('/setWebhook', {}, a.token)).status, 501);
});

test('profile edits require ownership and never leak credentials', async () => {
  const { call, data } = fixture();
  const { result: bot } = await call('/manage/create', { name: 'Example', username: 'examplebot' });
  assert.equal((await call('/manage/edit', { id: bot.id, field: 'name', value: 'Stolen' }, 'attacker')).status, 403);
  assert.equal((await call('/manage/edit', { id: bot.id, field: 'tokenHash', value: 'x' })).status, 400);
  assert.equal((await call('/manage/edit', { id: bot.id, field: 'name', value: 'New name' })).ok, true);
  const profile = data.get(`chat_profiles/bot_${bot.id}`);
  assert.equal(profile.displayName, 'New name');
  assert.equal(profile.tokenHash, undefined);
  assert.equal((await call('/manage/edit', { id: bot.id, field: 'commands', value: 'start - Start\nhelp - Help' })).ok, true);
});

test('commands, menu button, mini app and public info', async () => {
  const { call } = fixture();
  const { result: bot } = await call('/manage/create', { name: 'Example', username: 'examplebot' });
  const commands = [{ command: '/start', description: 'Start' }, { command: 'help', description: 'Help' }];
  assert.deepEqual((await call('/manage/setCommands', { id: bot.id, commands })).result.commands.map((c) => c.command), ['start', 'help']);
  assert.equal((await call('/manage/setCommands', { id: bot.id, commands: [{ command: 'Bad Cmd', description: 'x' }] })).status, 400);
  assert.equal((await call('/manage/setCommands', { id: bot.id, commands: [{ command: 'a', description: 'x' }, { command: 'a', description: 'y' }] })).status, 400);
  assert.equal((await call('/manage/setCommands', { id: bot.id, commands }, 'attacker')).status, 403);
  assert.equal((await call('/manage/setMenu', { id: bot.id, type: 'web_app', text: 'Open', url: 'http://insecure.example' })).status, 400);
  assert.equal((await call('/manage/setMenu', { id: bot.id, type: 'web_app', text: 'Open', url: 'https://user:pw@example.com' })).status, 400);
  assert.equal((await call('/manage/setMenu', { id: bot.id, type: 'web_app', text: 'Open', url: 'https://app.example.com/' })).ok, true);
  const info = (await call('/manage/info', { username: 'examplebot' }, 'stranger')).result;
  assert.equal(info.menuButton.url, 'https://app.example.com/');
  assert.equal(info.commands.length, 2);
  assert.equal(info.owner, undefined);
  assert.equal(JSON.stringify(info).includes('tokenHash'), false);
  assert.equal((await call('/getChatMenuButton', {}, bot.token)).result.web_app.url, 'https://app.example.com/');
  assert.equal((await call('/setChatMenuButton', { menu_button: { type: 'commands' } }, bot.token)).ok, true);
  assert.equal((await call('/getChatMenuButton', {}, bot.token)).result.type, 'commands');
  assert.equal((await call('/setMyCommands', { commands: [{ command: 'ping', description: 'Ping' }] }, bot.token)).ok, true);
  assert.deepEqual((await call('/getMyCommands', {}, bot.token)).result, [{ command: 'ping', description: 'Ping' }]);
  assert.equal((await call('/deleteMyCommands', {}, bot.token)).ok, true);
  assert.equal((await call('/getMyCommands', {}, bot.token)).result.length, 0);
});

test('owner delete removes bot, username, profile and conversations', async () => {
  const { call, data } = fixture();
  const { result: bot } = await call('/manage/create', { name: 'Example', username: 'examplebot' });
  await call('/manage/send', { username: 'examplebot', text: '/start', requestId: REQ });
  assert.equal((await call('/manage/delete', { id: bot.id }, 'attacker')).status, 403);
  assert.equal((await call('/manage/delete', { id: bot.id })).ok, true);
  assert.equal([...data.keys()].some((k) => k.includes(bot.id) || k === 'chat_usernames/examplebot'), false);
  assert.equal(data.get('zp_bot_owners/owner').count, 0);
  assert.equal((await call('/getMe', {}, bot.token)).status, 401);
  assert.equal((await call('/manage/create', { name: 'Again', username: 'examplebot' })).ok, true);
});

test('admin routes require real admin rights', async () => {
  const { call } = fixture();
  const { result: bot } = await call('/manage/create', { name: 'Example', username: 'examplebot' });
  assert.equal((await call('/admin/bots', {}, '')).status, 401);
  assert.equal((await call('/admin/bots', {}, 'owner')).status, 403);
  assert.equal((await call('/admin/bots', {}, 'fake')).status, 403);
  assert.equal((await call('/admin/bots', {}, 'boss', '')).result.length, 1);
  assert.equal((await call('/admin/bots', { query: '@examplebot' }, 'claimed', '')).result[0].owner, 'owner');
  assert.equal((await call('/admin/stats', {}, 'boss', '')).result.bots, 1);
  assert.equal((await call('/admin/setCommands', { id: bot.id, commands: [{ command: 'start', description: 'Start' }] }, 'boss', '')).ok, true);
  assert.equal((await call('/admin/disable', { id: bot.id, disabled: true }, 'boss', '')).result.disabled, true);
  assert.equal((await call('/getMe', {}, bot.token)).status, 403);
  assert.equal((await call('/manage/edit', { id: bot.id, field: 'name', value: 'Back' })).status, 403);
  assert.equal((await call('/admin/delete', { id: bot.id }, 'boss', '')).ok, true);
  assert.equal((await call('/admin/bots', {}, 'boss', '')).result.length, 0);
});

test('admin CORS only for zpas.org admin pages', async () => {
  const { call } = fixture();
  assert.equal((await call('/admin/bots', {}, 'boss', '', 'OPTIONS', 'https://bots.zpas.org')).status, 204);
  assert.equal((await call('/admin/bots', {}, 'boss', '', 'POST', 'https://evil.example')).headers.get('access-control-allow-origin'), null);
  assert.equal((await call('/admin/bots', {}, 'boss', '', 'POST', 'https://core.zpas.org')).headers.get('access-control-allow-origin'), 'https://core.zpas.org');
});

test('form-encoded Bot API requests work', async () => {
  const { call, handle } = fixture();
  const { result: bot } = await call('/manage/create', { name: 'Example', username: 'examplebot' });
  const res = await handle(new Request('https://botapi.zpas.org/setMyCommands', {
    method: 'POST', headers: { authorization: `Bearer ${bot.token}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ commands: JSON.stringify([{ command: 'start', description: 'Start' }]) }),
  }));
  assert.equal(res.status, 200);
  assert.equal((await call('/getMyCommands', {}, bot.token)).result[0].command, 'start');
});

// ---------- sendDocument: relay only, one download, then gone ----------
function memoryKv() {
  const map = new Map();
  return {
    map,
    async put(k, v, opts) { map.set(k, { value: new Uint8Array(v).buffer.slice(0), metadata: opts?.metadata, ttl: opts?.expirationTtl }); },
    async getWithMetadata(k) { const r = map.get(k); return r ? { value: r.value, metadata: r.metadata } : { value: null, metadata: null }; },
    async delete(k) { map.delete(k); },
  };
}

test('sendDocument relays a file to @username once and deletes it after download', async () => {
  const db = memoryDb(), files = memoryKv();
  const handle = createGateway({ db, files, verifyUser: async (t) => { if (!USERS[t]) throw new HttpError(401, 'Sign in required'); return USERS[t]; }, verifyAppCheck: async (t) => t === 'check' });
  const json = async (path, body, token, check = 'check') => {
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-firebase-appcheck': check };
    const res = await handle(new Request('https://botapi.zpas.org' + path, { method: 'POST', headers, body: JSON.stringify(body) }));
    return { status: res.status, ...(await res.json()) };
  };
  const bot = (await json('/manage/create', { name: 'Files', username: 'files_bot' }, 'owner')).result;
  db.data.set('chat_usernames/rezan', { uid: 'owner' });
  db.data.set('chat_usernames/somegroup', { uid: 'owner', gid: 'g1' });
  const sendDoc = async (chat, content = 'bot çalışıyor', name = 'metin.txt') => {
    const form = new FormData();
    form.set('chat_id', chat);
    form.set('caption', 'Test');
    form.set('document', new Blob([content], { type: 'text/plain' }), name);
    const res = await handle(new Request(`https://botapi.zpas.org/bot${bot.token}/sendDocument`, { method: 'POST', body: form }));
    return { status: res.status, ...(await res.json()) };
  };
  assert.equal((await sendDoc('@rezan')).status, 403, 'user must start the bot first');
  await json('/manage/send', { username: 'files_bot', text: '/start', requestId: REQ }, 'owner');
  assert.equal((await sendDoc('@somegroup')).status, 400, 'groups are not people');
  assert.equal((await sendDoc('@files_bot')).status, 400, 'bots are not people');
  const sent = await sendDoc('@rezan');
  assert.equal(sent.ok, true);
  const doc = sent.result.document;
  assert.equal(doc.file_name, 'metin.txt');
  assert.equal(doc.file_size, Buffer.byteLength('bot çalışıyor'));
  assert.equal(files.map.get(doc.file_id).ttl, 86400);
  assert.equal((await sendDoc('@rezan', new Uint8Array(5 * 1024 * 1024 + 1))).status, 413);
  // a stranger cannot take the file
  const steal = await handle(new Request('https://botapi.zpas.org/manage/file', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer attacker' }, body: JSON.stringify({ file_id: doc.file_id }) }));
  assert.equal(steal.status, 404);
  const get = () => handle(new Request('https://botapi.zpas.org/manage/file', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ file_id: doc.file_id }) }));
  const first = await get();
  assert.equal(first.status, 200);
  assert.equal(await first.text(), 'bot çalışıyor');
  assert.match(first.headers.get('content-disposition'), /metin\.txt/);
  assert.equal((await get()).status, 404, 'deleted after the first download');
  assert.equal(files.map.size, 0);
});

// ---------- inline keyboards (Telegram format) ----------
test('inline keyboard: send, press, getUpdates, answerCallbackQuery, edit', async () => {
  const db = memoryDb();
  const handle = createGateway({ db, verifyUser: async (t) => { if (!USERS[t]) throw new HttpError(401, 'Sign in required'); return USERS[t]; }, verifyAppCheck: async (t) => t === 'check' });
  const api = async (path, body, token) => {
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-firebase-appcheck': 'check' };
    const res = await handle(new Request('https://botapi.zpas.org' + path, { method: 'POST', headers, body: JSON.stringify(body) }));
    return { status: res.status, ...(await res.json()) };
  };
  const bot = (await api('/manage/create', { name: 'Keys', username: 'keys_bot' }, 'owner')).result;
  db.data.set('chat_usernames/rezan', { uid: 'owner' });
  await api('/manage/send', { username: 'keys_bot', text: '/start', requestId: REQ }, 'owner');
  const kb = { inline_keyboard: [[{ text: 'Yeni bot', callback_data: 'new' }, { text: 'Botlarım', callback_data: 'mine' }], [{ text: 'Docs', url: 'https://docs.zpas.org/' }]] };
  // validation
  assert.equal((await api('/sendMessage', { chat_id: '@rezan', text: 'x', reply_markup: { inline_keyboard: [[{ text: 'a' }]] } }, bot.token)).status, 400);
  assert.equal((await api('/sendMessage', { chat_id: '@rezan', text: 'x', reply_markup: { inline_keyboard: [[{ text: 'a', url: 'http://x' }]] } }, bot.token)).status, 400);
  assert.equal((await api('/sendMessage', { chat_id: '@rezan', text: 'x', reply_markup: { inline_keyboard: [[1, 2, 3, 4, 5].map((n) => ({ text: 'b' + n, callback_data: 'd' + n }))] } }, bot.token)).status, 400);
  const sent = await api('/sendMessage', { chat_id: '@rezan', text: 'Merhaba!', reply_markup: kb }, bot.token);
  assert.equal(sent.ok, true);
  assert.deepEqual(sent.result.reply_markup, kb);
  // reply_markup may also arrive as a JSON string (form posts)
  assert.equal((await api('/sendMessage', { chat_id: '@rezan', text: 'str', reply_markup: JSON.stringify(kb) }, bot.token)).ok, true);
  const mid = sent.result.message_id;
  // pressing an unknown button is refused, a real one creates a callback_query update
  assert.equal((await api('/manage/press', { username: 'keys_bot', message_id: mid, data: 'nope' }, 'owner')).status, 404);
  const press = await api('/manage/press', { username: 'keys_bot', message_id: mid, data: 'mine' }, 'owner');
  assert.equal(press.ok, true);
  const updates = (await api('/getUpdates', {}, bot.token)).result;
  const cbq = updates.find((u) => u.callback_query)?.callback_query;
  assert.equal(cbq.data, 'mine');
  assert.equal(cbq.message.message_id, mid);
  assert.equal(cbq.from.id, 'owner');
  // answer shows a toast in the app
  assert.equal((await api('/answerCallbackQuery', { callback_query_id: cbq.id, text: 'Done' }, bot.token)).ok, true);
  assert.deepEqual((await api('/manage/callback', { callback_query_id: cbq.id }, 'owner')).result, { answered: true, text: 'Done', show_alert: false });
  assert.equal((await api('/manage/callback', { callback_query_id: cbq.id }, 'attacker')).status, 404);
  // edit text and remove the keyboard
  assert.equal((await api('/editMessageText', { chat_id: '@rezan', message_id: mid, text: 'Your bots: none' }, bot.token)).ok, true);
  assert.equal((await api('/editMessageReplyMarkup', { chat_id: '@rezan', message_id: mid }, bot.token)).ok, true);
  const stored = db.data.get(`zp_bot_threads/${bot.id}_owner/messages/${mid}`);
  assert.equal(stored.text, 'Your bots: none');
  assert.deepEqual(stored.reply_markup, { inline_keyboard: [] });
  assert.equal((await api('/manage/press', { username: 'keys_bot', message_id: mid, data: 'mine' }, 'owner')).status, 404, 'removed buttons cannot be pressed');
});

test('seen records the request address on the caller\'s own device only', async () => {
  const db = memoryDb();
  const handle = createGateway({ db, verifyUser: async (t) => { if (!USERS[t]) throw new HttpError(401, 'Sign in required'); return USERS[t]; }, verifyAppCheck: async (t) => t === 'check' });
  db.data.set('users/owner', { email: 'o@x' });
  db.data.set('users/owner/devices/dev123456', { deviceName: 'Pixel' });
  const call = (body, token = 'owner') => handle(new Request('https://botapi.zpas.org/manage/seen', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-firebase-appcheck': 'check', 'cf-connecting-ip': '1.2.3.4' }, body: JSON.stringify(body) })).then((r) => r.json().then((j) => ({ status: r.status, ...j })));
  assert.equal((await call({ deviceId: 'dev123456', platform: 'ANDROID' })).ok, true);
  assert.equal(db.data.get('users/owner/devices/dev123456').lastIp, '1.2.3.4');
  assert.equal(db.data.get('users/owner').lastIp, '1.2.3.4');
  assert.equal((await call({ deviceId: 'dev123456' }, 'attacker')).status, 404, 'cannot write someone else\'s device');
  assert.equal((await call({ deviceId: '../x' })).status, 400);
});
