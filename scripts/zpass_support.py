"""Anonymous login support. Capability tokens isolate visitors; Telegram owns admin actions."""
import asyncio
import hashlib
import hmac
import ipaddress
import json
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

TTL = 7 * 86400
LANGUAGES = {'en-US','tr-TR','ku-KU','ar-AR','de-DE','es-ES','es-419','fr-FR','pt-BR','it-IT','hi-IN','id-ID','ja-JP','ko-KR'}

class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.db() as db:
            db.executescript('''CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, token TEXT NOT NULL,
                name TEXT, language TEXT, status TEXT, created REAL, ip TEXT);
                CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, role TEXT, text TEXT);
                CREATE TABLE IF NOT EXISTS prompts(mid INTEGER PRIMARY KEY, sid TEXT);
                CREATE INDEX IF NOT EXISTS support_messages_sid ON messages(sid,id);''')

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:yield db
        finally:db.close()

    def create(self, name, language, message, ip):
        sid, token = secrets.token_hex(12), secrets.token_urlsafe(32)
        with self.db() as db:
            db.execute('DELETE FROM prompts WHERE sid IN (SELECT id FROM sessions WHERE created < ?)', (time.time()-TTL,))
            db.execute('DELETE FROM messages WHERE sid IN (SELECT id FROM sessions WHERE created < ?)', (time.time()-TTL,))
            db.execute('DELETE FROM sessions WHERE created < ?', (time.time()-TTL,))
            if db.execute('SELECT count(*) FROM sessions WHERE ip=? AND created>?', (ip,time.time()-3600)).fetchone()[0] >= 5:
                raise ValueError('rate')
            if db.execute('SELECT count(*) FROM sessions').fetchone()[0] >= 1000:
                raise ValueError('capacity')
            db.execute('INSERT INTO sessions VALUES (?,?,?,?,?,?,?)', (sid,hashlib.sha256(token.encode()).hexdigest(),name,language,'pending',time.time(),ip))
            db.execute('INSERT INTO messages(sid,role,text) VALUES (?,?,?)', (sid,'user',message))
        return sid, token

    def authorize(self, sid, token):
        with self.db() as db:
            row = db.execute('SELECT * FROM sessions WHERE id=? AND created>?', (sid,time.time()-TTL)).fetchone()
        if not row or not hmac.compare_digest(row['token'], hashlib.sha256(token.encode()).hexdigest()):
            raise PermissionError()
        return dict(row)

    def add(self, sid, role, text):
        with self.db() as db:
            row = db.execute('SELECT status FROM sessions WHERE id=? AND created>?', (sid,time.time()-TTL)).fetchone()
            if not row or row['status'] in ('closed','declined') or (role=='admin' and row['status']!='active'):
                raise ValueError('closed')
            count = db.execute('SELECT count(*) FROM messages WHERE sid=?', (sid,)).fetchone()[0]
            if count >= 200: raise ValueError('limit')
            db.execute('INSERT INTO messages(sid,role,text) VALUES (?,?,?)', (sid,role,text))

    def transition(self, sid, action):
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT status FROM sessions WHERE id=? AND created>?', (sid,time.time()-TTL)).fetchone()
            if not row or row['status'] in ('closed','declined'): raise ValueError('ended')
            status = {'accept':'active','decline':'declined','wait':'waiting','close':'closed'}[action]
            if status=='active' and db.execute('SELECT id FROM sessions WHERE status="active" AND id<>? AND created>?', (sid,time.time()-TTL)).fetchone():
                status='waiting'
            db.execute('UPDATE sessions SET status=? WHERE id=?', (status,sid))
        return status

    def poll(self, sid, after):
        with self.db() as db:
            row=db.execute('SELECT status FROM sessions WHERE id=?', (sid,)).fetchone()
            messages=[dict(r) for r in db.execute('SELECT id,role,text FROM messages WHERE sid=? AND id>? ORDER BY id LIMIT 200', (sid,after))]
        return {'status':row['status'],'messages':messages}

def install(g):
    from aiohttp import web
    from pyrogram import filters, handlers, enums
    from pyrogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ForceReply
    store=Store(Path(g['BASE_DIR'])/'data'/'zpass-support.db')
    app, admin = g['app'], g['ADMIN_ID']
    last_send = {}

    def keyboard(sid):
        return InlineKeyboardMarkup([[InlineKeyboardButton('Accept',callback_data='zs:accept:'+sid),
            InlineKeyboardButton('Decline',callback_data='zs:decline:'+sid)],
            [InlineKeyboardButton('Wait for next person',callback_data='zs:wait:'+sid)]])

    async def prompt(sid, text):
        sent=await app.send_message(admin, text,parse_mode=enums.ParseMode.DISABLED,reply_markup=ForceReply(selective=True))
        with store.db() as db: db.execute('INSERT OR REPLACE INTO prompts VALUES (?,?)',(sent.id,sid))

    async def notice(sid):
        with store.db() as db:
            row=db.execute('SELECT * FROM sessions WHERE id=?',(sid,)).fetchone()
            last=db.execute('SELECT text FROM messages WHERE sid=? AND role="user" ORDER BY id DESC LIMIT 1',(sid,)).fetchone()
        await app.send_message(admin,f"Z Pass login support\nName: {row['name']}\nLanguage: {row['language']}\nRequest: {sid}\nStatus: {row['status']}\n\n{last['text']}",parse_mode=enums.ParseMode.DISABLED,reply_markup=keyboard(sid))

    async def handle(request):
        try:
            origin=request.headers.get('Origin','')
            if origin and origin not in {'https://zpass.web.app','http://localhost:4178','http://127.0.0.1:4178'}:
                return web.json_response({'error':'origin not allowed'},status=403)
            if request.content_length and request.content_length>12000: return web.json_response({'error':'too large'},status=413)
            payload=await request.json()
            if not isinstance(payload,dict):raise ValueError('payload')
            action=request.path.rsplit('/',1)[-1]
            if action=='session':
                name=str(payload.get('name','')).strip();message=str(payload.get('message','')).strip()
                language=str(payload.get('language','en-US'))
                if not 1<=len(name)<=80 or not 1<=len(message)<=2000 or language not in LANGUAGES:raise ValueError('input')
                # Single-host tunnel: peer address is intentionally conservative, not a client-spoofed header.
                peer=request.remote or 'unknown'
                if peer in ('127.0.0.1','::1') and request.headers.get('CF-Connecting-IP'):
                    try:peer=str(ipaddress.ip_address(request.headers['CF-Connecting-IP']))
                    except ValueError:pass
                ip=hashlib.sha256(peer.encode()).hexdigest()
                sid,token=store.create(name,language,message,ip)
                try: await notice(sid)
                except Exception:
                    # No successful delivery means no misleading pending confirmation.
                    with store.db() as db:
                        db.execute('DELETE FROM sessions WHERE id=?',(sid,));db.execute('DELETE FROM messages WHERE sid=?',(sid,))
                    return web.json_response({'error':'support offline'},status=503)
                return web.json_response({'id':sid,'token':token,'status':'pending'},headers={'Cache-Control':'no-store'})
            sid=str(payload.get('id',''));token=str(payload.get('token',''))
            row=store.authorize(sid,token)
            if action=='poll':
                return web.json_response(store.poll(sid,max(0,int(payload.get('after',0)))),headers={'Cache-Control':'no-store'})
            if action=='close':
                if row['status'] not in ('closed','declined'):store.transition(sid,'close')
                return web.json_response({'ok':True})
            if action=='message':
                text=str(payload.get('message','')).strip()
                if not 1<=len(text)<=2000:raise ValueError('input')
                # Serialize through the single aiohttp loop; wait for Telegram before confirming delivery.
                if row['status'] in ('closed','declined'):raise ValueError('ended')
                if time.monotonic()-last_send.get(sid,0)<2:
                    return web.json_response({'error':'slow down'},status=429)
                with store.db() as db:
                    if db.execute('SELECT count(*) FROM messages WHERE sid=?',(sid,)).fetchone()[0]>=200:
                        raise ValueError('limit')
                last_send[sid]=time.monotonic()
                if len(last_send)>1000:
                    cutoff=time.monotonic()-3600
                    for key in list(last_send):
                        if last_send[key]<cutoff:last_send.pop(key,None)
                if row['status']=='active':await prompt(sid,f"Z Pass · {row['name']} · {sid}\n\n{text}\n\nReply to this message to answer this visitor.")
                else:await app.send_message(admin,f"Z Pass · {row['name']} · {sid}\n\n{text}",parse_mode=enums.ParseMode.DISABLED,reply_markup=keyboard(sid))
                store.add(sid,'user',text)
                return web.json_response({'ok':True})
            return web.json_response({'error':'not found'},status=404)
        except PermissionError:return web.json_response({'error':'invalid session'},status=403)
        except (ValueError,TypeError,json.JSONDecodeError):return web.json_response({'error':'invalid or limited request'},status=400)
        except Exception:return web.json_response({'error':'support unavailable'},status=503)

    async def callback(client, query):
        if query.from_user.id!=admin:await query.answer('Admin only',show_alert=True);query.stop_propagation()
        try:
            _,action,sid=query.data.split(':',2)
            status=store.transition(sid,action)
            if status=='active':
                with store.db() as db:
                    row=db.execute('SELECT name,language FROM sessions WHERE id=?',(sid,)).fetchone()
                    messages=db.execute('SELECT text FROM messages WHERE sid=? AND role="user" ORDER BY id DESC LIMIT 5',(sid,)).fetchall()
                await prompt(sid,f"Accepted: {row['name']} ({row['language']})\nRequest: {sid}\n\n"+'\n'.join(r['text'] for r in reversed(messages))+"\n\nReply here to answer. Use /support to view the queue or end the active conversation.")
            await query.answer('Busy: queued for later' if action=='accept' and status=='waiting' else status,show_alert=True)
        except ValueError:await query.answer('Conversation ended or expired',show_alert=True)
        except Exception:await query.answer('Could not complete action; retry from /support',show_alert=True)
        query.stop_propagation()

    async def reply(client, message):
        if not message.reply_to_message:return
        with store.db() as db: row=db.execute('SELECT sid FROM prompts WHERE mid=?',(message.reply_to_message.id,)).fetchone()
        if not row:return
        try:
            text=(message.text or '').strip()
            if not 1<=len(text)<=2000:raise ValueError('length')
            store.add(row['sid'],'admin',text)
            await message.reply_text('Delivered to the website. Reply to the same prompt to continue.',parse_mode=enums.ParseMode.DISABLED)
        except ValueError:await message.reply_text('Conversation ended, not accepted, or message limit reached.')
        message.stop_propagation()

    async def queue(client, message):
        with store.db() as db: rows=db.execute('SELECT id,name,status FROM sessions WHERE status IN ("pending","waiting","active") AND created>? ORDER BY created LIMIT 20',(time.time()-TTL,)).fetchall()
        if not rows:await message.reply_text('No support requests.')
        for row in rows:
            if row['status']=='active':
                await message.reply_text(f"Active: {row['name']} · {row['id']}",parse_mode=enums.ParseMode.DISABLED,reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton('End conversation',callback_data='zs:close:'+row['id'])]]))
            else:await notice(row['id'])
        message.stop_propagation()

    app.add_handler(handlers.CallbackQueryHandler(callback,filters.regex(r'^zs:')),group=-20)
    app.add_handler(handlers.MessageHandler(queue,filters.private & filters.user(admin) & filters.command('support')),group=-21)
    app.add_handler(handlers.MessageHandler(reply,filters.private & filters.user(admin) & filters.reply & filters.text),group=-20)
    return handle
