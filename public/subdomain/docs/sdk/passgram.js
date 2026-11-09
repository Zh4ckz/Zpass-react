/**
 * PassGram Bot SDK for JavaScript (official).
 *
 * Copyright (c) 2026 PassGram by Zizo Software LLC
 * Released under the MIT License: https://docs.zpas.org/bot#license
 *
 * One file, no dependencies, Node.js 18+.
 * Docs: https://docs.zpas.org/#sdk
 *
 *   const { Bot, Buttons } = require('./passgram');
 *   const bot = new Bot('YOUR_TOKEN');
 *   bot.command('start', (msg) => msg.reply(`Hi ${msg.user.firstName}!`, { buttons: new Buttons([['Say hi', 'hi']]) }));
 *   bot.button('hi', (press) => press.answer('Hello!'));
 *   bot.run();
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const VERSION = '1.0.0';
const DEFAULT_API = 'https://api.zpas.org';
const FORMATS = { html: 'HTML', markdown: 'MarkdownV2', 'markdown-legacy': 'Markdown' };

class PassGramError extends Error {
  constructor(code, description, retryAfter) {
    super(`${code}: ${description}`);
    this.code = code; this.description = description; this.retryAfter = retryAfter;
  }
}

/** Buttons under a message. Rows of [label, value]; a value starting with https:// opens that link. */
class Buttons {
  constructor(...rows) { this.rows = rows.map((r) => [...r]); }
  row(...buttons) { this.rows.push(buttons); return this; }
  toApi() {
    return { inline_keyboard: this.rows.map((row) => row.map(([label, value]) =>
      String(value).startsWith('https://') ? { text: label, url: value } : { text: label, callback_data: String(value) })) };
  }
}

/** Big answer buttons above the message box. A tap sends the label as a normal message. */
class Keyboard {
  constructor(...rows) {
    const last = rows[rows.length - 1];
    this.options = last && !Array.isArray(last) ? rows.pop() : {};
    this.rows = rows;
  }
  static remove() { return { toApi: () => ({ remove_keyboard: true }) }; }
  toApi() {
    return {
      keyboard: this.rows.map((row) => row.map((t) => ({ text: String(t) }))), resize_keyboard: true,
      one_time_keyboard: !!this.options.oneTime,
      ...(this.options.placeholder ? { input_field_placeholder: this.options.placeholder } : {}),
    };
  }
}

/** A file to upload (up to 20 MB): new File('report.pdf') or new File(Buffer.from('hi'), 'hi.txt'). */
class File {
  constructor(data, name, mime) {
    if (typeof data === 'string') { this.data = fs.readFileSync(data); this.name = name || path.basename(data); }
    else { this.data = Buffer.from(data); this.name = name || 'file'; }
    this.mime = mime || 'application/octet-stream';
  }
}

class User {
  constructor(raw = {}) {
    this.id = raw.id; this.firstName = raw.first_name || ''; this.username = raw.username;
    this.language = raw.language_code; this.isBot = !!raw.is_bot; this.raw = raw;
  }
}

class Message {
  constructor(bot, raw = {}) {
    this.bot = bot; this.raw = raw;
    this.id = raw.message_id; this.chatId = raw.chat?.id; this.user = new User(raw.from);
    this.text = raw.text || raw.caption || ''; this.date = raw.date;
    this.command = null; this.args = [];
    if (this.text.startsWith('/')) {
      const [head, ...rest] = this.text.split(/\s+/);
      this.command = head.slice(1).split('@')[0].toLowerCase(); this.args = rest;
    }
  }
  reply(text, options) { return this.bot.send(this.chatId, text, options); }
  replyPhoto(photo, options) { return this.bot.sendPhoto(this.chatId, photo, options); }
  replyFile(file, options) { return this.bot.sendFile(this.chatId, file, options); }
  typing(action = 'typing') { return this.bot.typing(this.chatId, action); }
  edit(text, options) { return this.bot.edit(this.chatId, this.id, text, options); }
  delete() { return this.bot.delete(this.chatId, this.id); }
}

/** Someone pressed one of your buttons. Call answer() quickly; the button spins until you do. */
class Press {
  constructor(bot, raw) {
    this.bot = bot; this.raw = raw; this.id = raw.id; this.data = raw.data || '';
    this.user = new User(raw.from); this.message = new Message(bot, raw.message); this.chatId = this.message.chatId;
    this.answered = false;
  }
  answer(text, { alert = false } = {}) {
    this.answered = true;
    return this.bot.call('answerCallbackQuery', { callback_query_id: this.id, show_alert: alert, ...(text ? { text } : {}) });
  }
  edit(text, options) { return this.message.edit(text, options); }
  reply(text, options) { return this.bot.send(this.chatId, text, options); }
}

class Bot {
  constructor(token, { api } = {}) {
    this.token = String(token || process.env.PASSGRAM_BOT_TOKEN || '').trim();
    if (!this.token) throw new PassGramError(401, 'No bot token. Get one from Zbot in the PassGram app (/newbot).');
    this.api = String(api || process.env.PASSGRAM_API || DEFAULT_API).replace(/\/+$/, '');
    this.commands = new Map(); this.buttons = new Map(); this.texts = new Map(); this.messages = [];
    this.anyButton = null; this.onError = (e) => console.error('Handler error:', e);
  }

  /** Call any Bot API method directly. */
  async call(method, params = {}, files = null, timeoutMs = 30000) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null));
    let body, headers = { 'User-Agent': `passgram-js/${VERSION}` };
    if (files) {
      body = new FormData();
      for (const [k, v] of Object.entries(clean)) body.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      for (const [k, f] of Object.entries(files)) body.append(k, new Blob([f.data], { type: f.mime }), f.name);
    } else { body = JSON.stringify(clean); headers['Content-Type'] = 'application/json'; }
    const res = await fetch(`${this.api}/bot${this.token}/${method}`, { method: 'POST', headers, body, signal: AbortSignal.timeout(timeoutMs) });
    let data;
    try { data = await res.json(); } catch { throw new PassGramError(res.status, res.statusText); }
    if (!data.ok && (data.error_code || res.status) === 401) throw new PassGramError(401, 'The server rejected this token. Check it in Zbot or send /revoke for a new one.');
    if (!data.ok) throw new PassGramError(data.error_code || res.status, data.description || 'Unknown error', data.parameters?.retry_after);
    return data.result;
  }

  static extras({ buttons, keyboard, format, replyTo } = {}) {
    const markup = buttons || keyboard;
    return {
      ...(markup ? { reply_markup: markup.toApi() } : {}),
      ...(FORMATS[format] ? { parse_mode: FORMATS[format] } : {}),
      ...(replyTo ? { reply_parameters: { message_id: replyTo } } : {}),
    };
  }

  async me() { return new User(await this.call('getMe')); }

  /** Send text. options: { buttons, keyboard, format: 'html' | 'markdown', replyTo } */
  async send(chatId, text, options) {
    return new Message(this, await this.call('sendMessage', { chat_id: chatId, text, ...Bot.extras(options) }));
  }

  async media(method, field, chatId, item, { caption, ...options } = {}) {
    const params = { chat_id: chatId, caption, ...Bot.extras(options) };
    if (typeof item === 'string' && item.startsWith('https://')) return new Message(this, await this.call(method, { ...params, [field]: item }));
    const file = item instanceof File ? item : new File(item);
    return new Message(this, await this.call(method, params, { [field]: file }, 120000));
  }
  /** photo: an https:// link (any size, from your server) or a file to upload. */
  sendPhoto(chatId, photo, options) { return this.media('sendPhoto', 'photo', chatId, photo, options); }
  sendVideo(chatId, video, options) { return this.media('sendVideo', 'video', chatId, video, options); }
  sendAudio(chatId, audio, options) { return this.media('sendAudio', 'audio', chatId, audio, options); }
  /** file: an https:// link, a path, or new File(buffer, 'name.ext'). Uploads up to 20 MB. */
  sendFile(chatId, file, options) { return this.media('sendDocument', 'document', chatId, file, options); }

  typing(chatId, action = 'typing') { return this.call('sendChatAction', { chat_id: chatId, action }); }
  async edit(chatId, messageId, text, options) {
    return new Message(this, await this.call('editMessageText', { chat_id: chatId, message_id: messageId, text, ...Bot.extras(options) }));
  }
  delete(chatId, messageId) { return this.call('deleteMessage', { chat_id: chatId, message_id: messageId }); }
  /** setCommands({ start: 'Main menu', help: 'How it works' }) */
  setCommands(commands) {
    return this.call('setMyCommands', { commands: Object.entries(commands).map(([command, description]) => ({ command, description })) });
  }

  /** bot.command('start', fn): runs for /start (msg.args holds the words after it). */
  command(names, fn) { for (const n of [].concat(names)) this.commands.set(n.toLowerCase().replace(/^\//, ''), fn); return this; }
  /** bot.button('photo', fn): runs when a button with that value is pressed. bot.button(fn) catches every press. */
  button(values, fn) {
    if (typeof values === 'function') { this.anyButton = values; return this; }
    for (const v of [].concat(values)) this.buttons.set(String(v), fn); return this;
  }
  /** bot.text(['Good', 'Bad'], fn): runs for those exact messages (handy with Keyboard). */
  text(texts, fn) { for (const t of [].concat(texts)) this.texts.set(t, fn); return this; }
  /** bot.message(fn): runs for any other text message. */
  message(fn) { this.messages.push(fn); return this; }

  async dispatch(update) {
    if (update.callback_query) {
      const press = new Press(this, update.callback_query);
      const fn = this.buttons.get(press.data) || this.anyButton;
      try { if (fn) await fn(press); }
      finally { if (!press.answered) await press.answer().catch(() => {}); }
      return;
    }
    if (!update.message) return;
    const msg = new Message(this, update.message);
    const fn = (msg.command && this.commands.get(msg.command)) || this.texts.get(msg.text);
    if (fn) await fn(msg); else for (const h of this.messages) await h(msg);
  }

  /** Handle one update yourself, e.g. one that arrived at your webhook. */
  async processUpdate(update) {
    try { await this.dispatch(update); } catch (e) { this.onError(e, update); }
  }

  /** Wait for updates and call your handlers. Stops with Ctrl+C. */
  async run({ timeout = 25 } = {}) {
    let me;
    try { me = await this.me(); }
    catch (e) {
      if (e.code === 401) throw new PassGramError(401, 'The server rejected this token. Check it in Zbot or send /revoke for a new one.');
      throw e;
    }
    await this.call('deleteWebhook');
    console.log(`PassGram bot @${me.username} is running (id ${me.id}). Ctrl+C to stop.`);
    let offset = 0;
    for (;;) {
      let updates;
      try { updates = await this.call('getUpdates', { offset, timeout }, null, (timeout + 15) * 1000); }
      catch (e) {
        if (e.code === 401) throw e;
        await new Promise((r) => setTimeout(r, (e.retryAfter || 3) * 1000));
        continue;
      }
      for (const update of updates) {
        offset = update.update_id + 1;
        try { await this.dispatch(update); } catch (e) { this.onError(e, update); }
      }
    }
  }
}

module.exports = { Bot, Buttons, Keyboard, File, PassGramError, Message, Press, User, VERSION };
