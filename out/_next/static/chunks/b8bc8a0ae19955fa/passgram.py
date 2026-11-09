"""
PassGram Bot SDK for Python (official).

Copyright (c) 2026 PassGram by Zizo Software LLC
Released under the MIT License: https://docs.zpas.org/bot#license

One file, no dependencies, Python 3.8+.
Docs: https://docs.zpas.org/#sdk

    from passgram import Bot, Buttons

    bot = Bot("YOUR_TOKEN")

    @bot.command("start")
    def start(msg):
        msg.reply(f"Hi {msg.user.first_name}!", buttons=Buttons([("Say hi", "hi")]))

    @bot.button("hi")
    def hi(press):
        press.answer("Hello!")

    bot.run()
"""
import json
import mimetypes
import os
import sys
import time
import traceback
import urllib.error
import urllib.request
import uuid

__version__ = "1.0.0"
__license__ = "MIT"
__copyright__ = "Copyright (c) 2026 PassGram by Zizo Software LLC"
__all__ = ["Bot", "Buttons", "Keyboard", "File", "PassGramError", "Message", "Press", "User"]

DEFAULT_API = "https://api.zpas.org"
FORMATS = {None: None, "": None, "html": "HTML", "markdown": "MarkdownV2", "markdown-legacy": "Markdown"}


class PassGramError(Exception):
    """The Bot API answered with an error (code is the HTTP status)."""

    def __init__(self, code, description):
        super().__init__(f"{code}: {description}")
        self.code = code
        self.description = description


# ---------- building blocks ----------

class Buttons:
    """Buttons under a message. Each row is a list of (label, value) pairs.
    A value starting with https:// opens that link; anything else is sent back to your bot as a press.

        Buttons([("Yes", "yes"), ("No", "no")], [("Website", "https://zpas.org")])
    """

    def __init__(self, *rows):
        self.rows = [list(r) for r in rows]

    def row(self, *buttons):
        self.rows.append(list(buttons))
        return self

    def to_api(self):
        return {"inline_keyboard": [
            [{"text": label, "url": value} if str(value).startswith("https://") else {"text": label, "callback_data": str(value)}
             for label, value in row] for row in self.rows]}


class Keyboard:
    """Big answer buttons shown above the message box. A tap sends the label as a normal message.

        Keyboard(["Good", "Bad"], ["Close"], one_time=True)
        Keyboard.remove()   # take it away
    """

    def __init__(self, *rows, one_time=False, placeholder=""):
        self.rows, self.one_time, self.placeholder = [list(r) for r in rows], one_time, placeholder

    def to_api(self):
        value = {"keyboard": [[{"text": str(t)} for t in row] for row in self.rows],
                 "resize_keyboard": True, "one_time_keyboard": bool(self.one_time)}
        if self.placeholder:
            value["input_field_placeholder"] = self.placeholder
        return value

    @staticmethod
    def remove():
        return _RemoveKeyboard()


class _RemoveKeyboard:
    def to_api(self):
        return {"remove_keyboard": True}


class File:
    """A file to upload (up to 20 MB): File("report.pdf") or File(b"bytes", "name.txt")."""

    def __init__(self, data, name=None, mime=None):
        if isinstance(data, (str, os.PathLike)):
            with open(data, "rb") as f:
                self.data = f.read()
            self.name = name or os.path.basename(str(data))
        else:
            self.data = bytes(data)
            self.name = name or "file"
        self.mime = mime or mimetypes.guess_type(self.name)[0] or "application/octet-stream"


# ---------- what your handlers receive ----------

class User:
    def __init__(self, raw):
        raw = raw or {}
        self.id = raw.get("id")
        self.first_name = raw.get("first_name", "")
        self.username = raw.get("username")
        self.language = raw.get("language_code")
        self.is_bot = raw.get("is_bot", False)
        self.raw = raw

    def __repr__(self):
        return f"User({self.id}, {self.first_name!r})"


class Message:
    """A message in a chat. Your handlers receive the person's message; send/edit return the bot's message."""

    def __init__(self, bot, raw):
        self.bot, self.raw = bot, raw
        self.id = raw.get("message_id")
        self.chat_id = (raw.get("chat") or {}).get("id")
        self.user = User(raw.get("from"))
        self.text = raw.get("text") or raw.get("caption") or ""
        self.date = raw.get("date")
        self.command, self.args = None, []
        if self.text.startswith("/"):
            head, *rest = self.text.split()
            self.command = head[1:].split("@")[0].lower()
            self.args = rest

    def reply(self, text, **options):
        return self.bot.send(self.chat_id, text, **options)

    def reply_photo(self, photo, caption=None, **options):
        return self.bot.send_photo(self.chat_id, photo, caption=caption, **options)

    def reply_file(self, file, caption=None, **options):
        return self.bot.send_file(self.chat_id, file, caption=caption, **options)

    def typing(self, action="typing"):
        return self.bot.typing(self.chat_id, action)

    def edit(self, text, **options):
        return self.bot.edit(self.chat_id, self.id, text, **options)

    def delete(self):
        return self.bot.delete(self.chat_id, self.id)


class Press:
    """Someone pressed one of your buttons. Call answer() quickly, the button spins until you do."""

    def __init__(self, bot, raw):
        self.bot, self.raw = bot, raw
        self.id = raw.get("id")
        self.data = raw.get("data", "")
        self.user = User(raw.get("from"))
        self.message = Message(bot, raw.get("message") or {})
        self.chat_id = self.message.chat_id
        self.answered = False

    def answer(self, text=None, alert=False):
        self.answered = True
        params = {"callback_query_id": self.id, "show_alert": alert}
        if text:
            params["text"] = text
        return self.bot.call("answerCallbackQuery", params)

    def edit(self, text, **options):
        """Change the message the button belongs to."""
        return self.message.edit(text, **options)

    def reply(self, text, **options):
        return self.bot.send(self.chat_id, text, **options)


# ---------- the bot ----------

class Bot:
    def __init__(self, token=None, api=None):
        self.token = (token or os.environ.get("PASSGRAM_BOT_TOKEN") or "").strip()
        if not self.token:
            raise PassGramError(401, "No bot token. Get one from Zbot in the PassGram app (/newbot).")
        self.api = (api or os.environ.get("PASSGRAM_API") or DEFAULT_API).rstrip("/")
        self._commands, self._buttons, self._texts, self._messages = {}, {}, {}, []
        self._any_button = None
        self.on_error = None

    # -- raw access to any Bot API method --
    def call(self, method, params=None, files=None, timeout=30):
        url = f"{self.api}/bot{self.token}/{method}"
        params = {k: v for k, v in (params or {}).items() if v is not None}
        if files:
            body, ctype = _multipart(params, files)
        else:
            body, ctype = json.dumps(params).encode(), "application/json"
        req = urllib.request.Request(url, data=body, method="POST", headers={"Content-Type": ctype, "User-Agent": f"passgram-python/{__version__}"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                data = json.loads(res.read().decode())
        except urllib.error.HTTPError as e:
            try:
                data = json.loads(e.read().decode())
            except Exception:
                raise PassGramError(e.code, e.reason)
        if not data.get("ok"):
            code = data.get("error_code", 500)
            if code == 401:
                raise PassGramError(401, "The server rejected this token. Check it in Zbot or send /revoke for a new one.")
            err = PassGramError(code, data.get("description", "Unknown error"))
            err.retry_after = (data.get("parameters") or {}).get("retry_after")
            raise err
        return data.get("result")

    @staticmethod
    def _extras(buttons=None, keyboard=None, format=None, reply_to=None):
        out = {}
        markup = buttons or keyboard
        if markup is not None:
            out["reply_markup"] = markup.to_api()
        if FORMATS.get(format):
            out["parse_mode"] = FORMATS[format]
        if reply_to:
            out["reply_parameters"] = {"message_id": reply_to}
        return out

    # -- sending --
    def me(self):
        return User(self.call("getMe"))

    def send(self, chat_id, text, buttons=None, keyboard=None, format=None, reply_to=None):
        """Send text. format: "html" or "markdown". buttons: Buttons(...). keyboard: Keyboard(...) or Keyboard.remove()."""
        return Message(self, self.call("sendMessage", {"chat_id": chat_id, "text": text, **self._extras(buttons, keyboard, format, reply_to)}))

    def _media(self, method, field, chat_id, item, caption, options):
        params = {"chat_id": chat_id, "caption": caption, **self._extras(**options)}
        if isinstance(item, str) and item.startswith("https://"):
            return Message(self, self.call(method, {**params, field: item}))
        file = item if isinstance(item, File) else File(item)
        return Message(self, self.call(method, {k: json.dumps(v) if isinstance(v, dict) else v for k, v in params.items()}, files={field: file}, timeout=120))

    def send_photo(self, chat_id, photo, caption=None, **options):
        """photo: an https:// link (any size, from your server) or a file to upload (path, bytes or File)."""
        return self._media("sendPhoto", "photo", chat_id, photo, caption, options)

    def send_video(self, chat_id, video, caption=None, **options):
        return self._media("sendVideo", "video", chat_id, video, caption, options)

    def send_audio(self, chat_id, audio, caption=None, **options):
        return self._media("sendAudio", "audio", chat_id, audio, caption, options)

    def send_file(self, chat_id, file, caption=None, **options):
        """file: an https:// link, a path, or File(bytes, "name.ext"). Uploads up to 20 MB."""
        return self._media("sendDocument", "document", chat_id, file, caption, options)

    def typing(self, chat_id, action="typing"):
        return self.call("sendChatAction", {"chat_id": chat_id, "action": action})

    def edit(self, chat_id, message_id, text, buttons=None, format=None):
        params = {"chat_id": chat_id, "message_id": message_id, "text": text, **self._extras(buttons=buttons, format=format)}
        return Message(self, self.call("editMessageText", params))

    def delete(self, chat_id, message_id):
        return self.call("deleteMessage", {"chat_id": chat_id, "message_id": message_id})

    def set_commands(self, commands):
        """{"start": "Main menu", "help": "How it works"}"""
        items = commands.items() if isinstance(commands, dict) else commands
        return self.call("setMyCommands", {"commands": [{"command": c, "description": d} for c, d in items]})

    # -- handlers (decorators) --
    def command(self, *names):
        """@bot.command("start") runs for /start (msg.args holds the words after it)."""
        def register(fn):
            for n in names:
                self._commands[n.lower().lstrip("/")] = fn
            return fn
        return register

    def button(self, *values):
        """@bot.button("photo") runs when a button with that value is pressed. @bot.button() catches every press."""
        def register(fn):
            if not values:
                self._any_button = fn
            for v in values:
                self._buttons[str(v)] = fn
            return fn
        return register

    def text(self, *texts):
        """@bot.text("Good", "Bad") runs for those exact messages (handy with Keyboard)."""
        def register(fn):
            for t in texts:
                self._texts[t] = fn
            return fn
        return register

    def message(self):
        """@bot.message() runs for any other text message."""
        def register(fn):
            self._messages.append(fn)
            return fn
        return register

    # -- running --
    def _dispatch(self, update):
        if "callback_query" in update:
            press = Press(self, update["callback_query"])
            fn = self._buttons.get(press.data) or self._any_button
            try:
                if fn:
                    fn(press)
            finally:
                if not press.answered:
                    try:
                        press.answer()
                    except PassGramError:
                        pass
            return
        raw = update.get("message")
        if not raw:
            return
        msg = Message(self, raw)
        fn = (self._commands.get(msg.command) if msg.command else None) or self._texts.get(msg.text)
        if fn:
            fn(msg)
        else:
            for handler in self._messages:
                handler(msg)

    def process_update(self, update):
        """Handle one update yourself, e.g. one that arrived at your webhook. Errors go to on_error / are printed."""
        try:
            self._dispatch(update)
        except Exception as e:
            if self.on_error:
                self.on_error(e, update)
            else:
                traceback.print_exc()

    def run(self, timeout=25):
        """Wait for updates and call your handlers. Stops with Ctrl+C."""
        try:
            me = self.me()
        except PassGramError as e:
            if e.code == 401:
                raise PassGramError(401, "The server rejected this token. Check it in Zbot or send /revoke for a new one.") from None
            raise
        self.call("deleteWebhook")
        print(f"PassGram bot @{me.username} is running (id {me.id}). Ctrl+C to stop.", flush=True)
        offset = 0
        while True:
            try:
                updates = self.call("getUpdates", {"offset": offset, "timeout": timeout}, timeout=timeout + 15)
            except KeyboardInterrupt:
                print("Stopped.")
                return
            except PassGramError as e:
                if e.code == 401:
                    raise
                time.sleep(getattr(e, "retry_after", None) or 3)
                continue
            except (urllib.error.URLError, TimeoutError, OSError):
                time.sleep(3)
                continue
            for update in updates:
                offset = update["update_id"] + 1
                try:
                    self._dispatch(update)
                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    if self.on_error:
                        self.on_error(e, update)
                    else:
                        traceback.print_exc()


def _multipart(fields, files):
    boundary = "passgram" + uuid.uuid4().hex
    out = bytearray()
    for name, value in fields.items():
        out += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
    for name, file in files.items():
        safe = file.name.replace('"', "_").replace("\r", "").replace("\n", "")
        out += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{safe}"\r\nContent-Type: {file.mime}\r\n\r\n'.encode()
        out += file.data + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


# Windows consoles may not support emoji; never let printing crash a bot.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass
