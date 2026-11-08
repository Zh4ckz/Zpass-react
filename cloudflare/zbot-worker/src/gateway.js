// Z Pass bot gateway.
//   /manage/<method>   app users (Firebase ID token) manage their own bots
//   /admin/<method>    administrators manage every bot (bots / core / api.zpas.org)
//   /<method>, /api/<method>, /bot<token>/<method>   Bot API for bot programs ("Authorization: Bearer <token>")
// Files (sendDocument) are relayed only: the bytes wait in KV (ZBOT_FILES) until the recipient downloads them once,
// or at most 24 hours, then they are gone. Nothing is kept on the server after that.
// Bot conversations are server-readable by design; private end-to-end encrypted chats are not touched.
import * as policy from './policy.js';

const { fail, HttpError } = policy;
const ADMIN_ORIGINS = new Set(['https://bots.zpas.org', 'https://core.zpas.org', 'https://api.zpas.org']);
const BOT_ID = /^[a-f0-9]{24}$/;
const TEXT_LIMITS = { name: 64, description: 512, about: 120 };
const MAX_BODY = 16384;
export const MAX_FILE = 5 * 1024 * 1024;   // 5 MB per file
const FILE_TTL = 86400;                    // seconds a file waits for its recipient
const FILE_ID = /^[a-f0-9]{48}$/;
const CALLBACK_ID = /^[a-f0-9]{24}$/;

// Telegram-compatible inline keyboard: { inline_keyboard: [[{ text, callback_data } | { text, url }], ...] }
// Limits: 10 rows, 4 buttons per row, 30 buttons; text 1–64 chars; callback_data 1–64 bytes; url https:// up to 512.
export function inlineKeyboard(markup) {
  if (markup == null || markup === '') return null;
  let value = markup;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { fail(400, 'reply_markup must be JSON'); } }
  const rows = value?.inline_keyboard;
  if (!Array.isArray(rows) || !rows.length || rows.length > 10) fail(400, 'inline_keyboard must have 1–10 rows');
  let total = 0;
  const out = rows.map((row) => {
    if (!Array.isArray(row) || !row.length || row.length > 4) fail(400, 'Each keyboard row needs 1–4 buttons');
    return row.map((b) => {
      total++;
      const text = String(b?.text ?? '').trim();
      if (!text || text.length > 64) fail(400, 'Button text must be 1–64 characters');
      const hasData = b.callback_data != null, hasUrl = b.url != null;
      if (hasData === hasUrl) fail(400, 'Each button needs exactly one of callback_data or url');
      if (hasData) {
        const data = String(b.callback_data);
        if (!data || new TextEncoder().encode(data).length > 64) fail(400, 'callback_data must be 1–64 bytes');
        return { text, callback_data: data };
      }
      const url = String(b.url);
      if (!/^https:\/\/[^\s]{1,500}$/.test(url)) fail(400, 'Button url must start with https://');
      return { text, url };
    });
  });
  if (total > 30) fail(400, 'At most 30 buttons per keyboard');
  return { inline_keyboard: out };
}

const botId = (value) => { const id = String(value || ''); if (!BOT_ID.test(id)) fail(400, 'Invalid bot'); return id; };
const millis = (value) => (value instanceof Date ? value.getTime() : typeof value === 'number' ? value : null);
const commandList = (bot) => (Array.isArray(bot.commands) ? bot.commands : bot.commands ? policy.commands(bot.commands) : []);
const publicView = (id, bot) => ({
  id, username: bot.username, name: bot.name, description: bot.description || '', about: bot.about || '',
  commands: commandList(bot), menuButton: bot.menuButton || { type: 'commands' }, disabled: !!bot.disabled,
});
const ownerView = (id, bot) => ({ ...publicView(id, bot), owner: bot.owner, createdAt: millis(bot.createdAt) });

// Best-effort limit per Worker instance: 120 requests per minute per key.
const hits = new Map();
function rateLimit(key, limit = 120) {
  const minute = Math.floor(Date.now() / 60000), row = hits.get(key);
  const count = row?.minute === minute ? row.count + 1 : 1;
  hits.set(key, { minute, count });
  if (hits.size > 5000) for (const [k, v] of hits) if (v.minute !== minute) hits.delete(k);
  if (count > limit) fail(429, 'Too many requests; retry in one minute');
}

export function createGateway({ db, files = null, verifyUser, verifyAppCheck, requireAppCheck = false }) {
  // chat_id may be a user id or "@username" (people only, never bots or groups).
  async function recipient(chatId) {
    const raw = String(chatId ?? '').trim();
    if (raw.startsWith('@')) {
      const name = policy.username(raw);
      const row = await db.get(`chat_usernames/${name}`);
      if (!row?.uid || row.gid || row.botId) fail(400, 'Unknown user');
      return row.uid;
    }
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(raw)) fail(400, 'Invalid chat_id');
    return raw;
  }

  async function editable(tx, id, caller) {
    const path = `zp_bots/${id}`, bot = await tx.get(path);
    if (!bot) fail(404, 'Bot not found');
    if (!caller.admin && bot.owner !== caller.uid) fail(403, 'Not your bot');
    if (!caller.admin && bot.disabled) fail(403, 'This bot was disabled by an administrator');
    return { path, bot };
  }

  async function setCommands(caller, body) {
    const id = botId(body.id), list = policy.commands(body.commands ?? []);
    await db.transaction(async (tx) => { const { path } = await editable(tx, id, caller); tx.update(path, { commands: list }); });
    return { commands: list };
  }

  async function setMenu(caller, body) {
    const id = botId(body.id), menu = policy.menuButton(body.menuButton || body);
    await db.transaction(async (tx) => { const { path } = await editable(tx, id, caller); tx.update(path, { menuButton: menu }); });
    return { menuButton: menu };
  }

  async function editBot(caller, body) {
    const id = botId(body.id), field = String(body.field || '');
    if (field === 'commands') return setCommands(caller, { id, commands: body.value });
    const value = String(body.value || '').trim();
    if (!Object.hasOwn(TEXT_LIMITS, field) || !value || value.length > TEXT_LIMITS[field]) fail(400, 'Invalid bot setting');
    await db.transaction(async (tx) => {
      const { path, bot } = await editable(tx, id, caller);
      tx.update(path, { [field]: value });
      if (field === 'name') tx.set(`chat_profiles/bot_${id}`, { username: bot.username, displayName: value, isBot: true, botId: id, verified: false });
    });
    return { updated: true };
  }

  async function deleteBot(caller, body) {
    const id = botId(body.id);
    let bot;
    await db.transaction(async (tx) => {
      const found = await editable(tx, id, caller);
      bot = found.bot;
      const quota = await tx.get(`zp_bot_owners/${bot.owner}`);
      const name = await tx.get(`chat_usernames/${bot.username}`);
      tx.delete(`chat_profiles/bot_${id}`);
      if (name?.botId === id) tx.delete(`chat_usernames/${bot.username}`);
      tx.set(`zp_bot_owners/${bot.owner}`, { count: Math.max(0, (quota?.count || 1) - 1) });
    });
    await db.deleteTree(`zp_bots/${id}`);
    for (const thread of await db.query('zp_bot_threads', { where: [['botId', '==', id]], limit: 100 })) await db.deleteTree(thread.path);
    return { deleted: true, username: bot.username };
  }

  async function identity(request) {
    return verifyUser((request.headers.get('authorization') || '').replace(/^Bearer /, ''));
  }

  async function handleAdmin(request, method, body) {
    const user = await identity(request);
    if (!policy.isAdminIdentity(user)) fail(403, 'You are not authorized');
    rateLimit(`admin_${user.uid}`, 300);
    const caller = { uid: user.uid, admin: true };
    switch (method) {
      case 'whoami': return { uid: user.uid, email: user.email, admin: true };
      case 'stats': {
        const [bots, disabled, chats, profiles] = await Promise.all([
          db.count('zp_bots'), db.count('zp_bots', [['disabled', '==', true]]), db.count('zp_bot_threads'), db.count('chat_profiles'),
        ]);
        return { bots, disabledBots: disabled, botChats: chats, profiles };
      }
      case 'bots': {
        const query = String(body.query || '').trim().toLowerCase().replace(/^@/, '');
        if (!query) return (await db.query('zp_bots', { orderBy: ['createdAt', 'desc'], limit: 200 })).map((d) => ownerView(d.id, d.data));
        let id = BOT_ID.test(query) ? query : null;
        if (!id && /^[a-z0-9_]{1,32}$/.test(query)) id = (await db.get(`chat_usernames/${query}`))?.botId;
        const bot = id && await db.get(`zp_bots/${id}`);
        return bot ? [ownerView(id, bot)] : [];
      }
      case 'get': { const id = botId(body.id), bot = await db.get(`zp_bots/${id}`); if (!bot) fail(404, 'Bot not found'); return ownerView(id, bot); }
      case 'disable': {
        const id = botId(body.id), disabled = body.disabled === true;
        await db.transaction(async (tx) => { const { path } = await editable(tx, id, caller); tx.update(path, { disabled }); });
        return { disabled };
      }
      case 'edit': return editBot(caller, body);
      case 'setCommands': return setCommands(caller, body);
      case 'setMenu': return setMenu(caller, body);
      case 'delete': return deleteBot(caller, body);
      default: fail(404, 'Unknown admin method');
    }
  }

  async function handleManage(request, method, body) {
    if (request.method !== 'POST') fail(405, 'Management requires POST');
    const user = await identity(request);
    if (!user.email_verified && !user.phone_number) fail(403, 'Verified account required');
    const appCheck = request.headers.get('x-firebase-appcheck');
    if (appCheck ? !(await verifyAppCheck(appCheck)) : requireAppCheck) fail(403, 'App Check required');
    rateLimit(`owner_${user.uid}`);
    const owner = user.uid, caller = { uid: owner, admin: false };
    switch (method) {
      case 'whoami': return { admin: policy.isAdminIdentity(user) };
      case 'list': return (await db.query('zp_bots', { where: [['owner', '==', owner]], limit: 20 })).map((d) => ownerView(d.id, d.data));
      case 'info': {
        const id = (await db.get(`chat_usernames/${policy.username(body.username)}`))?.botId;
        const bot = id && await db.get(`zp_bots/${id}`);
        if (!bot) fail(404, 'Bot not found');
        return publicView(id, bot);
      }
      case 'create': {
        const username = policy.username(body.username), name = String(body.name || '').trim();
        if (!name || name.length > 64) fail(400, 'Name must be 1–64 characters');
        const { id, token, hash } = await policy.tokenPair();
        await db.transaction(async (tx) => {
          const quota = await tx.get(`zp_bot_owners/${owner}`);
          if (await tx.get(`chat_usernames/${username}`)) fail(409, 'Username already taken');
          if ((quota?.count || 0) >= 20) fail(429, 'Bot limit reached');
          tx.create(`chat_usernames/${username}`, { uid: `bot_${id}`, botId: id });
          tx.create(`zp_bots/${id}`, { owner, username, name, tokenHash: hash, sequence: 0, commands: [], menuButton: { type: 'commands' }, createdAt: new Date() });
          tx.create(`chat_profiles/bot_${id}`, { username, displayName: name, isBot: true, botId: id, verified: false });
          tx.set(`zp_bot_owners/${owner}`, { count: (quota?.count || 0) + 1 });
        });
        return { id, username, name, token };
      }
      case 'rotate': {
        const id = botId(body.id), { token, hash } = await policy.tokenPair(id);
        await db.transaction(async (tx) => { const { path } = await editable(tx, id, caller); tx.update(path, { tokenHash: hash }); });
        return { token };
      }
      case 'edit': return editBot(caller, body);
      case 'setCommands': return setCommands(caller, body);
      case 'setMenu': return setMenu(caller, body);
      case 'delete': return deleteBot(caller, body);
      case 'send': {
        const username = policy.username(body.username);
        const id = (await db.get(`chat_usernames/${username}`))?.botId;
        if (!id) fail(404, 'Bot not found');
        const text = String(body.text || '').trim();
        if (!text || text.length > 4096) fail(400, 'Text must be 1–4096 characters');
        const nonce = String(body.requestId || '');
        if (!/^[a-f0-9-]{36}$/.test(nonce)) fail(400, 'Request ID required');
        const thread = `zp_bot_threads/${id}_${owner}`;
        return db.transaction(async (tx) => {
          const bot = await tx.get(`zp_bots/${id}`), old = await tx.get(`${thread}/messages/${nonce}`);
          if (!bot) fail(404, 'Bot not found');
          if (bot.disabled) fail(403, 'Bot disabled');
          if (old) return old;
          const sequence = (bot.sequence || 0) + 1;
          const message = { message_id: sequence, text, sender: owner, createdAt: Date.now(), chat: { id: owner, type: 'private' } };
          tx.update(`zp_bots/${id}`, { sequence });
          tx.set(thread, { owner, botId: id, username, name: bot.name, lastMessage: text.slice(0, 120), lastAt: message.createdAt });
          tx.create(`${thread}/messages/${nonce}`, message);
          tx.create(`zp_bots/${id}/updates/${String(sequence).padStart(16, '0')}`, { update_id: sequence, message, expiresAt: new Date(Date.now() + 86400000) });
          return message;
        });
      }
      case 'press': {
        const username = policy.username(body.username);
        const id = (await db.get(`chat_usernames/${username}`))?.botId;
        if (!id) fail(404, 'Bot not found');
        const mid = String(body.message_id || ''), data = String(body.data || '');
        if (!/^[a-f0-9]{24}$/.test(mid) || !data || data.length > 64) fail(400, 'Invalid button');
        const thread = `zp_bot_threads/${id}_${owner}`;
        const cbid = policy.randomId();
        return db.transaction(async (tx) => {
          const bot = await tx.get(`zp_bots/${id}`), msg = await tx.get(`${thread}/messages/${mid}`);
          if (!bot) fail(404, 'Bot not found');
          if (bot.disabled) fail(403, 'Bot disabled');
          const buttons = (msg?.reply_markup?.inline_keyboard || []).flat();
          if (!msg || msg.sender !== `bot_${id}` || !buttons.some((b) => b.callback_data === data)) fail(404, 'This button is no longer available');
          const sequence = (bot.sequence || 0) + 1;
          const callback_query = { id: cbid, from: { id: owner }, message: { message_id: mid, text: msg.text || '', chat: { id: owner, type: 'private' } }, data };
          tx.update(`zp_bots/${id}`, { sequence });
          tx.create(`zp_bot_callbacks/${cbid}`, { botId: id, owner, messageId: mid, answered: false, createdAt: Date.now(), expiresAt: new Date(Date.now() + 3600000) });
          tx.create(`zp_bots/${id}/updates/${String(sequence).padStart(16, '0')}`, { update_id: sequence, callback_query, expiresAt: new Date(Date.now() + 86400000) });
          return { callback_query_id: cbid };
        });
      }
      case 'callback': {
        const cb = String(body.callback_query_id || '');
        if (!CALLBACK_ID.test(cb)) fail(400, 'Invalid callback_query_id');
        const row = await db.get(`zp_bot_callbacks/${cb}`);
        if (!row || row.owner !== owner) fail(404, 'Not found');
        return { answered: !!row.answered, text: row.text || '', show_alert: !!row.show_alert };
      }
      default: fail(404, 'Unknown management method');
    }
  }

  async function handleBot(request, path, method, body) {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '') || (path[0]?.startsWith('bot') ? decodeURIComponent(path[0].slice(3)) : '');
    if (!/^[a-f0-9]{24}:[A-Za-z0-9_-]{43}$/.test(token)) fail(401, 'Invalid token');
    const id = token.split(':')[0], botPath = `zp_bots/${id}`;
    const bot = await db.get(botPath);
    if (!bot || !(await policy.tokenMatches(token, bot.tokenHash))) fail(401, 'Invalid token');
    if (bot.disabled) fail(403, 'Bot disabled');
    rateLimit(`bot_${id}`);
    switch (method) {
      case 'getMe': return { id, is_bot: true, first_name: bot.name, username: bot.username };
      case 'getMyCommands': return commandList(bot);
      case 'setMyCommands': await db.update(botPath, { commands: policy.commands(body.commands ?? []) }); return true;
      case 'deleteMyCommands': await db.update(botPath, { commands: [] }); return true;
      case 'getChatMenuButton': {
        const menu = bot.menuButton || { type: 'commands' };
        return menu.type === 'web_app' ? { type: 'web_app', text: menu.text, web_app: { url: menu.url } } : menu;
      }
      case 'setChatMenuButton': await db.update(botPath, { menuButton: policy.menuButton(body.menu_button ?? { type: 'default' }) }); return true;
      case 'getUpdates': {
        const offset = Number(body.offset || 0), limit = Number(body.limit || 100);
        if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail(400, 'Invalid offset or limit');
        const rows = await db.query(`${botPath}/updates`, { where: [['update_id', '>=', offset]], orderBy: ['update_id', 'asc'], limit });
        return rows.map((r) => r.data).filter((u) => millis(u.expiresAt) > Date.now()).map(({ expiresAt, ...update }) => update);
      }
      case 'sendMessage': {
        const uid = await recipient(body.chat_id), text = String(body.text || '').trim();
        if (!text || text.length > 4096) fail(400, 'Invalid chat or text');
        if (body.parse_mode) fail(400, 'Formatting not yet supported');
        const markup = inlineKeyboard(body.reply_markup);
        const thread = `zp_bot_threads/${id}_${uid}`, messageId = policy.randomId();
        const message = { text, sender: `bot_${id}`, createdAt: Date.now(), chat: { id: uid, type: 'private' }, ...(markup ? { reply_markup: markup } : {}) };
        await db.transaction(async (tx) => {
          if (!(await tx.get(thread))) fail(403, 'User must start this bot first');
          tx.create(`${thread}/messages/${messageId}`, message);
          tx.update(thread, { lastMessage: text.slice(0, 120), lastAt: message.createdAt });
        });
        return { ...message, message_id: messageId };
      }
      case 'editMessageText':
      case 'editMessageReplyMarkup': {
        const uid = await recipient(body.chat_id);
        const mid = String(body.message_id || '');
        if (!/^[a-f0-9]{24}$/.test(mid)) fail(400, 'Invalid message_id');
        const path = `zp_bot_threads/${id}_${uid}/messages/${mid}`;
        const update = {};
        if (method === 'editMessageText') {
          const text = String(body.text || '').trim();
          if (!text || text.length > 4096) fail(400, 'Text must be 1–4096 characters');
          update.text = text; update.editedAt = Date.now();
        }
        const markup = body.reply_markup === undefined && method === 'editMessageText' ? undefined : inlineKeyboard(body.reply_markup);
        if (markup !== undefined) update.reply_markup = markup || { inline_keyboard: [] };
        await db.transaction(async (tx) => {
          const old = await tx.get(path);
          if (!old || old.sender !== `bot_${id}`) fail(404, 'Message not found');
          tx.update(path, update);
        });
        return true;
      }
      case 'answerCallbackQuery': {
        const cb = String(body.callback_query_id || '');
        if (!CALLBACK_ID.test(cb)) fail(400, 'Invalid callback_query_id');
        const text = String(body.text || '').slice(0, 200);
        const row = await db.get(`zp_bot_callbacks/${cb}`);
        if (!row || row.botId !== id) fail(404, 'Callback query not found or expired');
        await db.update(`zp_bot_callbacks/${cb}`, { answered: true, text, show_alert: body.show_alert === true || body.show_alert === 'true', answeredAt: Date.now() });
        return true;
      }
      case 'sendDocument': {
        if (!files) fail(503, 'File relay unavailable');
        const doc = body.document;
        if (!doc || typeof doc.arrayBuffer !== 'function') fail(400, 'Send the file as multipart/form-data field "document"');
        const bytes = new Uint8Array(await doc.arrayBuffer());
        if (!bytes.length) fail(400, 'Empty file');
        if (bytes.length > MAX_FILE) fail(413, 'File too large (max 5 MB)');
        const uid = await recipient(body.chat_id);
        const caption = String(body.caption || '').trim();
        if (caption.length > 1024) fail(400, 'Caption too long');
        const fileName = (String(doc.name || 'file').replace(/[\\/\u0000-\u001f]/g, '_').trim() || 'file').slice(0, 128);
        const mime = /^[\w.+-]+\/[\w.+-]+$/.test(doc.type || '') ? doc.type : 'application/octet-stream';
        const thread = `zp_bot_threads/${id}_${uid}`, messageId = policy.randomId();
        if (!(await db.get(thread))) fail(403, 'User must start this bot first');
        const fileId = policy.randomId() + policy.randomId();
        const expiresAt = Date.now() + FILE_TTL * 1000;
        await files.put(fileId, bytes, { expirationTtl: FILE_TTL, metadata: { uid, botId: id, name: fileName, mime } });
        const document = { file_id: fileId, file_name: fileName, mime_type: mime, file_size: bytes.length, expiresAt };
        const message = { text: caption, document, sender: `bot_${id}`, createdAt: Date.now(), chat: { id: uid, type: 'private' } };
        try {
          await db.transaction(async (tx) => {
            if (!(await tx.get(thread))) fail(403, 'User must start this bot first');
            tx.create(`${thread}/messages/${messageId}`, message);
            tx.update(thread, { lastMessage: `\ud83d\udcc4 ${fileName}`.slice(0, 120), lastAt: message.createdAt });
          });
        } catch (e) { await files.delete(fileId); throw e; }
        return { ...message, message_id: messageId };
      }
      default: fail(501, 'Method not implemented');
    }
  }

  // Recipient downloads a relayed file once; the bytes are deleted right after.
  async function downloadFile(request, body) {
    if (!files) fail(503, 'File relay unavailable');
    const user = await identity(request);
    const fileId = String(body.file_id || '');
    if (!FILE_ID.test(fileId)) fail(400, 'Invalid file');
    rateLimit(`file_${user.uid}`, 60);
    const found = await files.getWithMetadata(fileId, { type: 'arrayBuffer' });
    if (!found?.value || found.metadata?.uid !== user.uid) fail(404, 'File expired or already downloaded');
    await files.delete(fileId);
    const name = encodeURIComponent(found.metadata.name || 'file');
    return new Response(found.value, { status: 200, headers: {
      'Content-Type': found.metadata.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${name}`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  }

  async function readBody(request, url) {
    if (request.method === 'GET') return Object.fromEntries(url.searchParams);
    if ((request.headers.get('content-type') || '').includes('multipart/form-data')) {
      if (Number(request.headers.get('content-length') || 0) > MAX_FILE + 65536) fail(413, 'File too large (max 5 MB)');
      const form = await request.formData(), out = {};
      for (const [k, v] of form) out[k] = v;
      return out;
    }
    const text = await request.text();
    if (text.length > MAX_BODY) fail(413, 'Request too large');
    if (!text) return {};
    if ((request.headers.get('content-type') || '').includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
    try { const value = JSON.parse(text); return value && typeof value === 'object' ? value : {}; } catch { fail(400, 'Body must be JSON'); }
  }

  return async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);
    const origin = request.headers.get('origin') || '';
    const cors = path[0] === 'admin' && ADMIN_ORIGINS.has(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '3600' }
      : {};
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors } });
    if (request.method === 'OPTIONS' && cors['Access-Control-Allow-Origin']) return new Response(null, { status: 204, headers: cors });
    try {
      if (!path.length) return reply(200, { ok: true, result: { service: 'Z Pass Bot API', docs: 'https://docs.zpas.org/' } });
      if (!['GET', 'POST'].includes(request.method)) fail(405, 'GET or POST required');
      const body = await readBody(request, url), method = path.at(-1);
      let result;
      if (path[0] === 'admin') { if (request.method !== 'POST') fail(405, 'Admin requires POST'); result = await handleAdmin(request, method, body); }
      else if (path[0] === 'manage' && method === 'file') { if (request.method !== 'POST') fail(405, 'POST required'); return await downloadFile(request, body); }
      else if (path[0] === 'manage') result = await handleManage(request, method, body);
      else result = await handleBot(request, path, method, body);
      return reply(200, { ok: true, result });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error('zbot', e?.message);
      return reply(status, { ok: false, error_code: status, description: status === 500 ? 'Server error' : e.message });
    }
  };
}
