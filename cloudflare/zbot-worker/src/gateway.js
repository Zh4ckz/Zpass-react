// Z Pass bot gateway.
//   /manage/<method>   app users (Firebase ID token) manage their own bots and talk to them
//   /admin/<method>    administrators manage every bot (bots / core / api.zpas.org)
//   /bot<token>/<method>, /<method>, /api/<method>   Bot API for bot programs ("Authorization: Bearer <token>" also works)
//
// The Bot API speaks the same wire format as the common bot libraries expect (numeric ids, Unix dates,
// update objects, webhooks), so existing Python / JavaScript / PHP bot code works by changing the base address.
// Files are relayed only: uploaded bytes wait in KV (ZBOT_FILES) until the recipient downloads them once,
// or at most 24 hours, then they are gone. Larger files are sent as https links from the bot's own server.
// Bot conversations are server-readable by design; private end-to-end encrypted chats are not touched.
import * as policy from './policy.js';

const { fail, HttpError } = policy;
// api.zpas.org/api/<file>: the public JSON files the apps read. An admin can edit them in "API & config";
// a saved version (Firestore config/api_<name>) is served instead of the file in the website, until it is reset.
export const CONFIG_FILES = ['zpass-version.json', 'app-releases.json', 'payment-config.json', 'payment-target.json'];
const configPath = (file) => `config/api_${file.replace(/\.json$/, '')}`;
const MAX_CONFIG = 200 * 1024;

const ADMIN_ORIGINS = new Set(['https://bots.zpas.org', 'https://core.zpas.org', 'https://api.zpas.org']);
const BOT_ID = /^[a-f0-9]{24}$/;
const MSG_DOC = /^(?:[a-f0-9]{24}|[1-9]\d{0,15})$/;
const TEXT_LIMITS = { name: 64, description: 512, about: 120 };
const MAX_BODY = 65536;
export const MAX_FILE = 20 * 1024 * 1024;   // 20 MB per relayed upload; larger files go as https links
const FILE_TTL = 86400;                      // seconds a file waits for its recipient
const UPDATE_TTL = 86400000;                 // undelivered updates are kept for 24 hours
const FILE_ID = /^[a-f0-9]{48}$/;
const CALLBACK_ID = /^[a-f0-9]{24}$/;
const PARSE_MODES = new Set(['HTML', 'Markdown', 'MarkdownV2']);
const UPDATE_TYPES = new Set(['message', 'edited_message', 'callback_query']);
const CHAT_ACTIONS = new Set(['typing', 'upload_photo', 'record_video', 'upload_video', 'record_voice', 'upload_voice',
  'upload_document', 'choose_sticker', 'find_location', 'record_video_note', 'upload_video_note']);
const MEDIA = { sendPhoto: 'photo', sendVideo: 'video', sendAudio: 'audio', sendVoice: 'voice', sendAnimation: 'animation',
  sendDocument: 'document', sendSticker: 'sticker', sendVideoNote: 'video_note' };
const PREVIEW = { photo: '🖼 Photo', video: '🎬 Video', audio: '🎵 Audio', voice: '🎤 Voice message',
  animation: 'GIF', sticker: 'Sticker', video_note: '🎥 Video message' };
const BOT_METHODS = ['getMe', 'logOut', 'close', 'getUpdates', 'setWebhook', 'deleteWebhook', 'getWebhookInfo',
  'sendMessage', ...Object.keys(MEDIA), 'sendChatAction', 'editMessageText', 'editMessageCaption', 'editMessageReplyMarkup',
  'deleteMessage', 'deleteMessages', 'answerCallbackQuery', 'getChat', 'getMyCommands', 'setMyCommands', 'deleteMyCommands',
  'getChatMenuButton', 'setChatMenuButton', 'getMyName', 'setMyName', 'getMyDescription', 'setMyDescription',
  'getMyShortDescription', 'setMyShortDescription'];
// Method names are case-insensitive, as bot libraries sometimes send them lower-cased.
const CANONICAL = new Map(BOT_METHODS.map((m) => [m.toLowerCase(), m]));

const parseJson = (value, what) => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { fail(400, `Bad Request: ${what} must be JSON`); }
};
const flag = (v) => v === true || v === 'true' || v === 1 || v === '1';

// Inline keyboard: { inline_keyboard: [[{ text, callback_data } | { text, url }], ...] }
// Limits: 10 rows, 4 buttons per row, 30 buttons; text 1–64 chars; callback_data 1–64 bytes; url https:// up to 512.
export function inlineKeyboard(markup) {
  if (markup == null || markup === '') return null;
  const value = parseJson(markup, 'reply_markup');
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

// Reply keyboard shown in place of the phone keyboard: { keyboard: [["A", "B"], [{ text: "C" }]], resize_keyboard, ... }
function replyKeyboard(value) {
  const rows = value.keyboard;
  if (!Array.isArray(rows) || !rows.length || rows.length > 12) fail(400, 'keyboard must have 1–12 rows');
  let total = 0;
  const out = rows.map((row) => {
    if (!Array.isArray(row) || !row.length || row.length > 8) fail(400, 'Each keyboard row needs 1–8 buttons');
    return row.map((b) => {
      total++;
      const text = String(typeof b === 'string' ? b : b?.text ?? '').trim();
      if (!text || text.length > 64) fail(400, 'Button text must be 1–64 characters');
      return { text };
    });
  });
  if (total > 100) fail(400, 'At most 100 buttons per keyboard');
  return {
    rows: out, resize: flag(value.resize_keyboard), oneTime: flag(value.one_time_keyboard), persistent: flag(value.is_persistent),
    placeholder: String(value.input_field_placeholder || '').slice(0, 64),
  };
}

// Any reply_markup: inline buttons under the message, a reply keyboard, removing it, or a forced reply.
function markupOf(raw) {
  if (raw == null || raw === '') return {};
  const value = parseJson(raw, 'reply_markup');
  if (value?.inline_keyboard) return { inline: inlineKeyboard(value) };
  if (value?.keyboard) return { keyboard: replyKeyboard(value) };
  if (flag(value?.remove_keyboard)) return { removeKeyboard: true };
  if (flag(value?.force_reply)) return { forceReply: { placeholder: String(value.input_field_placeholder || '').slice(0, 64) } };
  fail(400, 'Bad Request: unsupported reply_markup');
}

// Firestore cannot store an array inside an array, so keyboard rows are stored as { buttons: [...] }.
const storeRows = (rows) => rows.map((buttons) => ({ buttons }));
const loadRows = (rows) => (Array.isArray(rows) ? rows.map((r) => (Array.isArray(r) ? r : r?.buttons || [])) : []);
const storedInline = (inline) => (inline ? { inline_keyboard: storeRows(inline.inline_keyboard) } : null);
const loadInline = (stored) => (stored?.inline_keyboard ? { inline_keyboard: loadRows(stored.inline_keyboard) } : null);
const storedKeyboard = (kb) => (kb ? { ...kb, rows: storeRows(kb.rows) } : null);

const botId = (value) => { const id = String(value || ''); if (!BOT_ID.test(id)) fail(400, 'Invalid bot'); return id; };
const millis = (value) => (value instanceof Date ? value.getTime() : typeof value === 'number' ? value : null);
const seconds = (ms) => Math.floor((ms || Date.now()) / 1000);
const commandList = (bot) => (Array.isArray(bot.commands) ? bot.commands : bot.commands ? policy.commands(bot.commands) : []);
const publicView = (id, bot) => ({
  id, num: bot.num || null, username: bot.username, name: bot.name, description: bot.description || '', about: bot.about || '',
  commands: commandList(bot), menuButton: bot.menuButton || { type: 'commands' }, disabled: !!bot.disabled,
});
const ownerView = (id, bot) => ({ ...publicView(id, bot), owner: bot.owner, createdAt: millis(bot.createdAt) });

// The people and chats a bot sees, built from the conversation (thread) record.
const botUser = (bot) => ({ id: bot.num || 0, is_bot: true, first_name: bot.name, username: bot.username });
const personOf = (t) => ({
  id: t.chatNum, is_bot: false, first_name: t.firstName || 'User',
  ...(t.userName ? { username: t.userName } : {}), ...(t.lang ? { language_code: t.lang } : {}),
});
const chatOf = (t) => ({ id: t.chatNum, type: 'private', first_name: t.firstName || 'User', ...(t.userName ? { username: t.userName } : {}) });

function mediaFields(media) {
  const file = { file_id: media.file_id, file_unique_id: media.file_id.slice(0, 16), ...(media.file_size ? { file_size: media.file_size } : {}) };
  const named = { ...file, ...(media.file_name ? { file_name: media.file_name } : {}), ...(media.mime_type ? { mime_type: media.mime_type } : {}) };
  switch (media.type) {
    case 'photo': return { photo: [{ ...file, width: 0, height: 0 }] };
    case 'video': case 'animation': return { [media.type]: { ...named, width: 0, height: 0, duration: 0 } };
    case 'audio': return { audio: { ...named, duration: 0 } };
    case 'voice': return { voice: { ...file, duration: 0, ...(media.mime_type ? { mime_type: media.mime_type } : {}) } };
    case 'video_note': return { video_note: { ...file, length: 0, duration: 0 } };
    case 'sticker': return { sticker: { ...file, type: 'regular', width: 0, height: 0, is_animated: false, is_video: false } };
    default: return { document: named };
  }
}

// A stored message (as the app reads it) turned into the message object bot libraries expect.
function tgMessage(m, bot, t) {
  const fromBot = String(m.sender || '').startsWith('bot_');
  const out = { message_id: m.message_id, from: fromBot ? botUser(bot) : personOf(t), chat: chatOf(t), date: seconds(m.createdAt) };
  if (m.editedAt) out.edit_date = seconds(m.editedAt);
  const media = m.media || (m.document ? { type: 'document', ...m.document } : null);
  if (media) { Object.assign(out, mediaFields(media)); if (m.text) out.caption = m.text; }
  else {
    out.text = m.text || '';
    const cmd = /^\/[A-Za-z0-9_]{1,32}(?:@[A-Za-z0-9_]{1,32})?/.exec(out.text);
    if (cmd) out.entities = [{ type: 'bot_command', offset: 0, length: cmd[0].length }];
  }
  const inline = loadInline(m.reply_markup);
  if (inline?.inline_keyboard.length) out.reply_markup = inline;
  return out;
}

// Best-effort limit per Worker instance: 120 requests per minute per key.
const hits = new Map();
function rateLimit(key, limit = 120) {
  const minute = Math.floor(Date.now() / 60000), row = hits.get(key);
  const count = row?.minute === minute ? row.count + 1 : 1;
  hits.set(key, { minute, count });
  if (hits.size > 5000) for (const [k, v] of hits) if (v.minute !== minute) hits.delete(k);
  if (count > limit) fail(429, 'Too Many Requests: retry after 60');
}

export function createGateway({ db, files = null, verifyUser, verifyAppCheck, requireAppCheck = false, fetcher = (...a) => globalThis.fetch(...a), pollStep = 8000 }) {
  // chat_id may be "@username" or an account id (people only, never bots or groups).
  async function recipient(chatId) {
    const raw = String(chatId ?? '').trim();
    if (raw.startsWith('@')) {
      const name = policy.username(raw);
      const row = await db.get(`chat_usernames/${name}`);
      if (!row?.uid || row.gid || row.botId) fail(400, 'Bad Request: chat not found');
      return row.uid;
    }
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(raw)) fail(400, 'Bad Request: invalid chat_id');
    return raw;
  }

  // Resolves chat_id (numeric id, "@username" or account id) to this bot's conversation with that person.
  async function target(id, chatId) {
    const raw = String(chatId ?? '').trim();
    if (/^\d{5,16}$/.test(raw)) {
      const rows = await db.query('zp_bot_threads', { where: [['botId', '==', id], ['chatNum', '==', Number(raw)]], limit: 1 });
      if (!rows.length) fail(400, 'Bad Request: chat not found');
      return { uid: rows[0].data.owner, thread: rows[0].path };
    }
    const uid = await recipient(raw);
    return { uid, thread: `zp_bot_threads/${id}_${uid}` };
  }

  // Gives a bot its public number the first time it needs one (bots made before numbers existed).
  async function ensureNum(tx, id, bot) {
    if (bot.num) return bot.num;
    for (let i = 0; i < 6; i++) {
      const num = policy.randomBotNumber();
      if (await tx.get(`zp_bot_nums/${num}`)) continue;
      tx.create(`zp_bot_nums/${num}`, { botId: id });
      tx.update(`zp_bots/${id}`, { num });
      return num;
    }
    throw Error('Could not assign a bot number');
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

  // Changing the name keeps the profile's verified badge and label (only the display name changes).
  async function renameProfile(tx, id, bot, name) {
    const profilePath = `chat_profiles/bot_${id}`, profile = await tx.get(profilePath);
    return () => (profile ? tx.update(profilePath, { displayName: name })
      : tx.set(profilePath, { username: bot.username, displayName: name, isBot: true, botId: id, verified: false }));
  }

  async function editBot(caller, body) {
    const id = botId(body.id), field = String(body.field || '');
    if (field === 'commands') return setCommands(caller, { id, commands: body.value });
    const value = String(body.value || '').trim();
    if (!Object.hasOwn(TEXT_LIMITS, field) || !value || value.length > TEXT_LIMITS[field]) fail(400, 'Invalid bot setting');
    await db.transaction(async (tx) => {
      const { path, bot } = await editable(tx, id, caller);
      const rename = field === 'name' ? await renameProfile(tx, id, bot, value) : null;
      tx.update(path, { [field]: value });
      rename?.();
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
      if (bot.num) tx.delete(`zp_bot_nums/${bot.num}`);
      tx.set(`zp_bot_owners/${bot.owner}`, { count: Math.max(0, (quota?.count || 1) - 1) });
    });
    await db.deleteTree(`zp_bots/${id}`);
    for (const thread of await db.query('zp_bot_threads', { where: [['botId', '==', id]], limit: 100 })) await db.deleteTree(thread.path);
    return { deleted: true, username: bot.username };
  }

  // "me" = the caller's own account; "@name" = one of the caller's bots. Nobody can apply for someone else.
  async function verifyTarget(owner, value) {
    const raw = String(value || '').trim();
    if (!raw || raw.toLowerCase() === 'me') {
      const profile = await db.get(`chat_profiles/${owner}`);
      if (!profile?.username) fail(400, 'Set a username in your profile first');
      return { key: owner, kind: 'account', username: profile.username };
    }
    const name = policy.username(raw);
    const id = (await db.get(`chat_usernames/${name}`))?.botId;
    const bot = id && await db.get(`zp_bots/${id}`);
    if (!bot || bot.owner !== owner) fail(403, 'You can only apply for your own account or your own bots');
    return { key: `bot_${id}`, kind: 'bot', username: bot.username };
  }
  function urlList(value, min, max, message) {
    const list = [...new Set((Array.isArray(value) ? value : []).map((v) => String(v).trim()).filter(Boolean))];
    if (list.length < min || list.length > max || list.some((u) => !/^https:\/\/[^\s]{4,300}$/.test(u))) fail(400, message);
    return list;
  }

  async function identity(request) {
    return verifyUser((request.headers.get('authorization') || '').replace(/^Bearer /, ''));
  }

  // ---------- webhooks ----------
  const wants = (bot, type) => !Array.isArray(bot.allowedUpdates) || !bot.allowedUpdates.length || bot.allowedUpdates.includes(type);

  async function deleteDocs(paths) {
    for (let i = 0; i < paths.length; i += 400) {
      const part = paths.slice(i, i + 400);
      await db.transaction(async (tx) => { for (const p of part) tx.delete(p); });
    }
  }

  async function dropUpdates(id, below = Infinity) {
    const where = Number.isFinite(below) ? [['update_id', '<', below]] : [];
    const rows = await db.query(`zp_bots/${id}/updates`, { where, limit: 300 });
    if (rows.length) await deleteDocs(rows.map((r) => r.path));
  }

  const updateOf = (row) => (row.json ? JSON.parse(row.json) : (({ expiresAt, ...u }) => u)(row));

  // Sends waiting updates to the bot's https address, oldest first. A 2xx answer removes the update; anything else
  // keeps it for the next attempt (the next update or the next setWebhook). The answer may itself be one method call.
  async function flush(id) {
    const bot = await db.get(`zp_bots/${id}`), hook = bot?.webhook;
    if (!hook?.url || bot.disabled) return;
    const rows = await db.query(`zp_bots/${id}/updates`, { orderBy: ['update_id', 'asc'], limit: 20 });
    for (const row of rows) {
      if (millis(row.data.expiresAt) <= Date.now()) { await deleteDocs([row.path]); continue; }
      let res;
      try {
        res = await fetcher(hook.url, {
          method: 'POST', body: JSON.stringify(updateOf(row.data)), signal: AbortSignal.timeout(10000),
          headers: { 'content-type': 'application/json', ...(hook.secret ? { 'X-Telegram-Bot-Api-Secret-Token': hook.secret, 'X-ZPass-Bot-Api-Secret-Token': hook.secret } : {}) },
        });
      } catch {
        await db.update(`zp_bots/${id}`, { webhookError: 'Connection failed', webhookErrorAt: Date.now() }).catch(() => {});
        return;
      }
      if (!res.ok) {
        await db.update(`zp_bots/${id}`, { webhookError: `Wrong response from the webhook: ${res.status}`, webhookErrorAt: Date.now() }).catch(() => {});
        return;
      }
      await deleteDocs([row.path]);
      if ((res.headers.get('content-type') || '').includes('json')) {
        const call = await res.json().catch(() => null);
        const method = call && typeof call.method === 'string' ? CANONICAL.get(call.method.toLowerCase()) : null;
        if (method && method !== 'getUpdates') await run({ id, bot, botPath: `zp_bots/${id}` }, method, call, () => {}).catch(() => {});
      }
    }
  }

  // ---------- admin ----------
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
        if (!id && /^\d{9,12}$/.test(query)) id = (await db.get(`zp_bot_nums/${query}`))?.botId;
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
      case 'configList': return Promise.all(CONFIG_FILES.map(async (file) => {
        const doc = await db.get(configPath(file));
        return { file, saved: !!doc, updatedAt: doc?.updatedAt || 0, updatedBy: doc?.updatedBy || '', size: doc ? String(doc.json || '').length : 0 };
      }));
      case 'configGet': {
        const file = configFile(body.file), doc = await db.get(configPath(file));
        return { file, saved: !!doc, text: doc ? String(doc.json || '') : null, updatedAt: doc?.updatedAt || 0, updatedBy: doc?.updatedBy || '' };
      }
      case 'configSave': {
        const file = configFile(body.file), text = String(body.text ?? '');
        if (text.length > MAX_CONFIG) fail(400, 'The file is too large (max 200 KB)');
        let parsed;
        try { parsed = JSON.parse(text); } catch (e) { fail(400, 'Not valid JSON: ' + e.message); }
        if (!parsed || typeof parsed !== 'object') fail(400, 'The file must be a JSON object or list');
        const updatedAt = Date.now();
        await db.transaction(async (tx) => { tx.set(configPath(file), { json: text, updatedAt, updatedBy: user.email || user.uid }); });
        return { file, saved: true, updatedAt };
      }
      case 'configReset': {
        const file = configFile(body.file);
        await db.transaction(async (tx) => { tx.delete(configPath(file)); });
        return { file, saved: false };
      }
      default: fail(404, 'Unknown admin method');
    }
  }

  function configFile(value) {
    const file = String(value || '');
    if (!CONFIG_FILES.includes(file)) fail(404, 'Unknown config file');
    return file;
  }

  // GET /config/<file>: the admin-saved version, or 404 so the caller serves the website's own file.
  async function savedConfig(path, request) {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=30', 'X-Content-Type-Options': 'nosniff' };
    const file = path[1] || '';
    if (request.method !== 'GET' || !CONFIG_FILES.includes(file)) return new Response(null, { status: 404, headers });
    const doc = await db.get(configPath(file));
    const text = doc ? String(doc.json || '') : '';
    try { JSON.parse(text); } catch { return new Response(null, { status: 404, headers }); }
    return new Response(text, { status: 200, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'X-Config-Source': 'admin' } });
  }

  // ---------- app users ----------
  async function handleManage(request, method, body, later) {
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
        const id = policy.randomId();
        return db.transaction(async (tx) => {
          const quota = await tx.get(`zp_bot_owners/${owner}`);
          if (await tx.get(`chat_usernames/${username}`)) fail(409, 'Username already taken');
          if ((quota?.count || 0) >= 20) fail(429, 'Bot limit reached');
          let num = 0;
          for (let i = 0; i < 6 && !num; i++) { const n = policy.randomBotNumber(); if (!(await tx.get(`zp_bot_nums/${n}`))) num = n; }
          if (!num) throw Error('Could not assign a bot number');
          const { token, hash } = await policy.tokenPair(String(num));
          tx.create(`zp_bot_nums/${num}`, { botId: id });
          tx.create(`chat_usernames/${username}`, { uid: `bot_${id}`, botId: id });
          tx.create(`zp_bots/${id}`, { owner, username, name, num, tokenHash: hash, sequence: 0, commands: [], menuButton: { type: 'commands' }, createdAt: new Date() });
          tx.create(`chat_profiles/bot_${id}`, { username, displayName: name, isBot: true, botId: id, verified: false });
          tx.set(`zp_bot_owners/${owner}`, { count: (quota?.count || 0) + 1 });
          return { id, num, username, name, token };
        });
      }
      case 'rotate': {
        const id = botId(body.id);
        return db.transaction(async (tx) => {
          const { path, bot } = await editable(tx, id, caller);
          const num = await ensureNum(tx, id, bot);
          const { token, hash } = await policy.tokenPair(String(num));
          tx.update(path, { tokenHash: hash });
          return { token };
        });
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
        const lang = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(String(body.lang || '')) ? String(body.lang) : '';
        const thread = `zp_bot_threads/${id}_${owner}`;
        const [profile, chatNum] = await Promise.all([db.get(`chat_profiles/${owner}`), policy.userNumber(owner)]);
        let hook = false;
        const message = await db.transaction(async (tx) => {
          const bot = await tx.get(`zp_bots/${id}`), old = await tx.get(`${thread}/messages/${nonce}`), t = await tx.get(thread);
          if (!bot) fail(404, 'Bot not found');
          if (bot.disabled) fail(403, 'Bot disabled');
          if (old) return old;
          const seq = (t?.seq || 0) + 1, sequence = (bot.sequence || 0) + 1, now = Date.now();
          const message = { message_id: seq, text, sender: owner, createdAt: now, chat: { id: owner, type: 'private' } };
          const next = {
            ...(t || {}), owner, botId: id, username, name: bot.name, chatNum,
            firstName: String(profile?.displayName || t?.firstName || 'User').slice(0, 64),
            userName: String(profile?.username || ''), lang: lang || t?.lang || '',
            seq, lastMessage: text.slice(0, 120), lastAt: now,
            ...(t?.keyboard?.oneTime ? { keyboard: null } : {}),
          };
          tx.update(`zp_bots/${id}`, { sequence });
          tx.set(thread, next);
          tx.create(`${thread}/messages/${nonce}`, message);
          if (wants(bot, 'message')) {
            const update = { update_id: sequence, message: tgMessage(message, bot, next) };
            tx.create(`zp_bots/${id}/updates/${String(sequence).padStart(16, '0')}`, { update_id: sequence, json: JSON.stringify(update), expiresAt: new Date(now + UPDATE_TTL) });
            hook = !!bot.webhook?.url;
          }
          return message;
        });
        if (hook) later(flush(id));
        return message;
      }
      case 'seen': {
        // A device says "I'm here": record the address Cloudflare saw for this request (the app only calls this
        // when the person allowed optional data). Written to their own device record and account summary.
        const deviceId = String(body.deviceId || '');
        if (!/^[A-Za-z0-9_-]{6,128}$/.test(deviceId)) fail(400, 'Invalid device');
        const platform = ['ANDROID', 'WINDOWS', 'WEB'].includes(String(body.platform)) ? String(body.platform) : 'UNKNOWN';
        const ip = String(request.headers.get('cf-connecting-ip') || '').slice(0, 64);
        const cf = request.cf || {};
        const seen = { lastIp: ip, lastCity: String(cf.city || '').slice(0, 80), countryCode: String(cf.country || '').slice(0, 2), lastIpAt: new Date() };
        await db.update(`users/${owner}/devices/${deviceId}`, { ...seen, platform }).catch(() => fail(404, 'Unknown device'));
        await db.update(`users/${owner}`, { lastIp: seen.lastIp, lastCity: seen.lastCity, lastCountry: seen.countryCode, lastIpAt: seen.lastIpAt, lastPlatform: platform }).catch(() => {});
        return { recorded: true };
      }
      case 'press': {
        const username = policy.username(body.username);
        const id = (await db.get(`chat_usernames/${username}`))?.botId;
        if (!id) fail(404, 'Bot not found');
        const mid = String(body.message_id ?? ''), data = String(body.data || '');
        if (!MSG_DOC.test(mid) || !data || data.length > 64) fail(400, 'Invalid button');
        const thread = `zp_bot_threads/${id}_${owner}`;
        const cbid = policy.randomId();
        let hook = false;
        const result = await db.transaction(async (tx) => {
          const bot = await tx.get(`zp_bots/${id}`), msg = await tx.get(`${thread}/messages/${mid}`), t = await tx.get(thread);
          if (!bot) fail(404, 'Bot not found');
          if (bot.disabled) fail(403, 'Bot disabled');
          const buttons = (loadInline(msg?.reply_markup)?.inline_keyboard || []).flat();
          if (!msg || !t || msg.sender !== `bot_${id}` || !buttons.some((b) => b.callback_data === data)) fail(404, 'This button is no longer available');
          const chat = { ...t, chatNum: t.chatNum || await policy.userNumber(owner) };
          const sequence = (bot.sequence || 0) + 1, now = Date.now();
          const callback_query = { id: cbid, from: personOf(chat), message: tgMessage({ message_id: Number(mid) || mid, ...msg }, bot, chat), chat_instance: String(chat.chatNum), data };
          tx.update(`zp_bots/${id}`, { sequence });
          tx.create(`zp_bot_callbacks/${cbid}`, { botId: id, owner, messageId: mid, answered: false, createdAt: now, expiresAt: new Date(now + 3600000) });
          if (wants(bot, 'callback_query')) {
            tx.create(`zp_bots/${id}/updates/${String(sequence).padStart(16, '0')}`, { update_id: sequence, json: JSON.stringify({ update_id: sequence, callback_query }), expiresAt: new Date(now + UPDATE_TTL) });
            hook = !!bot.webhook?.url;
          }
          return { callback_query_id: cbid };
        });
        if (hook) later(flush(id));
        return result;
      }
      // ---- verification (blue check) requests: the owner applies, an administrator decides ----
      case 'verifyApply': {
        const target = await verifyTarget(owner, body.target);
        const links = urlList(body.links, 2, 5, 'Send at least 2 links to official accounts (https://…)');
        const press = urlList(body.press, 0, 3, 'Press links must be https:// addresses');
        const note = String(body.note || '').trim().slice(0, 500);
        // optional company / brand name the applicant asks for (shown next to the name, e.g. "Google"); an admin decides
        const company = String(body.company || '').trim().replace(/\s+/g, ' ').slice(0, 32);
        const path = `zp_verify_requests/${target.key}`;
        await db.transaction(async (tx) => {
          const [profile, old] = await Promise.all([tx.get(`chat_profiles/${target.key}`), tx.get(path)]);
          if (profile?.verified) fail(409, 'This account is already verified');
          if (old?.status === 'pending') fail(409, 'A request for this account is already waiting for review');
          tx.set(path, { uid: owner, target: target.key, kind: target.kind, username: target.username, links, press, note, company, status: 'pending', reason: '', createdAt: Date.now() });
        });
        return { status: 'pending', username: target.username };
      }
      case 'verifyStatus': {
        const rows = await db.query('zp_verify_requests', { where: [['uid', '==', owner]], limit: 25 });
        return rows.map(({ data: r }) => ({ username: r.username, kind: r.kind, status: r.status, reason: r.reason || '', createdAt: r.createdAt || 0 }))
          .sort((a, b) => b.createdAt - a.createdAt);
      }
      case 'unverify': {
        const target = await verifyTarget(owner, body.target);
        const profilePath = `chat_profiles/${target.key}`;
        await db.transaction(async (tx) => {
          const [profile, request] = await Promise.all([tx.get(profilePath), tx.get(`zp_verify_requests/${target.key}`)]);
          if (!profile?.verified) fail(409, 'This account is not verified');
          tx.update(profilePath, { verified: false });
          if (request) tx.update(`zp_verify_requests/${target.key}`, { status: 'removed', decidedAt: Date.now() });
        });
        return { verified: false, username: target.username };
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

  // ---------- Bot API ----------
  async function handleBot(request, path, method, body, later) {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '') || (path[0]?.startsWith('bot') ? decodeURIComponent(path[0].slice(3)) : '');
    if (!policy.TOKEN.test(token)) fail(401, 'Unauthorized');
    const left = token.split(':')[0];
    const id = BOT_ID.test(left) ? left : (await db.get(`zp_bot_nums/${left}`))?.botId;
    const botPath = `zp_bots/${id}`;
    const bot = id && await db.get(botPath);
    if (!bot || !(await policy.tokenMatches(token, bot.tokenHash))) fail(401, 'Unauthorized');
    if (bot.disabled) fail(403, 'Forbidden: this bot was disabled');
    rateLimit(`bot_${id}`);
    if (!bot.num) bot.num = await db.transaction((tx) => tx.get(botPath).then((b) => ensureNum(tx, id, b)));
    const name = CANONICAL.get(String(method || '').toLowerCase());
    if (!name) fail(404, 'Not Found');
    return run({ id, bot, botPath }, name, body, later);
  }

  // Writes one bot message into the conversation and returns it in Bot API form.
  async function post(ctx, chatId, fields, preview, markup = {}, resolved = null) {
    const { id, bot } = ctx;
    const { thread } = resolved || await target(id, chatId);
    const { message, t } = await db.transaction(async (tx) => {
      const t = await tx.get(thread);
      if (!t) fail(403, "Forbidden: the person hasn't started this bot yet");
      const seq = (t.seq || 0) + 1, now = Date.now();
      const message = {
        message_id: seq, sender: `bot_${id}`, createdAt: now, ...fields,
        ...(markup.inline ? { reply_markup: storedInline(markup.inline) } : {}),
        ...(markup.forceReply ? { forceReply: markup.forceReply } : {}),
      };
      const patch = { seq, lastMessage: preview.slice(0, 120), lastAt: now, action: null };
      if (!t.chatNum) patch.chatNum = await policy.userNumber(t.owner);
      if (markup.keyboard) patch.keyboard = storedKeyboard(markup.keyboard);
      if (markup.removeKeyboard) patch.keyboard = null;
      tx.create(`${thread}/messages/${seq}`, message);
      tx.update(thread, patch);
      return { message, t: { ...t, ...patch } };
    });
    return tgMessage(message, bot, t);
  }

  const parseMode = (value) => {
    if (value == null || value === '') return {};
    if (!PARSE_MODES.has(String(value))) fail(400, 'Bad Request: unsupported parse_mode');
    return { parse_mode: String(value) };
  };
  const replyTo = (body) => {
    const p = parseJson(body.reply_parameters, 'reply_parameters');
    const mid = Number(p?.message_id ?? body.reply_to_message_id);
    return Number.isSafeInteger(mid) && mid > 0 ? { replyTo: mid } : {};
  };

  async function sendMedia(ctx, kind, body) {
    const { id } = ctx;
    // Libraries upload either straight into the field or as "attach://<part>" pointing at another form part.
    const raw = body[kind];
    const input = typeof raw === 'string' && raw.startsWith('attach://') ? body[raw.slice(9)] : raw;
    const caption = String(body.caption || '').trim();
    if (caption.length > 1024) fail(400, 'Bad Request: caption is too long');
    const markup = markupOf(body.reply_markup), extra = { ...parseMode(body.parse_mode), ...replyTo(body) };
    const resolved = await target(id, body.chat_id);
    let media, document = null;
    if (input && typeof input.arrayBuffer === 'function') {
      if (!files) fail(503, 'File relay unavailable');
      const bytes = new Uint8Array(await input.arrayBuffer());
      if (!bytes.length) fail(400, 'Bad Request: file is empty');
      if (bytes.length > MAX_FILE) fail(413, 'Request Entity Too Large: uploads are limited to 20 MB; send bigger files as an https link');
      const fileName = (String(input.name || kind).replace(/[\\/\u0000-\u001f]/g, '_').trim() || kind).slice(0, 128);
      const mime = /^[\w.+-]+\/[\w.+-]+$/.test(input.type || '') ? input.type : 'application/octet-stream';
      const fileId = policy.randomId() + policy.randomId();
      await files.put(fileId, bytes, { expirationTtl: FILE_TTL, metadata: { uid: resolved.uid, botId: id, name: fileName, mime } });
      document = { file_id: fileId, file_name: fileName, mime_type: mime, file_size: bytes.length, expiresAt: Date.now() + FILE_TTL * 1000 };
      media = { type: kind, file_id: fileId, file_name: fileName, mime_type: mime, file_size: bytes.length };
    } else if (typeof input === 'string' && /^https:\/\/[^\s]{1,2000}$/.test(input)) {
      let fileName = '';
      try { fileName = decodeURIComponent(new URL(input).pathname.split('/').pop() || '').slice(0, 128); } catch {}
      media = { type: kind, url: input, file_id: 'u' + policy.randomId(), ...(fileName ? { file_name: fileName } : {}) };
    } else if (typeof input === 'string' && input) {
      fail(400, 'Bad Request: file_id reuse is not supported; upload the file again or pass an https link');
    } else fail(400, `Bad Request: there is no ${kind} in the request`);
    const preview = kind === 'document' ? `📄 ${media.file_name || 'File'}` : PREVIEW[kind];
    try {
      return await post(ctx, body.chat_id, { text: caption, media, ...(document ? { document } : {}), ...extra }, caption ? `${preview} · ${caption}` : preview, markup, resolved);
    } catch (e) { if (document) await files.delete(document.file_id); throw e; }
  }

  // Finds a message in the conversation by its numeric message_id (bot messages are stored under that number).
  async function findMessage(thread, mid) {
    const direct = `${thread}/messages/${mid}`, found = await db.get(direct);
    if (found) return { path: direct, msg: found };
    const rows = await db.query(`${thread}/messages`, { where: [['message_id', '==', Number(mid)]], limit: 1 });
    return rows.length ? { path: rows[0].path, msg: rows[0].data } : null;
  }

  const messageId = (value) => {
    const mid = String(value ?? '');
    if (!MSG_DOC.test(mid)) fail(400, 'Bad Request: invalid message_id');
    return mid;
  };

  async function run(ctx, method, body, later) {
    const { id, bot, botPath } = ctx;
    if (MEDIA[method]) return sendMedia(ctx, MEDIA[method], body);
    switch (method) {
      case 'getMe': return {
        id: bot.num, is_bot: true, first_name: bot.name, username: bot.username, can_join_groups: false,
        can_read_all_group_messages: false, supports_inline_queries: false, can_connect_to_business: false, has_main_web_app: false,
      };
      case 'logOut': case 'close': return true;
      case 'getMyCommands': return commandList(bot);
      case 'setMyCommands': await db.update(botPath, { commands: policy.commands(parseJson(body.commands ?? [], 'commands')) }); return true;
      case 'deleteMyCommands': await db.update(botPath, { commands: [] }); return true;
      case 'getChatMenuButton': {
        const menu = bot.menuButton || { type: 'commands' };
        return menu.type === 'web_app' ? { type: 'web_app', text: menu.text, web_app: { url: menu.url } } : menu;
      }
      case 'setChatMenuButton': await db.update(botPath, { menuButton: policy.menuButton(body.menu_button ?? { type: 'default' }) }); return true;
      case 'getMyName': return { name: bot.name };
      case 'getMyDescription': return { description: bot.description || '' };
      case 'getMyShortDescription': return { short_description: bot.about || '' };
      case 'setMyName': {
        const value = String(body.name || '').trim();
        if (!value) return true;
        if (value.length > 64) fail(400, 'Bad Request: name is too long');
        await db.transaction(async (tx) => { const b = await tx.get(botPath); const rename = await renameProfile(tx, id, b, value); tx.update(botPath, { name: value }); rename(); });
        return true;
      }
      case 'setMyDescription': case 'setMyShortDescription': {
        const [field, key, max] = method === 'setMyDescription' ? ['description', 'description', 512] : ['about', 'short_description', 120];
        const value = String(body[key] || '').trim();
        if (value.length > max) fail(400, `Bad Request: ${key} is too long`);
        await db.update(botPath, { [field]: value });
        return true;
      }

      case 'setWebhook': {
        const url = String(body.url || '').trim();
        const drop = flag(body.drop_pending_updates);
        if (!url) { await db.update(botPath, { webhook: null }); if (drop) await dropUpdates(id); return true; }
        let u;
        try { u = new URL(url); } catch { fail(400, 'Bad Request: invalid webhook URL'); }
        if (u.protocol !== 'https:' || u.username || u.password || url.length > 512) fail(400, 'Bad Request: the webhook must be an https URL');
        if (/^(botapi|api)\.zpas\.org$/i.test(u.hostname)) fail(400, 'Bad Request: the webhook cannot point at the Bot API itself');
        const secret = body.secret_token == null ? '' : String(body.secret_token);
        if (secret && !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) fail(400, 'Bad Request: secret token contains unallowed characters');
        const allowed = parseJson(body.allowed_updates ?? null, 'allowed_updates');
        const patch = { webhook: { url, secret, setAt: Date.now() }, webhookError: '', webhookErrorAt: 0 };
        if (Array.isArray(allowed)) patch.allowedUpdates = allowed.map(String).filter((x) => UPDATE_TYPES.has(x));
        await db.update(botPath, patch);
        if (drop) await dropUpdates(id); else later(flush(id));
        return true;
      }
      case 'deleteWebhook': {
        await db.update(botPath, { webhook: null });
        if (flag(body.drop_pending_updates)) await dropUpdates(id);
        return true;
      }
      case 'getWebhookInfo': {
        const pending = await db.count(`${botPath}/updates`);
        return {
          url: bot.webhook?.url || '', has_custom_certificate: false, pending_update_count: pending, max_connections: 40,
          ...(bot.webhookErrorAt ? { last_error_date: seconds(bot.webhookErrorAt), last_error_message: bot.webhookError } : {}),
          ...(Array.isArray(bot.allowedUpdates) && bot.allowedUpdates.length ? { allowed_updates: bot.allowedUpdates } : {}),
        };
      }
      case 'getUpdates': {
        if (bot.webhook?.url) fail(409, "Conflict: can't use getUpdates while a webhook is active; use deleteWebhook to delete the webhook first");
        const offset = Number(body.offset || 0), limit = Number(body.limit || 100), timeout = Number(body.timeout || 0);
        if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isFinite(timeout) || timeout < 0) fail(400, 'Bad Request: invalid offset, limit or timeout');
        const allowed = parseJson(body.allowed_updates ?? null, 'allowed_updates');
        if (Array.isArray(allowed)) await db.update(botPath, { allowedUpdates: allowed.map(String).filter((x) => UPDATE_TYPES.has(x)) });
        const read = async () => {
          const rows = offset < 0
            ? (await db.query(`${botPath}/updates`, { orderBy: ['update_id', 'desc'], limit: Math.min(-offset, limit) })).reverse()
            : await db.query(`${botPath}/updates`, { where: [['update_id', '>=', offset]], orderBy: ['update_id', 'asc'], limit });
          return rows.map((r) => r.data).filter((u) => millis(u.expiresAt) > Date.now()).map(updateOf);
        };
        // Long polling: the request waits (up to 25 s) and checks again every few seconds.
        // Webhooks deliver instantly and cost nothing while idle, so they are the better choice for busy bots.
        const until = Date.now() + Math.min(timeout, 25) * 1000;
        let updates = await read();
        while (!updates.length && Date.now() + pollStep <= until) { await new Promise((r) => setTimeout(r, pollStep)); updates = await read(); }
        if (offset > 1) later(dropUpdates(id, offset));   // updates before offset are confirmed
        return updates;
      }

      case 'sendMessage': {
        const text = String(body.text ?? '').trim();
        if (!text) fail(400, 'Bad Request: message text is empty');
        if (text.length > 4096) fail(400, 'Bad Request: message is too long');
        const markup = markupOf(body.reply_markup);
        return post(ctx, body.chat_id, { text, ...parseMode(body.parse_mode), ...replyTo(body) }, text, markup);
      }
      case 'sendChatAction': {
        const action = String(body.action || '');
        if (!CHAT_ACTIONS.has(action)) fail(400, 'Bad Request: wrong parameter action in request');
        const { thread } = await target(id, body.chat_id);
        await db.update(thread, { action, actionUntil: Date.now() + 5000 }).catch(() => fail(403, "Forbidden: the person hasn't started this bot yet"));
        return true;
      }
      case 'editMessageText': case 'editMessageCaption': case 'editMessageReplyMarkup': {
        if (body.inline_message_id) fail(400, 'Bad Request: inline messages are not supported');
        const { thread } = await target(id, body.chat_id);
        const mid = messageId(body.message_id);
        const update = {};
        if (method !== 'editMessageReplyMarkup') {
          const text = String((method === 'editMessageText' ? body.text : body.caption) ?? '').trim();
          if (method === 'editMessageText' && (!text || text.length > 4096)) fail(400, 'Bad Request: text must be 1–4096 characters');
          if (text.length > 4096) fail(400, 'Bad Request: caption is too long');
          Object.assign(update, { text, editedAt: Date.now() }, parseMode(body.parse_mode));
        }
        if (body.reply_markup !== undefined || method === 'editMessageReplyMarkup') update.reply_markup = storedInline(inlineKeyboard(body.reply_markup)) || { inline_keyboard: [] };
        const found = await findMessage(thread, mid);
        if (!found || found.msg.sender !== `bot_${id}`) fail(400, 'Bad Request: message to edit not found');
        await db.transaction(async (tx) => { if (!(await tx.get(found.path))) fail(400, 'Bad Request: message to edit not found'); tx.update(found.path, update); });
        const t = await db.get(thread);
        return tgMessage({ ...found.msg, ...update }, bot, { ...t, chatNum: t.chatNum || await policy.userNumber(t.owner) });
      }
      case 'deleteMessage': case 'deleteMessages': {
        const { thread } = await target(id, body.chat_id);
        const list = method === 'deleteMessage' ? [body.message_id] : parseJson(body.message_ids ?? [], 'message_ids');
        if (!Array.isArray(list) || !list.length || list.length > 100) fail(400, 'Bad Request: message_ids must list 1–100 messages');
        const paths = [];
        for (const m of list) { const found = await findMessage(thread, messageId(m)); if (found) paths.push(found.path); }
        if (!paths.length && method === 'deleteMessage') fail(400, 'Bad Request: message to delete not found');
        if (paths.length) await deleteDocs(paths);
        return true;
      }
      case 'answerCallbackQuery': {
        const cb = String(body.callback_query_id || '');
        if (!CALLBACK_ID.test(cb)) fail(400, 'Bad Request: invalid callback_query_id');
        const text = String(body.text || '').slice(0, 200);
        const row = await db.get(`zp_bot_callbacks/${cb}`);
        if (!row || row.botId !== id) fail(400, 'Bad Request: query is too old or the query ID is invalid');
        await db.update(`zp_bot_callbacks/${cb}`, { answered: true, text, show_alert: flag(body.show_alert), answeredAt: Date.now() });
        return true;
      }
      case 'getChat': {
        const { thread } = await target(id, body.chat_id);
        const t = await db.get(thread);
        if (!t) fail(400, 'Bad Request: chat not found');
        const chat = chatOf({ ...t, chatNum: t.chatNum || await policy.userNumber(t.owner) });
        return { ...chat, accent_color_id: 0, max_reaction_count: 0 };
      }
      default: fail(404, 'Not Found');
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

  // ---------- public profile pages (zpas.org/<username>) ----------
  // Read-only and anonymous: only what a profile already shows to everybody in the app. Never e-mail, phone or account ids.
  // The photo is served only when the person's photo privacy is "everybody" (the app's default).
  async function publicProfile(path, request) {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' };
    const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
    if (request.method !== 'GET') return json(405, { ok: false });
    const [, kind, raw] = path;
    const name = String(raw || '').toLowerCase().replace(/^@/, '');
    if (!['profile', 'photo'].includes(kind) || !/^[a-z0-9_]{3,32}$/.test(name)) return json(404, { ok: false });
    rateLimit('public_' + (request.headers.get('cf-connecting-ip') || 'x'), 120);
    const handle = await db.get(`chat_usernames/${name}`);
    if (!handle || handle.gid) return json(404, { ok: false });
    const key = handle.botId ? `bot_${handle.botId}` : handle.uid;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(key || '')) return json(404, { ok: false });
    const profile = await db.get(`chat_profiles/${key}`);
    const privacy = profile?.privacy || {};
    if (!profile || privacy.banned === 'true' || privacy.banned === '1' || (await db.get(`chat_bans/${key}`))?.banned) return json(404, { ok: false });
    const photoVisible = (privacy.photo || 'everybody') === 'everybody';
    if (kind === 'photo') {
      const media = photoVisible ? await db.get(`chat_media_profiles/${key}`) : null;
      if (!media?.photo?.bytes) return new Response(null, { status: 404, headers });
      const bytes = Uint8Array.from(atob(media.photo.bytes), (c) => c.charCodeAt(0));
      return new Response(bytes, { status: 200, headers: { ...headers, 'Content-Type': 'image/jpeg' } });
    }
    let about = String(profile.bio || '');
    if (handle.botId) about = String((await db.get(`zp_bots/${handle.botId}`))?.about || '') || about;
    const media = photoVisible ? await db.get(`chat_media_profiles/${key}`) : null;
    return json(200, { ok: true, result: {
      username: profile.username || name,
      name: String(profile.displayName || profile.firstName || name).slice(0, 64),
      verified: profile.verified === true,
      company: String(profile.companyLabel || '').slice(0, 32),
      bot: !!handle.botId,
      about: about.slice(0, 300),
      photo: media?.photo?.bytes ? `/public/photo/${name}` : null,
    } });
  }

  async function readBody(request, url) {
    const query = Object.fromEntries(url.searchParams);
    if (request.method === 'GET') return query;
    const type = request.headers.get('content-type') || '';
    if (type.includes('multipart/form-data')) {
      if (Number(request.headers.get('content-length') || 0) > MAX_FILE + 65536) fail(413, 'Request Entity Too Large: uploads are limited to 20 MB');
      const form = await request.formData(), out = { ...query };
      for (const [k, v] of form) out[k] = v;
      return out;
    }
    const text = await request.text();
    if (text.length > MAX_BODY) fail(413, 'Request Entity Too Large');
    if (!text) return query;
    if (type.includes('application/x-www-form-urlencoded')) return { ...query, ...Object.fromEntries(new URLSearchParams(text)) };
    try { const value = JSON.parse(text); return value && typeof value === 'object' ? { ...query, ...value } : query; } catch { fail(400, 'Bad Request: body must be JSON'); }
  }

  return async function handle(request, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);
    const origin = request.headers.get('origin') || '';
    const cors = path[0] === 'admin' && ADMIN_ORIGINS.has(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '3600' }
      : {};
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors } });
    if (request.method === 'OPTIONS' && cors['Access-Control-Allow-Origin']) return new Response(null, { status: 204, headers: cors });
    // Work that may finish after the answer (webhook delivery, cleanup). Without a Worker context (tests) it is awaited.
    const pending = [];
    const later = (promise) => {
      const safe = Promise.resolve(promise).catch((e) => console.error('zbot background', e?.message));
      if (ctx?.waitUntil) ctx.waitUntil(safe); else pending.push(safe);
    };
    try {
      if (!path.length) return reply(200, { ok: true, result: { service: 'Z Pass Bot API', docs: 'https://docs.zpas.org/' } });
      if (path[0] === 'public') return await publicProfile(path, request);
      if (path[0] === 'config') return await savedConfig(path, request);
      if (!['GET', 'POST'].includes(request.method)) fail(405, 'GET or POST required');
      const body = await readBody(request, url), method = path.at(-1);
      let result;
      if (path[0] === 'admin') { if (request.method !== 'POST') fail(405, 'Admin requires POST'); result = await handleAdmin(request, method, body); }
      else if (path[0] === 'manage' && method === 'file') { if (request.method !== 'POST') fail(405, 'POST required'); return await downloadFile(request, body); }
      else if (path[0] === 'manage') result = await handleManage(request, method, body, later);
      else result = await handleBot(request, path, method, body, later);
      await Promise.all(pending);
      return reply(200, { ok: true, result });
    } catch (e) {
      await Promise.all(pending);
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error('zbot', e?.message);
      return reply(status, {
        ok: false, error_code: status, description: status === 500 ? 'Internal Server Error' : e.message,
        ...(status === 429 ? { parameters: { retry_after: 60 } } : {}),
      });
    }
  };
}
