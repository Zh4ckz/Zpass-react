"""
Examples and extra details for every Bot API method (used by build-bot-docs.py).
Values are realistic and consistent: the bot @myshop_bot (ID 8513445453) talks to Rezan (Z Pass ID 45957845239).
Every response here has the exact shape the PassGram server returns.
"""
import json

CHAT = 45957845239
BOT = {"id": 8513445453, "is_bot": True, "first_name": "My Shop", "username": "myshop_bot"}
PERSON = {"id": CHAT, "is_bot": False, "first_name": "Rezan", "username": "rezan", "language_code": "tr"}
CHAT_OBJ = {"id": CHAT, "type": "private", "first_name": "Rezan", "username": "rezan"}
DATE = 1794200943


def bot_msg(mid, **fields):
    return {"message_id": mid, "from": BOT, "chat": CHAT_OBJ, "date": DATE, **fields}


def person_msg(mid, text, **fields):
    m = {"message_id": mid, "from": PERSON, "chat": CHAT_OBJ, "date": DATE, "text": text}
    if text.startswith("/"):
        m["entities"] = [{"type": "bot_command", "offset": 0, "length": len(text.split()[0])}]
    m.update(fields)
    return m


KB = {"inline_keyboard": [[{"text": "🛒 Shop", "callback_data": "shop"}, {"text": "📦 Orders", "callback_data": "orders"}],
                          [{"text": "🌐 Website", "url": "https://example.com"}]]}

# name -> dict(params, result, py, js, notes, errors, upload)
EXAMPLES = {
    "getUpdates": dict(
        params={"offset": 7, "timeout": 25},
        result=[{"update_id": 7, "message": person_msg(1, "/start welcome")},
                {"update_id": 8, "callback_query": {"id": "5f1c0a9e2b7d4c3e8a6f1b2c", "from": PERSON, "message": bot_msg(2, text="Pick something:", reply_markup=KB),
                                                     "chat_instance": str(CHAT), "data": "shop"}}],
        py='# bot.run() calls getUpdates for you and sends each update to your handlers.\nupdates = bot.call("getUpdates", {"offset": 7, "timeout": 25})',
        js="// bot.run() calls getUpdates for you and sends each update to your handlers.\nconst updates = await bot.call('getUpdates', { offset: 7, timeout: 25 });",
        notes=["Use the highest <code>update_id</code> you processed + 1 as the next <code>offset</code>. Updates before it are deleted.",
               "With <code>timeout</code>, the request stays open until something arrives (or 25 seconds pass). Set your HTTP client's timeout a bit higher, e.g. 40 seconds.",
               "Updates wait at most 24 hours. If your bot is off longer, older ones are gone.",
               "Do not run two programs with the same token at the same time: they would steal each other's updates."],
        errors=[("409", "A webhook is set. Call deleteWebhook first."), ("400", "<code>limit</code> outside 1–100, or bad <code>offset</code>.")]),
    "setWebhook": dict(
        params={"url": "https://bot.example.com/passgram", "secret_token": "k3y-Only-My-Server-Knows", "drop_pending_updates": False},
        result=True,
        py='bot.call("setWebhook", {"url": "https://bot.example.com/passgram", "secret_token": "k3y-Only-My-Server-Knows"})',
        js="await bot.call('setWebhook', { url: 'https://bot.example.com/passgram', secret_token: 'k3y-Only-My-Server-Knows' });",
        notes=["Your address must be <code>https://</code> and reachable from the internet. Any port works.",
               "Waiting updates are delivered right after you set it (unless you drop them).",
               "Check <code>X-ZPass-Bot-Api-Secret-Token</code> on every request and reject the rest: anyone could guess your address.",
               "Answer within 10 seconds with any 2xx status. Do slow work after answering."],
        errors=[("400", "Not https, contains a username/password, or points at api.zpas.org itself."), ("400", "Secret token with characters other than A–Z, a–z, 0–9, _ and -.")]),
    "deleteWebhook": dict(params={"drop_pending_updates": False}, result=True,
        py='bot.call("deleteWebhook")', js="await bot.call('deleteWebhook');",
        notes=["The SDK's <code>run()</code> calls this for you, so switching from webhook to polling is automatic."]),
    "getWebhookInfo": dict(params={}, result={"url": "https://bot.example.com/passgram", "has_custom_certificate": False, "pending_update_count": 1, "max_connections": 40,
                                              "last_error_date": DATE, "last_error_message": "Wrong response from the webhook: 500"},
        py='info = bot.call("getWebhookInfo")\nprint(info["pending_update_count"], info.get("last_error_message"))',
        js="const info = await bot.call('getWebhookInfo');\nconsole.log(info.pending_update_count, info.last_error_message);",
        notes=["<code>pending_update_count</code> above 0 for a long time means your server is not answering with 2xx."]),
    "getMe": dict(params={}, result={**BOT, "can_join_groups": False, "can_read_all_group_messages": False, "supports_inline_queries": False,
                                     "can_connect_to_business": False, "has_main_web_app": False},
        py='me = bot.me()\nprint(me.id, me.username)', js="const me = await bot.me();\nconsole.log(me.id, me.username);",
        notes=["A good first call: it proves the token works without changing anything."],
        errors=[("401", "Wrong token, or it was replaced with /revoke.")]),
    "logOut": dict(params={}, result=True, py='bot.call("logOut")', js="await bot.call('logOut');",
        notes=["Nothing to log out of on PassGram; exists so libraries that call it keep working."]),
    "close": dict(params={}, result=True, py='bot.call("close")', js="await bot.call('close');"),
    "getChat": dict(params={"chat_id": CHAT}, result={**CHAT_OBJ, "accent_color_id": 0, "max_reaction_count": 0},
        py='chat = bot.call("getChat", {"chat_id": 45957845239})', js="const chat = await bot.call('getChat', { chat_id: 45957845239 });",
        notes=["Only works for people who started your bot."], errors=[("400", "Chat not found: wrong ID, or the person never opened your bot.")]),
    "sendMessage": dict(
        params={"chat_id": CHAT, "text": "<b>Welcome!</b> What would you like to do?", "parse_mode": "HTML", "reply_markup": KB},
        result=bot_msg(3, text="<b>Welcome!</b> What would you like to do?", reply_markup=KB),
        py='from passgram import Buttons\n\nbot.send(45957845239, "<b>Welcome!</b> What would you like to do?", format="html",\n         buttons=Buttons([("🛒 Shop", "shop"), ("📦 Orders", "orders")], [("🌐 Website", "https://example.com")]))',
        js="const { Buttons } = require('./passgram');\n\nawait bot.send(45957845239, '<b>Welcome!</b> What would you like to do?', {\n  format: 'html',\n  buttons: new Buttons([['🛒 Shop', 'shop'], ['📦 Orders', 'orders']], [['🌐 Website', 'https://example.com']]),\n});",
        notes=["In a handler, <code>msg.reply(...)</code> is the same as sending to <code>msg.chat_id</code>.",
               "Leading and trailing spaces are trimmed; an empty text is rejected.",
               "Up to 4096 characters. Split longer texts into several messages."],
        errors=[("403", "The person has not pressed Start in your bot yet."), ("400", "Empty or too long text, unknown parse_mode, or invalid buttons.")]),
    "sendChatAction": dict(params={"chat_id": CHAT, "action": "typing"}, result=True,
        py='msg.typing()               # in a handler\nbot.typing(45957845239, "upload_photo")', js="await msg.typing();               // in a handler\nawait bot.typing(45957845239, 'upload_photo');",
        notes=["Send it right before slow work (an AI answer, a big file). It disappears when your message arrives."]),
    "answerCallbackQuery": dict(params={"callback_query_id": "5f1c0a9e2b7d4c3e8a6f1b2c", "text": "Added to cart ✅"}, result=True,
        py='@bot.button("shop")\ndef shop(press):\n    press.answer("Added to cart ✅")', js="bot.button('shop', (press) => press.answer('Added to cart ✅'));",
        notes=["The SDK answers automatically if your handler forgets, so the button never spins forever.",
               "Each press can be answered once; the ID expires after an hour."],
        errors=[("400", "Query is too old or the ID is invalid.")]),
    "editMessageText": dict(params={"chat_id": CHAT, "message_id": 3, "text": "✅ Order placed!"},
        result=bot_msg(3, text="✅ Order placed!", edit_date=DATE + 30),
        py='@bot.button("buy")\ndef buy(press):\n    press.answer()\n    press.edit("✅ Order placed!")', js="bot.button('buy', async (press) => {\n  await press.answer();\n  await press.edit('✅ Order placed!');\n});",
        notes=["Only your bot's own messages can be edited.", "Without <code>reply_markup</code> the buttons stay; send an empty keyboard to remove them."],
        errors=[("400", "Message to edit not found (wrong ID or not your message).")]),
    "editMessageCaption": dict(params={"chat_id": CHAT, "message_id": 4, "caption": "Sold out"},
        result=bot_msg(4, caption="Sold out", photo=[{"file_id": "u3f9b2c1d0e8a7b6c5d4e3f2a", "file_unique_id": "u3f9b2c1d0e8a7b6", "width": 0, "height": 0}], edit_date=DATE + 60),
        py='bot.call("editMessageCaption", {"chat_id": 45957845239, "message_id": 4, "caption": "Sold out"})', js="await bot.call('editMessageCaption', { chat_id: 45957845239, message_id: 4, caption: 'Sold out' });"),
    "editMessageReplyMarkup": dict(params={"chat_id": CHAT, "message_id": 3}, result=bot_msg(3, text="Pick something:"),
        py='bot.call("editMessageReplyMarkup", {"chat_id": 45957845239, "message_id": 3})  # removes the buttons', js="await bot.call('editMessageReplyMarkup', { chat_id: 45957845239, message_id: 3 }); // removes the buttons",
        notes=["Removing buttons after they are used stops people from pressing them twice."]),
    "deleteMessage": dict(params={"chat_id": CHAT, "message_id": 3}, result=True, py='msg.delete()', js="await msg.delete();",
        errors=[("400", "Message to delete not found.")]),
    "deleteMessages": dict(params={"chat_id": CHAT, "message_ids": [3, 4, 5]}, result=True,
        py='bot.call("deleteMessages", {"chat_id": 45957845239, "message_ids": [3, 4, 5]})', js="await bot.call('deleteMessages', { chat_id: 45957845239, message_ids: [3, 4, 5] });"),
    "setMyCommands": dict(params={"commands": [{"command": "start", "description": "Main menu"}, {"command": "orders", "description": "My orders"}]}, result=True,
        py='bot.set_commands({"start": "Main menu", "orders": "My orders"})', js="await bot.setCommands({ start: 'Main menu', orders: 'My orders' });",
        notes=["People see this list when they tap <b>Menu</b> or type <code>/</code>.", "It replaces the whole list each time."],
        errors=[("400", "Bad command name, empty/too long description, duplicates, or more than 100.")]),
    "getMyCommands": dict(params={}, result=[{"command": "start", "description": "Main menu"}, {"command": "orders", "description": "My orders"}],
        py='bot.call("getMyCommands")', js="await bot.call('getMyCommands');"),
    "deleteMyCommands": dict(params={}, result=True, py='bot.call("deleteMyCommands")', js="await bot.call('deleteMyCommands');"),
    "setMyName": dict(params={"name": "My Shop"}, result=True, py='bot.call("setMyName", {"name": "My Shop"})', js="await bot.call('setMyName', { name: 'My Shop' });",
        notes=["A verified bot keeps its blue check. Verified names should stay stable; see <a href=\"/bot#remove-a-check\">verification</a>."]),
    "getMyName": dict(params={}, result={"name": "My Shop"}, py='bot.call("getMyName")', js="await bot.call('getMyName');"),
    "setMyDescription": dict(params={"description": "Order coffee in 10 seconds. Press Start!"}, result=True,
        py='bot.call("setMyDescription", {"description": "Order coffee in 10 seconds. Press Start!"})', js="await bot.call('setMyDescription', { description: 'Order coffee in 10 seconds. Press Start!' });"),
    "getMyDescription": dict(params={}, result={"description": "Order coffee in 10 seconds. Press Start!"}, py='bot.call("getMyDescription")', js="await bot.call('getMyDescription');"),
    "setMyShortDescription": dict(params={"short_description": "Coffee to go ☕"}, result=True,
        py='bot.call("setMyShortDescription", {"short_description": "Coffee to go ☕"})', js="await bot.call('setMyShortDescription', { short_description: 'Coffee to go ☕' });"),
    "getMyShortDescription": dict(params={}, result={"short_description": "Coffee to go ☕"}, py='bot.call("getMyShortDescription")', js="await bot.call('getMyShortDescription');"),
    "setChatMenuButton": dict(params={"menu_button": {"type": "web_app", "text": "Open shop", "web_app": {"url": "https://shop.example.com/app"}}}, result=True,
        py='bot.call("setChatMenuButton", {"menu_button": {"type": "web_app", "text": "Open shop",\n                                    "web_app": {"url": "https://shop.example.com/app"}}})',
        js="await bot.call('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Open shop', web_app: { url: 'https://shop.example.com/app' } } });",
        notes=["A mini app is your own web page opened inside the chat. Design it for phones and never ask for PassGram passwords or codes."]),
    "getChatMenuButton": dict(params={}, result={"type": "commands"}, py='bot.call("getChatMenuButton")', js="await bot.call('getChatMenuButton');"),
}

MEDIA = {"sendPhoto": ("photo", "https://cdn.example.com/latte.jpg", "send_photo", "sendPhoto"),
         "sendVideo": ("video", "https://cdn.example.com/how-we-roast.mp4", "send_video", "sendVideo"),
         "sendAnimation": ("animation", "https://cdn.example.com/steam.gif", None, None),
         "sendAudio": ("audio", "https://cdn.example.com/jingle.mp3", "send_audio", "sendAudio"),
         "sendVoice": ("voice", "https://cdn.example.com/hello.ogg", None, None),
         "sendVideoNote": ("video_note", "https://cdn.example.com/round.mp4", None, None),
         "sendSticker": ("sticker", "https://cdn.example.com/cup.webp", None, None),
         "sendDocument": ("document", "https://cdn.example.com/menu.pdf", "send_file", "sendFile")}

for name, (field, url, py_fn, js_fn) in MEDIA.items():
    unique = "u7a1c3e5b9d2f4a6c8e0b1d3f"
    media = {"file_id": unique, "file_unique_id": unique[:16]}
    if field == "photo":
        shape = {"photo": [{**media, "width": 0, "height": 0}]}
    elif field in ("video", "animation"):
        shape = {field: {**media, "file_name": url.rsplit("/", 1)[1], "width": 0, "height": 0, "duration": 0}}
    elif field == "audio":
        shape = {"audio": {**media, "file_name": url.rsplit("/", 1)[1], "duration": 0}}
    elif field == "voice":
        shape = {"voice": {**media, "duration": 0}}
    elif field == "video_note":
        shape = {"video_note": {**media, "length": 0, "duration": 0}}
    elif field == "sticker":
        shape = {"sticker": {**media, "type": "regular", "width": 0, "height": 0, "is_animated": False, "is_video": False}}
    else:
        shape = {"document": {**media, "file_name": url.rsplit("/", 1)[1]}}
    caption = {"photo": "Special of the day ☕", "video": "How we roast", "document": "Our menu"}.get(field, "")
    params = {"chat_id": CHAT, field: url, **({"caption": caption} if caption else {})}
    if py_fn:
        py = f'# a link from your server (any size)\nbot.{py_fn}(45957845239, "{url}"' + (f', caption="{caption}"' if caption else "") + ')'
        js = f"// a link from your server (any size)\nawait bot.{js_fn}(45957845239, '{url}'" + (f", {{ caption: '{caption}' }}" if caption else "") + ");"
        if field in ("photo", "document"):
            local = "latte.jpg" if field == "photo" else "menu.pdf"
            py += f'\n\n# or upload a file (up to 20 MB)\nbot.{py_fn}(45957845239, File("{local}"))'
            js += f"\n\n// or upload a file (up to 20 MB)\nawait bot.{js_fn}(45957845239, new File('{local}'));"
    else:
        py = f'bot.call("{name}", {json.dumps(params, ensure_ascii=False)})'
        js = f"await bot.call('{name}', {json.dumps(params, ensure_ascii=False)});"
    EXAMPLES[name] = dict(
        params=params, result=bot_msg(5, **shape, **({"caption": caption} if caption else {})), py=py, js=js, upload=field,
        notes=["<b>Link</b>: PassGram stores nothing, the app loads it from your server. Any size.",
               "<b>Upload</b>: up to 20 MB, kept until the person downloads it once (max 24 hours), then deleted.",
               "A <code>file_id</code> cannot be sent again; upload again or use a link."],
        errors=[("413", "Upload larger than 20 MB: use a link instead."), ("400", "Field missing, http:// link, or a file_id from elsewhere.")])
