import asyncio
import importlib.util
import json
import tempfile
from pathlib import Path
from types import SimpleNamespace
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

spec=importlib.util.spec_from_file_location('support','Zpass/scripts/zpass_support.py')
support=importlib.util.module_from_spec(spec);spec.loader.exec_module(support)

class Stop(Exception):pass
class App:
    def __init__(self):self.sent=[];self.handlers=[]
    def add_handler(self,h,group):self.handlers.append(h)
    async def send_message(self,chat,text,**kw):
        self.sent.append((chat,text,kw));return SimpleNamespace(id=len(self.sent))
class Query:
    def __init__(self,action,sid,user=1):self.data=f'zs:{action}:{sid}';self.from_user=SimpleNamespace(id=user);self.result=[]
    async def answer(self,text,**kw):self.result.append(text)
    def stop_propagation(self):raise Stop()

async def test():
    with tempfile.TemporaryDirectory() as tmp:
        app=App();handler=support.install({'BASE_DIR':tmp,'app':app,'ADMIN_ID':1})
        server=web.Application()
        for action in ['session','message','poll','close']:server.router.add_post('/support/'+action,handler)
        async with TestClient(TestServer(server)) as client:
            async def post(action,payload):return await client.post('/support/'+action,json=payload)
            response=await post('session',{'name':'Ada','language':'tr-TR','message':'Cannot sign in'})
            assert response.status==200;first=await response.json()
            assert [b.text for row in app.sent[0][2]['reply_markup'].inline_keyboard for b in row]==['Accept','Decline','Wait for next person']
            assert (await post('poll',{'id':first['id'],'token':'wrong'})).status==403
            callback=next(h.callback for h in app.handlers if type(h).__name__=='CallbackQueryHandler')
            async def action(a,sid,user=1):
                query=Query(a,sid,user)
                try:await callback(app,query)
                except Stop:pass
                return query
            await action('accept',first['id'],2)
            assert (await (await post('poll',first)).json())['status']=='pending'
            await action('wait',first['id'])
            assert (await (await post('poll',first)).json())['status']=='waiting'
            await action('accept',first['id'])
            assert (await (await post('poll',first)).json())['status']=='active'
            prompt_id=len(app.sent)
            async def reply_text(text,**kw):return None
            message=SimpleNamespace(reply_to_message=SimpleNamespace(id=prompt_id),text='Hello Ada, how can I help?',reply_text=reply_text,stop_propagation=lambda:(_ for _ in ()).throw(Stop()))
            reply=next(h.callback for h in app.handlers if h.callback.__name__=='reply')
            try:await reply(app,message)
            except Stop:pass
            result=await (await post('poll',first)).json()
            assert result['messages'][-1]['text']=='Hello Ada, how can I help?'
            second=await (await post('session',{'name':'Bea','language':'en-US','message':'Help'})).json()
            await action('accept',second['id'])
            assert (await (await post('poll',second)).json())['status']=='waiting'
            assert not any(m['role']=='admin' for m in (await (await post('poll',second)).json())['messages'])
            await post('close',first)
            await action('decline',second['id'])
            assert (await (await post('poll',second)).json())['status']=='declined'
            assert (await post('message',{**second,'message':'after close'})).status==400
            bad=await client.post('/support/session',json={'name':'X','language':'en-US','message':'x'},headers={'Origin':'https://evil.example'})
            assert bad.status==403
            assert (await post('session',{'name':'X','language':'en-US','message':'x'*2001})).status==400
            print('PASS: Telegram buttons, admin-only actions, queue/busy guard, reply-to-web, session isolation, close/decline, origin and length validation; no live Telegram/Firebase calls')

asyncio.run(test())
