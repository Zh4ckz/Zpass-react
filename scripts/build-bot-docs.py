"""
Builds the bot documentation pages for docs.zpas.org:
  public/subdomain/docs/bot.html   -> docs.zpas.org/bot      (everything about bots on PassGram)
  public/subdomain/docs/api.html   -> docs.zpas.org/bot/api  (full Bot API reference + changelog)

Every heading gets an id and a "#" link, e.g. docs.zpas.org/bot/api#sendMessage.
Edit the data below and run:  python scripts/build-bot-docs.py
All text is PassGram's own; keep it that way (do not paste other platforms' documentation).
"""
import html
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "subdomain", "docs")
E = html.escape

# ---------------------------------------------------------------- helpers
def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

def h(level, text, anchor=None):
    anchor = anchor or slug(re.sub(r"<[^>]+>", "", text))
    return f'<h{level} id="{anchor}">{text}<a class="anchor" href="#{anchor}" aria-label="Link to this section">#</a></h{level}>'

def code_tabs(tabs):
    bar = "".join(f'<button{" class=on" if i == 0 else ""}>{E(name)}</button>' for i, (name, _) in enumerate(tabs))
    pres = "".join(f'<pre{" class=on" if i == 0 else ""}>{E(code.strip())}</pre>' for i, (_, code) in enumerate(tabs))
    return f'<div class="tabs"><div class="tabbar">{bar}<button class="copy">Copy</button></div>{pres}</div>'

def table(head, rows):
    th = "".join(f"<th>{c}</th>" for c in head)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f"<table><tr>{th}</tr>{tr}</table>"

def note(kind, title, text):
    return f'<div class="note {kind}"><b>{title}</b><span>{text}</span></div>'

def page(title, description, side, body, active):
    nav = "".join(f'<a href="{href}"{" class=on" if href == active else ""}>{label}</a>' for href, label in [("/", "Docs home"), ("/bot", "Bots"), ("/bot/api", "Bot API reference")])
    side_html = "".join(f"<h4>{group}</h4>" + "".join(f'<a href="#{a}">{E(t)}</a>' for a, t in links) for group, links in side)
    return f"""<!doctype html>
<html lang="en" data-sub="docs">
<head>
<script src="/subdomain/docs/resources/js/pay-host.js?v=2"></script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(description)}">
<link rel="icon" type="image/png" href="/subdomain/docs/resources/assets/app-logo/zpass.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/subdomain/docs/resources/css/8xk9e0et8w.css?v=2">
</head>
<body>
<header class="top">
  <button class="burger" aria-label="Menu" onclick="document.body.classList.toggle('open')">☰</button>
  <a class="brand" href="/"><span class="mark">P</span>PassGram <span class="pill">Docs</span></a>
  <nav>{nav}<a class="btn" href="https://zpas.org/login">Open PassGram</a></nav>
</header>
<div class="layout">
<aside class="side" id="side">{side_html}</aside>
<main>
{body}
<div class="foot"><span>© 2026 PassGram</span><span><a href="https://zpas.org/legal/terms">Terms</a> · <a href="https://zpas.org/legal/privacy">Privacy</a> · <a href="https://zpas.org/legal/security">Security</a></span></div>
</main>
</div>
<script src="/subdomain/docs/resources/js/nsnmi7dano.js" defer></script>
<script>
// The page is loaded into docs.zpas.org after the first paint, so jump to #anchor once it is visible.
(function(){{function go(){{var id=decodeURIComponent(location.hash.slice(1));if(!id)return;var el=document.getElementById(id);if(el)el.scrollIntoView();}}
setTimeout(go,150);setTimeout(go,700);window.addEventListener('hashchange',go);}})();
</script>
</body>
</html>
"""

def section(level, title, anchor, inner):
    return f'<section id="sec-{anchor}">{h(level, title, anchor)}{inner}</section>'

# ================================================================ BOT API REFERENCE
T = lambda name: f'<a href="#{name}">{name}</a>'   # link to a type
TRUE = "<code>True</code>"

TYPES = [
    ("Update", "One event for your bot. Exactly one of the optional fields is present.", [
        ("update_id", "Integer", "Increasing number. Send <code>update_id + 1</code> as <code>offset</code> to confirm it."),
        ("message", f"{T('Message')}", "<i>Optional.</i> A new message from a person."),
        ("callback_query", f"{T('CallbackQuery')}", "<i>Optional.</i> A press on one of your inline buttons."),
    ]),
    ("User", "A person or a bot.", [
        ("id", "Integer", "Unique ID. For people this is their <b>Z Pass ID</b> (11 digits); for bots, 10 digits."),
        ("is_bot", "Boolean", "<code>true</code> for bots."),
        ("first_name", "String", "Display name."),
        ("username", "String", "<i>Optional.</i> Username without <code>@</code>."),
        ("language_code", "String", "<i>Optional.</i> The person's app language, e.g. <code>tr</code>, <code>en</code>."),
    ]),
    ("BotUser", "What <a href=\"#getMe\">getMe</a> returns: a " + T("User") + " plus these fields (all <code>false</code> today).", [
        ("can_join_groups", "Boolean", "Bots cannot be added to groups yet."),
        ("can_read_all_group_messages", "Boolean", "—"),
        ("supports_inline_queries", "Boolean", "Inline mode is not available yet."),
        ("can_connect_to_business", "Boolean", "—"),
        ("has_main_web_app", "Boolean", "—"),
    ]),
    ("Chat", "A conversation. Bots only have private chats with people.", [
        ("id", "Integer", "Same as the person's user ID."),
        ("type", "String", "Always <code>private</code>."),
        ("first_name", "String", "The person's display name."),
        ("username", "String", "<i>Optional.</i>"),
    ]),
    ("ChatFullInfo", "What <a href=\"#getChat\">getChat</a> returns: a " + T("Chat") + " plus:", [
        ("accent_color_id", "Integer", "Always <code>0</code>."),
        ("max_reaction_count", "Integer", "Always <code>0</code>."),
    ]),
    ("Message", "A message in a chat.", [
        ("message_id", "Integer", "Counts up within each chat."),
        ("from", T("User"), "Who sent it (a person or your bot)."),
        ("chat", T("Chat"), "The chat it belongs to."),
        ("date", "Integer", "Unix time in seconds."),
        ("edit_date", "Integer", "<i>Optional.</i> Last edit, Unix seconds."),
        ("text", "String", "<i>Optional.</i> Text of a text message."),
        ("entities", f"Array of {T('MessageEntity')}", "<i>Optional.</i> Marks a leading <code>/command</code>."),
        ("caption", "String", "<i>Optional.</i> Caption of a photo, video or file."),
        ("photo", f"Array of {T('PhotoSize')}", "<i>Optional.</i>"),
        ("video", T("Video"), "<i>Optional.</i>"),
        ("animation", T("Animation"), "<i>Optional.</i> GIF or silent video."),
        ("audio", T("Audio"), "<i>Optional.</i>"),
        ("voice", T("Voice"), "<i>Optional.</i>"),
        ("video_note", T("VideoNote"), "<i>Optional.</i>"),
        ("sticker", T("Sticker"), "<i>Optional.</i>"),
        ("document", T("Document"), "<i>Optional.</i> Any other file."),
        ("reply_markup", T("InlineKeyboardMarkup"), "<i>Optional.</i> Inline buttons under the message."),
    ]),
    ("MessageEntity", "A special part of the text.", [
        ("type", "String", "<code>bot_command</code> for a leading <code>/command</code>."),
        ("offset", "Integer", "Start, in UTF-16 units."),
        ("length", "Integer", "Length, in UTF-16 units."),
    ]),
    ("PhotoSize", "A photo. Sizes are reported as 0 because PassGram does not resize.", [
        ("file_id", "String", "ID of this file."),
        ("file_unique_id", "String", "Stable short ID."),
        ("width", "Integer", "0"), ("height", "Integer", "0"),
        ("file_size", "Integer", "<i>Optional.</i> Bytes, for uploads."),
    ]),
    ("Video", "A video. Has <code>file_id</code>, <code>file_unique_id</code>, <code>width</code>, <code>height</code>, <code>duration</code> (0 when unknown) and optional <code>file_name</code>, <code>mime_type</code>, <code>file_size</code>.", []),
    ("Animation", "A GIF or silent video. Same fields as " + T("Video") + ".", []),
    ("Audio", "Music or another sound file. <code>file_id</code>, <code>file_unique_id</code>, <code>duration</code>, optional <code>file_name</code>, <code>mime_type</code>, <code>file_size</code>.", []),
    ("Voice", "A voice message. <code>file_id</code>, <code>file_unique_id</code>, <code>duration</code>, optional <code>mime_type</code>, <code>file_size</code>.", []),
    ("VideoNote", "A round video message. <code>file_id</code>, <code>file_unique_id</code>, <code>length</code>, <code>duration</code>, optional <code>file_size</code>.", []),
    ("Sticker", "A sticker. <code>file_id</code>, <code>file_unique_id</code>, <code>type</code> (<code>regular</code>), <code>width</code>, <code>height</code>, <code>is_animated</code>, <code>is_video</code>, optional <code>file_size</code>.", []),
    ("Document", "Any file.", [
        ("file_id", "String", "ID of this file."), ("file_unique_id", "String", "Stable short ID."),
        ("file_name", "String", "<i>Optional.</i>"), ("mime_type", "String", "<i>Optional.</i>"), ("file_size", "Integer", "<i>Optional.</i>"),
    ]),
    ("InputFile", "A file you upload in a <code>multipart/form-data</code> request, up to <b>20 MB</b>. Put it directly in the field, or put <code>attach://&lt;part&gt;</code> in the field and the file in that part. Instead of a file you can always pass an <code>https://</code> link to a file on your own server (any size).", []),
    ("CallbackQuery", "A press on an inline button.", [
        ("id", "String", "Pass to <a href=\"#answerCallbackQuery\">answerCallbackQuery</a>."),
        ("from", T("User"), "Who pressed."),
        ("message", T("Message"), "The message the button belongs to."),
        ("chat_instance", "String", "Identifies the chat."),
        ("data", "String", "The button's <code>callback_data</code>."),
    ]),
    ("InlineKeyboardMarkup", "Buttons under a message.", [
        ("inline_keyboard", f"Array of Array of {T('InlineKeyboardButton')}", "Rows of buttons. Up to 10 rows, 4 per row, 30 in total."),
    ]),
    ("InlineKeyboardButton", "Use exactly one of <code>callback_data</code> and <code>url</code>.", [
        ("text", "String", "Label, 1–64 characters."),
        ("callback_data", "String", "<i>Optional.</i> 1–64 bytes sent back in a " + T("CallbackQuery") + "."),
        ("url", "String", "<i>Optional.</i> An <code>https://</code> link to open."),
    ]),
    ("ReplyKeyboardMarkup", "Big answer buttons shown above the message box. A tap sends the label as a normal message.", [
        ("keyboard", f"Array of Array of {T('KeyboardButton')}", "Rows. Up to 12 rows, 8 per row, 100 in total."),
        ("one_time_keyboard", "Boolean", "<i>Optional.</i> Hide it after the person answers."),
        ("resize_keyboard", "Boolean", "<i>Optional.</i> Accepted."),
        ("is_persistent", "Boolean", "<i>Optional.</i> Accepted."),
        ("input_field_placeholder", "String", "<i>Optional.</i> Up to 64 characters."),
    ]),
    ("KeyboardButton", "A reply keyboard button: an object with <code>text</code> (1–64 characters), or just the text as a string.", []),
    ("ReplyKeyboardRemove", "Removes the reply keyboard.", [("remove_keyboard", "True", "Always <code>true</code>.")]),
    ("ForceReply", "Asks the app to reply to this message.", [
        ("force_reply", "True", "Always <code>true</code>."),
        ("input_field_placeholder", "String", "<i>Optional.</i>"),
    ]),
    ("ReplyParameters", "Which message you answer.", [("message_id", "Integer", "A message in the same chat.")]),
    ("BotCommand", "One entry of the command menu.", [
        ("command", "String", "1–32 characters: lowercase letters, digits, <code>_</code>; starts with a letter."),
        ("description", "String", "1–100 characters."),
    ]),
    ("MenuButton", "The button next to the message box. One of:", [
        ("type", "String", "<code>commands</code> (default: opens the command menu), <code>web_app</code> (opens a mini app) or <code>default</code> (no button)."),
        ("text", "String", "<code>web_app</code> only: label, 1–32 characters."),
        ("web_app", "Object", "<code>web_app</code> only: <code>{\"url\": \"https://…\"}</code>."),
    ]),
    ("WebhookInfo", "Current webhook status.", [
        ("url", "String", "Webhook address, empty when not set."),
        ("has_custom_certificate", "Boolean", "Always <code>false</code>."),
        ("pending_update_count", "Integer", "Updates waiting to be delivered."),
        ("max_connections", "Integer", "40"),
        ("last_error_date", "Integer", "<i>Optional.</i> Unix seconds of the last failed delivery."),
        ("last_error_message", "String", "<i>Optional.</i> Why it failed."),
        ("allowed_updates", "Array of String", "<i>Optional.</i>"),
    ]),
    ("BotName", "", [("name", "String", "The bot's name.")]),
    ("BotDescription", "", [("description", "String", "Text shown in an empty chat with the bot.")]),
    ("BotShortDescription", "", [("short_description", "String", "Text on the bot's profile.")]),
    ("ResponseParameters", "Extra error details.", [("retry_after", "Integer", "<i>Optional.</i> Seconds to wait after a <code>429</code>.")]),
]

CHAT_ID = ("chat_id", "Integer or String", "Yes", "Chat ID from an update, or the person's <code>@username</code>.")
PARSE = ("parse_mode", "String", "Optional", "<code>HTML</code>, <code>MarkdownV2</code> or <code>Markdown</code>. See <a href=\"#formatting-options\">formatting</a>.")
MARKUP = ("reply_markup", f"{T('InlineKeyboardMarkup')}, {T('ReplyKeyboardMarkup')}, {T('ReplyKeyboardRemove')} or {T('ForceReply')}", "Optional", "Buttons or keyboard. In forms, send it as JSON text.")
REPLY = ("reply_parameters", T("ReplyParameters"), "Optional", "Answer a specific message. <code>reply_to_message_id</code> also works.")

def media_method(name, field, what):
    return (name, f"Sends {what}. Returns the sent {T('Message')}.", [
        CHAT_ID,
        (field, f"{T('InputFile')} or String", "Yes", "Upload (up to 20 MB) or an <code>https://</code> link to the file on your server."),
        ("caption", "String", "Optional", "0–1024 characters."), PARSE, MARKUP, REPLY,
    ])

METHOD_GROUPS = [
    ("Getting updates", [
        ("getUpdates", f"Returns new updates, oldest first, as an Array of {T('Update')}. Not available while a webhook is set (<code>409</code>).", [
            ("offset", "Integer", "Optional", "First update to return. Updates before it are confirmed and removed. A negative value returns only the last few."),
            ("limit", "Integer", "Optional", "1–100, default 100."),
            ("timeout", "Integer", "Optional", "Seconds to wait when nothing is new (long polling). PassGram waits up to 25."),
            ("allowed_updates", "Array of String", "Optional", "<code>message</code>, <code>callback_query</code>. Remembered for later calls."),
        ]),
        ("setWebhook", f"Sends every new update to your HTTPS address as a JSON <code>POST</code>. Returns {TRUE}. See <a href=\"#webhooks\">webhooks</a>.", [
            ("url", "String", "Yes", "Your <code>https://</code> address. Empty removes the webhook."),
            ("secret_token", "String", "Optional", "1–256 characters <code>A-Z a-z 0-9 _ -</code>, sent back in a header with every delivery."),
            ("allowed_updates", "Array of String", "Optional", "Which kinds to deliver."),
            ("drop_pending_updates", "Boolean", "Optional", "Forget updates waiting now."),
        ]),
        ("deleteWebhook", f"Removes the webhook so you can use <a href=\"#getUpdates\">getUpdates</a>. Returns {TRUE}.", [
            ("drop_pending_updates", "Boolean", "Optional", "Forget updates waiting now."),
        ]),
        ("getWebhookInfo", f"Returns {T('WebhookInfo')}. No parameters.", []),
    ]),
    ("Bot info", [
        ("getMe", f"Checks your token. Returns {T('BotUser')}. No parameters.", []),
        ("logOut", f"Accepted for compatibility; nothing to do on PassGram. Returns {TRUE}.", []),
        ("close", f"Accepted for compatibility. Returns {TRUE}.", []),
        ("getChat", f"Returns {T('ChatFullInfo')} for someone who started your bot.", [CHAT_ID]),
    ]),
    ("Sending messages", [
        ("sendMessage", f"Sends text. Returns the sent {T('Message')}.", [
            CHAT_ID, ("text", "String", "Yes", "1–4096 characters."), PARSE, MARKUP, REPLY,
        ]),
        media_method("sendPhoto", "photo", "a photo"),
        media_method("sendVideo", "video", "a video"),
        media_method("sendAnimation", "animation", "a GIF or silent video"),
        media_method("sendAudio", "audio", "an audio file"),
        media_method("sendVoice", "voice", "a voice message"),
        media_method("sendVideoNote", "video_note", "a round video message"),
        media_method("sendSticker", "sticker", "a sticker"),
        media_method("sendDocument", "document", "any file"),
        ("sendChatAction", f"Shows a status such as “typing…” under your bot's name for about 5 seconds, or until your next message. Returns {TRUE}.", [
            CHAT_ID,
            ("action", "String", "Yes", "<code>typing</code>, <code>upload_photo</code>, <code>record_video</code>, <code>upload_video</code>, <code>record_voice</code>, <code>upload_voice</code>, <code>upload_document</code>, <code>choose_sticker</code>, <code>find_location</code>, <code>record_video_note</code>, <code>upload_video_note</code>."),
        ]),
    ]),
    ("Buttons", [
        ("answerCallbackQuery", f"Answers a button press; the button stops spinning. Call it within 10 seconds. Returns {TRUE}.", [
            ("callback_query_id", "String", "Yes", "From the " + T("CallbackQuery") + "."),
            ("text", "String", "Optional", "Up to 200 characters shown as a short notice."),
            ("show_alert", "Boolean", "Optional", "Show it as a dialog instead."),
        ]),
    ]),
    ("Changing messages", [
        ("editMessageText", f"Changes the text of a message your bot sent. Returns the edited {T('Message')}.", [
            CHAT_ID, ("message_id", "Integer", "Yes", "The message to change."),
            ("text", "String", "Yes", "1–4096 characters."), PARSE,
            ("reply_markup", T("InlineKeyboardMarkup"), "Optional", "New buttons. Leave it out to keep the current ones."),
        ]),
        ("editMessageCaption", f"Changes the caption of a photo, video or file. Returns the edited {T('Message')}.", [
            CHAT_ID, ("message_id", "Integer", "Yes", "—"), ("caption", "String", "Optional", "0–1024 characters."), PARSE,
            ("reply_markup", T("InlineKeyboardMarkup"), "Optional", "—"),
        ]),
        ("editMessageReplyMarkup", f"Changes only the buttons. Returns the edited {T('Message')}.", [
            CHAT_ID, ("message_id", "Integer", "Yes", "—"),
            ("reply_markup", T("InlineKeyboardMarkup"), "Optional", "Leave it out to remove the buttons."),
        ]),
        ("deleteMessage", f"Deletes a message in the chat. Returns {TRUE}.", [CHAT_ID, ("message_id", "Integer", "Yes", "—")]),
        ("deleteMessages", f"Deletes several messages; ones that no longer exist are skipped. Returns {TRUE}.", [
            CHAT_ID, ("message_ids", "Array of Integer", "Yes", "1–100 message IDs."),
        ]),
    ]),
    ("Bot profile", [
        ("setMyCommands", f"Replaces the command menu. Returns {TRUE}.", [("commands", f"Array of {T('BotCommand')}", "Yes", "Up to 100, no duplicates.")]),
        ("getMyCommands", f"Returns Array of {T('BotCommand')}.", []),
        ("deleteMyCommands", f"Clears the command menu. Returns {TRUE}.", []),
        ("setMyName", f"Changes the bot's name; a verified badge stays. Returns {TRUE}.", [("name", "String", "Optional", "Up to 64 characters. Empty keeps the current name.")]),
        ("getMyName", f"Returns {T('BotName')}.", []),
        ("setMyDescription", f"Text shown in an empty chat, before Start. Returns {TRUE}.", [("description", "String", "Optional", "Up to 512 characters.")]),
        ("getMyDescription", f"Returns {T('BotDescription')}.", []),
        ("setMyShortDescription", f"Text on the bot's profile. Returns {TRUE}.", [("short_description", "String", "Optional", "Up to 120 characters.")]),
        ("getMyShortDescription", f"Returns {T('BotShortDescription')}.", []),
        ("setChatMenuButton", f"Sets the button next to the message box. Returns {TRUE}.", [("menu_button", T("MenuButton"), "Optional", "Leave it out for the default.")]),
        ("getChatMenuButton", f"Returns {T('MenuButton')}.", []),
    ]),
]

CHANGELOG = [
    ("November 9, 2026", "Bot API 1.0", [
        "The API now speaks the wire format common bot libraries expect. Tested with python-telegram-bot, aiogram, pyTelegramBotAPI, Telegraf, grammY and node-telegram-bot-api: change the server address and existing bot code works.",
        "Numeric IDs: bots get a 10-digit ID (also the first part of new tokens); people are identified by their 11-digit Z Pass ID. Older tokens keep working.",
        "New address <code>https://api.zpas.org/bot&lt;TOKEN&gt;/&lt;method&gt;</code>.",
        "Webhooks: <a href=\"#setWebhook\">setWebhook</a>, <a href=\"#deleteWebhook\">deleteWebhook</a>, <a href=\"#getWebhookInfo\">getWebhookInfo</a>, secret header, automatic retries, and answering with a method call.",
        "Long polling with <code>timeout</code> in <a href=\"#getUpdates\">getUpdates</a>; negative <code>offset</code>; confirmed updates are removed.",
        "Photos, videos, GIFs, audio, voice, round videos, stickers and files, by link (any size) or upload (up to 20 MB, was 5 MB). Uploads also accept <code>attach://</code>.",
        "Formatting with <code>parse_mode</code> (HTML, MarkdownV2, Markdown).",
        "Reply keyboards, <code>remove_keyboard</code> and <code>force_reply</code>.",
        "<a href=\"#editMessageCaption\">editMessageCaption</a>, <a href=\"#deleteMessage\">deleteMessage</a>, <a href=\"#deleteMessages\">deleteMessages</a>, <a href=\"#sendChatAction\">sendChatAction</a>, <a href=\"#getChat\">getChat</a>; edit methods now return the edited message.",
        "Bot profile methods: name, description and short description.",
        "Messages carry <code>entities</code> for a leading <code>/command</code>, and <code>language_code</code> for the person's app language.",
        "Unknown methods return <code>404 Not Found</code>; method names are not case-sensitive.",
        "Official PassGram Bot SDK 1.0 for Python and JavaScript (one file each, no dependencies).",
        "Verify Bot: owners can apply for a blue check for their account or bot.",
    ]),
    ("November 2026", "Bot API preview", [
        "Inline keyboards, button presses (<code>answerCallbackQuery</code>), <code>editMessageText</code> and <code>editMessageReplyMarkup</code>.",
        "<code>sendDocument</code> with a one-time file relay (up to 5 MB).",
        "<code>getMe</code>, <code>getUpdates</code>, <code>sendMessage</code>, commands and the menu button.",
    ]),
]

def build_api():
    side = [("Basics", [("introduction", "Introduction"), ("authorizing", "Your token"), ("making-requests", "Making requests"), ("responses", "Responses"), ("errors", "Errors"), ("limits", "Limits"), ("ids", "IDs"), ("webhooks", "Webhooks"), ("formatting-options", "Formatting options")])]
    for group, methods in METHOD_GROUPS:
        side.append((group, [(m[0], m[0]) for m in methods]))
    side.append(("Available types", [(t[0], t[0]) for t in TYPES]))
    side.append(("More", [("changelog", "Changelog")]))

    b = []
    b.append(f'<div class="hero" id="top"><span class="pill">Bot API · v1.0</span><h1>Bot API <em>reference.</em></h1><p>Every method, parameter and object of the PassGram Bot API. Each title has its own link: click <b>#</b> next to it, or open e.g. <code>docs.zpas.org/bot/api#sendMessage</code>. New here? Start with <a href="/bot">Bots on PassGram</a>.</p></div>')
    b.append(section(2, "Introduction", "introduction",
        "<p>The Bot API is a plain HTTPS interface. You call a method, PassGram answers with JSON. You can use it from any language, with the <a href=\"/bot#official-sdk\">official SDK</a>, or with an existing bot library by changing its server address.</p>"))
    b.append(section(2, "Your token", "authorizing",
        "<p>Every bot has a token from <a href=\"/bot#zbot\">Zbot</a>, for example <code>8513445453:GQk3yXn2…</code>: the bot's ID, a colon and 43 secret characters. Put it in the address, or in a header.</p>" +
        table(["Form", "Example"], [
            ["In the address (what libraries use)", "<code>https://api.zpas.org/bot&lt;TOKEN&gt;/getMe</code>"],
            ["Header", "<code>https://botapi.zpas.org/getMe</code> + <code>Authorization: Bearer &lt;TOKEN&gt;</code>"]]) +
        note("bad", "⚠ Keep it secret", "Anyone with the token controls the bot. If it leaks, send <code>/revoke</code> to Zbot for a new one.")))
    b.append(section(2, "Making requests", "making-requests",
        "<p>Methods accept <b>GET</b> (query string) and <b>POST</b> with JSON, a URL-encoded form, or <code>multipart/form-data</code> (needed to upload files). In forms, objects such as <code>reply_markup</code> are sent as JSON text. Method names are not case-sensitive. JSON bodies may be up to 64 KB.</p>" +
        code_tabs([("cURL", 'curl -X POST https://api.zpas.org/bot$TOKEN/sendMessage \\\n  -H "Content-Type: application/json" \\\n  -d \'{"chat_id": 45957845239, "text": "Hello!"}\''),
                   ("Upload", 'curl -X POST https://api.zpas.org/bot$TOKEN/sendDocument \\\n  -F chat_id=45957845239 -F document=@report.pdf -F caption="Report"')])))
    b.append(section(2, "Responses", "responses",
        "<p>Every answer is a JSON object. On success <code>ok</code> is <code>true</code> and the data is in <code>result</code>. On failure <code>ok</code> is <code>false</code>, with <code>error_code</code>, a readable <code>description</code>, and sometimes " + T("ResponseParameters") + " in <code>parameters</code>.</p>" +
        code_tabs([("Success", '{"ok": true, "result": {"message_id": 3, "date": 1794200943}}'),
                   ("Error", '{"ok": false, "error_code": 400, "description": "Bad Request: chat not found"}'),
                   ("Too many requests", '{"ok": false, "error_code": 429, "description": "Too Many Requests: retry after 60",\n "parameters": {"retry_after": 60}}')])))
    b.append(section(2, "Errors", "errors", table(["Code", "Meaning"], [
        ["<code>400</code>", "A parameter is wrong or missing. Read <code>description</code>."],
        ["<code>401</code>", "The token is wrong or was replaced."],
        ["<code>403</code>", "The person has not started your bot, or PassGram disabled the bot."],
        ["<code>404</code>", "This method does not exist."],
        ["<code>409</code>", "<code>getUpdates</code> while a webhook is set."],
        ["<code>413</code>", "Upload over 20 MB, or request too large."],
        ["<code>429</code>", "Too many requests: wait <code>retry_after</code> seconds."],
        ["<code>5xx</code>", "Temporary problem: retry after a short pause."]])))
    b.append(section(2, "Limits", "limits", table(["What", "Limit"], [
        ["Requests per bot", "120 per minute"], ["Text / caption", "4096 / 1024 characters"],
        ["Inline buttons", "10 rows, 4 per row, 30 per message; <code>callback_data</code> up to 64 bytes"],
        ["Reply keyboard", "12 rows, 8 per row, 100 buttons"],
        ["Upload through PassGram", "20 MB per file; deleted after one download or 24 hours"],
        ["Files sent as links", "No PassGram limit (served by your server)"],
        ["Undelivered updates", "Kept 24 hours"], ["Commands", "100 per bot"], ["Bots per account", "20"]])))
    b.append(section(2, "IDs", "ids",
        "<p>Bots have a 10-digit ID; people have an 11-digit <b>Z Pass ID</b>, the same number they see in the app. In a private chat the chat ID equals the person's user ID. <code>chat_id</code> also accepts <code>@username</code> for people who started your bot. <code>message_id</code> counts up within each chat; <code>update_id</code> counts up per bot.</p>"))
    b.append(section(2, "Webhooks", "webhooks",
        "<p>After <a href=\"#setWebhook\">setWebhook</a>, each " + T("Update") + " is sent to your address as a JSON <code>POST</code>. Answer with any <code>2xx</code> status. If your server fails, the update waits (up to 24 hours) and is sent again, in order, with the next one. With a <code>secret_token</code>, every delivery has it in the <code>X-ZPass-Bot-Api-Secret-Token</code> header (and in <code>X-Telegram-Bot-Api-Secret-Token</code>, which many libraries check). You may answer with one method call as JSON, e.g. <code>{\"method\":\"sendMessage\",\"chat_id\":…,\"text\":\"…\"}</code>.</p>" +
        note("info", "ℹ Polling or webhook?", "Long polling is easiest while developing. Webhooks are instant and do no work while your bot is idle, so prefer them in production.")))
    b.append(section(2, "Formatting options", "formatting-options",
        "<p>Set <code>parse_mode</code> to style text.</p>" + table(["Style", "HTML", "MarkdownV2"], [
            ["Bold", "<code>&lt;b&gt;x&lt;/b&gt;</code>", "<code>*x*</code>"], ["Italic", "<code>&lt;i&gt;x&lt;/i&gt;</code>", "<code>_x_</code>"],
            ["Underline", "<code>&lt;u&gt;x&lt;/u&gt;</code>", "<code>__x__</code>"], ["Strikethrough", "<code>&lt;s&gt;x&lt;/s&gt;</code>", "<code>~x~</code>"],
            ["Spoiler", "<code>&lt;tg-spoiler&gt;x&lt;/tg-spoiler&gt;</code>", "<code>||x||</code>"],
            ["Code", "<code>&lt;code&gt;x&lt;/code&gt;</code>, <code>&lt;pre&gt;x&lt;/pre&gt;</code>", "<code>`x`</code>, <code>```x```</code>"],
            ["Link", "<code>&lt;a href=\"https://…\"&gt;x&lt;/a&gt;</code>", "<code>[x](https://…)</code>"],
            ["Quote", "<code>&lt;blockquote&gt;x&lt;/blockquote&gt;</code>", "<code>&gt;x</code>"]]) +
        "<p>In HTML write <code>&amp;lt;</code> <code>&amp;gt;</code> <code>&amp;amp;</code> for literal characters. In MarkdownV2 put <code>\\</code> before symbols you want to show as they are. <code>Markdown</code> (legacy) supports <code>*bold*</code>, <code>_italic_</code>, <code>`code`</code> and links.</p>"))

    b.append('<h2 id="available-methods">Available methods<a class="anchor" href="#available-methods">#</a></h2>')
    for group, methods in METHOD_GROUPS:
        b.append(h(2, group))
        for name, desc, params in methods:
            inner = f'<div class="method"><span class="tag post">POST</span><span class="url">/bot&lt;TOKEN&gt;/{name}</span><span class="tag live">LIVE</span></div><p>{desc}</p>'
            if params:
                inner += table(["Parameter", "Type", "Required", "Description"], [[f"<code>{p}</code>", t, r, d] for p, t, r, d in params])
            else:
                inner += "<p><i>No parameters.</i></p>"
            b.append(section(3, name, name, inner))

    b.append('<h2 id="available-types">Available types<a class="anchor" href="#available-types">#</a></h2><p>All objects are JSON. Optional fields are left out when empty. New fields may be added; ignore ones you do not know.</p>')
    for name, desc, fields in TYPES:
        inner = f"<p>{desc}</p>" if desc else ""
        if fields:
            inner += table(["Field", "Type", "Description"], [[f"<code>{f}</code>", t, d] for f, t, d in fields])
        b.append(section(3, name, name, inner))

    log = "".join(f'{h(3, f"{date} · {title}", slug(date + "-" + title))}<ul>' + "".join(f"<li>{x}</li>" for x in items) + "</ul>" for date, title, items in CHANGELOG)
    b.append(section(2, "Changelog", "changelog", "<p>What changed in the PassGram Bot API, newest first.</p>" + log))
    return page("Bot API reference — PassGram", "Every method, parameter and object of the PassGram Bot API, with a changelog.", side, "\n".join(b), "/bot/api")

# ================================================================ BOTS ON PASSGRAM (guide)
def build_bot():
    side = [
        ("Start", [("what-is-a-bot", "What is a bot"), ("create-your-bot", "Create your bot"), ("zbot", "Zbot"), ("talk-to-your-bot", "Talk to your bot")]),
        ("Build", [("official-sdk", "Official SDK"), ("existing-libraries", "Existing libraries"), ("plain-http", "Plain HTTP"), ("run-your-bot", "Run your bot"), ("what-bots-can-do", "What bots can do"), ("files-and-media", "Files and media"), ("deep-links", "Links to your bot")]),
        ("Trust", [("verify-bot", "Verify Bot"), ("blue-check", "The blue check"), ("company-names", "Company names"), ("remove-a-check", "Remove a check"), ("rules-for-bots", "Rules for bots"), ("privacy", "Privacy"), ("reports-and-bans", "Reports and bans")]),
        ("Reference", [("limits", "Limits"), ("faq", "FAQ")]),
    ]
    b = []
    b.append('<div class="hero" id="top"><span class="pill">Bots</span><h1>Bots on <em>PassGram.</em></h1><p>Everything about bots: how to make one, how to run it, what it can do, how verification works, and the rules. Every title has its own link (<b>#</b>). The full method list is in the <a href="/bot/api">Bot API reference</a>.</p></div>')
    b.append(section(2, "What is a bot", "what-is-a-bot",
        "<p>A bot is a PassGram account run by a program instead of a person. People chat with it like with anyone else; your program reads their messages and answers through the <a href=\"/bot/api\">Bot API</a>. Bots can answer questions, send files and photos, show buttons, run shops, support desks, alerts and games.</p>"
        "<p>Bots are marked with <b>bot</b> under their name, and they can only write to people who opened them and pressed <b>Start</b>.</p>"))
    b.append(section(2, "Create your bot", "create-your-bot",
        "<ol><li>In the PassGram app, open <a href=\"#zbot\">Zbot</a> (<code>zpas.org/zbot</code>).</li><li>Send <code>/newbot</code>, then the bot's name, then a username ending as you like (4–32 letters, digits or <code>_</code>).</li><li>Zbot shows the bot's <b>token</b> once. Copy it and keep it secret.</li><li>Write your bot with the <a href=\"#official-sdk\">SDK</a> and run it.</li></ol>"))
    b.append(section(2, "Zbot", "zbot",
        "<p><b>Zbot</b> is PassGram's bot for making and managing bots. It only does that; blue checks are handled by <a href=\"#verify-bot\">Verify Bot</a>.</p>" +
        table(["Command", "What it does"], [
            ["<code>/newbot</code>", "Create a bot (up to 20 per account)."], ["<code>/mybots</code>", "Open the bot manager."],
            ["<code>/setname</code>", "Change a bot's name."], ["<code>/setdescription</code>", "Text people see before pressing Start."],
            ["<code>/setabouttext</code>", "Short text on the bot's profile."], ["<code>/setcommands</code>", "The command menu (<code>command - description</code> per line)."],
            ["<code>/token</code>", "How tokens work (shown only once at creation)."], ["<code>/revoke</code>", "Replace the token; the old one stops working at once."],
            ["<code>/id</code>", "Your Z Pass ID, username and link."], ["<code>/cancel</code>", "Stop the current step."]])))
    b.append(section(2, "Talk to your bot", "talk-to-your-bot",
        "<p>Open your bot (search its username or open <code>zpas.org/yourbot</code>) and press <b>Start</b>. Your program receives that as <code>/start</code>. Everything people send arrives as updates; everything your bot sends shows up instantly in their app.</p>"))
    b.append(section(2, "Official SDK", "official-sdk",
        "<p>The PassGram Bot SDK is the easiest way to build a bot: one file for Python or JavaScript, nothing else to install.</p>" +
        table(["Language", "Download", "Needs"], [
            ["Python", '<a href="/subdomain/docs/sdk/passgram.py" download>passgram.py</a>', "Python 3.8+"],
            ["JavaScript", '<a href="/subdomain/docs/sdk/passgram.js" download>passgram.js</a>', "Node.js 18+"]]) +
        code_tabs([("Python", '''from passgram import Bot, Buttons

bot = Bot("YOUR_TOKEN")

@bot.command("start")
def start(msg):
    msg.reply(f"Hi {msg.user.first_name}!", buttons=Buttons([("Say hi", "hi")]))

@bot.button("hi")
def hi(press):
    press.answer("Hello!")

bot.run()'''), ("JavaScript", '''const { Bot, Buttons } = require('./passgram');

const bot = new Bot('YOUR_TOKEN');
bot.command('start', (msg) => msg.reply(`Hi ${msg.user.firstName}!`, { buttons: new Buttons([['Say hi', 'hi']]) }));
bot.button('hi', (press) => press.answer('Hello!'));
bot.run();''')]) +
        "<p>More: <a href=\"/#sdk\">SDK cheat sheet</a>.</p>"))
    b.append(section(2, "Existing libraries", "existing-libraries",
        "<p>Already have a bot? Popular libraries work by changing the server address to <code>https://api.zpas.org</code>.</p>" +
        table(["Library", "Setting"], [
            ["python-telegram-bot", '<code>.base_url("https://api.zpas.org/bot")</code>'],
            ["aiogram 3", '<code>TelegramAPIServer.from_base("https://api.zpas.org")</code>'],
            ["pyTelegramBotAPI", '<code>apihelper.API_URL = "https://api.zpas.org/bot{0}/{1}"</code>'],
            ["Telegraf", "<code>{ telegram: { apiRoot: 'https://api.zpas.org' } }</code>"],
            ["grammY", "<code>{ client: { apiRoot: 'https://api.zpas.org' } }</code>"],
            ["node-telegram-bot-api 0.66", "<code>{ baseApiUrl: 'https://api.zpas.org' }</code>"]])))
    b.append(section(2, "Plain HTTP", "plain-http",
        "<p>No library at all: any language that can send HTTPS requests works. See <a href=\"/bot/api#making-requests\">making requests</a>.</p>"))
    b.append(section(2, "Run your bot", "run-your-bot",
        "<p>Your bot runs on <b>your</b> computer or server, not on PassGram. While it runs, it answers; when you stop it, it goes quiet (messages wait up to 24 hours).</p>" +
        table(["Way", "Good for"], [
            ["<b>Long polling</b> (<code>bot.run()</code>, <a href=\"/bot/api#getUpdates\">getUpdates</a>)", "Your own PC, testing, small bots. No public address needed."],
            ["<b>Webhook</b> (<a href=\"/bot/api#setWebhook\">setWebhook</a>)", "A server with an https address. Instant, and idle bots cost nothing."]])))
    b.append(section(2, "What bots can do", "what-bots-can-do",
        "<ul><li><b>Text</b> with formatting: bold, italic, code, links, spoilers.</li><li><b>Inline buttons</b> under messages, and <b>reply keyboards</b> above the message box.</li><li><b>Photos, videos, GIFs, audio, voice, files</b>.</li><li><b>Edit and delete</b> their messages, show <b>typing…</b>.</li><li>A <b>command menu</b> and a <b>menu button</b> that can open a <b>mini app</b> (your web page inside the chat).</li></ul>" +
        note("info", "ℹ Not yet", "Groups and channels, inline mode, payments and receiving files from people.")))
    b.append(section(2, "Files and media", "files-and-media",
        "<p>Send a <b>link</b> (<code>https://…</code>) to a file on your own server: any size, PassGram stores nothing. Or <b>upload</b> a file up to 20 MB: PassGram only passes it on, keeps it until the person downloads it once (at most 24 hours), then deletes it.</p>"))
    b.append(section(2, "Links to your bot", "deep-links",
        "<p>Share <code>zpas.org/yourbot</code>: it opens the chat with your bot in the app. PassGram's own bots: <code>zpas.org/zbot</code> and <code>zpas.org/verifybot</code>.</p>"))
    b.append(section(2, "Verify Bot", "verify-bot",
        "<p><b>Verify Bot</b> (<code>zpas.org/verifybot</code>) is PassGram's official bot for blue checks. It only does verification.</p>" +
        table(["Command", "What it does"], [
            ["<code>/start</code>, <code>/verify</code>", "Apply for your account or one of your bots."],
            ["<code>/myverify</code>", "Status of your requests (waiting, approved, or rejected with the reason)."],
            ["<code>/unverify</code>", "Remove a blue check from your account or bot."]]) +
        "<p><b>How to apply:</b></p><ol><li>Choose what to verify: your account or one of your bots (you can only apply for things you own).</li><li>Send links to at least <b>2 official accounts</b> on well-known platforms: Instagram, X, YouTube, TikTok, Facebook, your official website or a Wikipedia page.</li><li>Add your Z Pass link (<code>zpas.org/yourname</code>) to the bio of those accounts, so we can see they belong to you.</li><li>Optional: up to 2 press articles that mention you, a company name, and a short note.</li><li>The PassGram team reviews it. Approved checks appear automatically.</li></ol>"))
    b.append(section(2, "The blue check", "blue-check",
        "<p>A blue check means the account or bot is the <b>official</b> one of that person, brand or organization, and PassGram confirmed it. It is not an endorsement of what they say, and it gives no extra features. It appears next to the name in chats, the chat list, search and the profile.</p>"
        "<p>New bots are <b>never</b> verified automatically; only PassGram can grant a check.</p>"))
    b.append(section(2, "Company names", "company-names",
        "<p>Verified organizations can also show a <b>company name</b> next to their name, e.g. <i>Z Pass Inc</i>. You can suggest one when you apply; PassGram decides what is shown (up to 32 characters).</p>"))
    b.append(section(2, "Remove a check", "remove-a-check",
        "<p>A verified name or username should not change. To rename, send <code>/unverify</code> to Verify Bot first, make the change, then apply again.</p>"))
    b.append(section(2, "Rules for bots", "rules-for-bots",
        "<ul><li>Never ask people for passwords, recovery keys, one-time codes or card numbers. PassGram never does.</li><li>No spam, scams, impersonation, malware or illegal content.</li><li>Only message people who started your bot, and stop when they ask.</li><li>Say clearly what your bot does and who runs it.</li><li>Keep your token safe; you are responsible for what your bot does.</li></ul><p>Full rules: <a href=\"https://zpas.org/legal/terms\">Terms</a>.</p>"))
    b.append(section(2, "Privacy", "privacy",
        "<p>Private chats between people are end-to-end encrypted; bots cannot see them. <b>Chats with a bot are different</b>: the bot's owner reads them (the bot must, to answer) and they pass through the PassGram server. Bots only learn a person's Z Pass ID, name, username and app language; never their phone, email, password or vault.</p>"))
    b.append(section(2, "Reports and bans", "reports-and-bans",
        "<p>People can report bots. PassGram sees the bot's owner and can disable or delete bots that break the rules. A disabled bot's API calls return <code>403</code>.</p>"))
    b.append(section(2, "Limits", "limits", table(["What", "Limit"], [
        ["Bots per account", "20"], ["Requests per bot", "120 per minute"], ["Upload", "20 MB per file (links: no limit)"],
        ["Text", "4096 characters"], ["Commands", "100"]]) + "<p>All limits: <a href=\"/bot/api#limits\">Bot API reference</a>.</p>"))
    faq = [
        ("Does my bot work when my PC is off?", "No. Your bot is your program; it runs where you start it. Run it on a server for 24/7. Messages sent while it is off wait up to 24 hours."),
        ("I lost my token.", "Send <code>/revoke</code> to Zbot. You get a new token and the old one stops working."),
        ("Why does my bot get 403?", "The person has not pressed Start in your bot yet, or the bot was disabled."),
        ("Can I use code written for another platform?", "Usually yes. See <a href=\"#existing-libraries\">existing libraries</a>."),
        ("How do I get the blue check?", "Apply with <a href=\"#verify-bot\">Verify Bot</a>."),
    ]
    b.append(section(2, "FAQ", "faq", "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in faq)))
    return page("Bots on PassGram — Docs", "Everything about PassGram bots: Zbot, the SDK, libraries, Verify Bot and the blue check, rules, privacy and limits.", side, "\n".join(b), "/bot")

if __name__ == "__main__":
    for name, content in [("bot.html", build_bot()), ("api.html", build_api())]:
        with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as f:
            f.write(content)
        print("wrote", name, len(content), "bytes")
