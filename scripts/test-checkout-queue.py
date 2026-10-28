import asyncio,importlib.util,json,time,datetime
from types import SimpleNamespace
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('queue','Zpass/scripts/zpass_checkout_queue.py');q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
class Ref:
 def __init__(self,db,path):self.db,self.path,self.id=db,path,path.split('/')[-1];self.reference=self
 def get(self,transaction=None):return SimpleNamespace(to_dict=lambda:self.db.rows.get(self.path,{}))
 def update(self,data):self.db.rows.setdefault(self.path,{}).update(data)
class DB:
 def __init__(self):self.rows={}
 def collection(self,name):return SimpleNamespace(document=lambda name2:Ref(self,name+'/'+name2))
 def transaction(self):return SimpleNamespace(update=lambda ref,data:ref.update(data),set=lambda ref,data:ref.update(data))
async def test():
 now=datetime.datetime.now(datetime.timezone.utc)
 base={'uid':'fixture','status':'PENDING','createdAt':now,'productId':'zpass_individual_monthly','provider':'STRIPE','coin':'','origin':'https://zpass.web.app'}
 assert q.validate(base,time.time())
 for change in [{'provider':'PAYPAL'},{'productId':'arbitrary'},{'origin':'https://evil.example'},{'status':'READY'},{'createdAt':now-datetime.timedelta(minutes=11)}]:assert not q.validate(dict(base,**change),time.time())
 assert q.valid_url('https://checkout.stripe.com/c/pay_fixture','STRIPE')
 for url in ['https://checkout.stripe.com.evil.example/','http://checkout.stripe.com/','https://user@checkout.stripe.com/']:assert not q.valid_url(url,'STRIPE')
 db=DB();ref=Ref(db,'web_checkout_requests/fixture-request');ref.update(base);calls=[]
 async def provider(request):calls.append(request);assert request.identity['uid']=='fixture';assert (await request.json())['productId']==base['productId'];return SimpleNamespace(status=200,body=json.dumps({'checkoutUrl':'https://checkout.stripe.com/fixture','invoiceId':'ZP-fixture','sessionId':'cs_fixture'}))
 g={'firestore_db':db,'firebase_auth':SimpleNamespace(get_user=lambda uid:SimpleNamespace(uid=uid,email='fixture@example.com',disabled=False)),'checkout_create_stripe_session_handler':provider}
 import sys,types,contextlib
 firestore=SimpleNamespace(transactional=lambda f:f,SERVER_TIMESTAMP=now)
 sys.modules['google']=types.ModuleType('google');sys.modules['google.cloud']=types.ModuleType('google.cloud');sys.modules['google.cloud'].firestore=firestore
 with contextlib.nullcontext():
  await q.process(g,ref);assert db.rows[ref.path]['status']=='READY';assert db.rows[ref.path]['invoiceId']=='ZP-fixture'
  await q.process(g,ref);assert len(calls)==1
  ref2=Ref(db,'web_checkout_requests/second');ref2.update(base);await q.process(g,ref2);assert db.rows[ref2.path]['status']=='FAILED';assert len(calls)==1
 print('PASS: Firebase queue UID binding, provider URL checks, transaction claim, duplicate prevention, rate limit and READY invoice response; no live provider requests')
asyncio.run(test())

