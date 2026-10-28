import asyncio, importlib.util, json
from types import SimpleNamespace
spec=importlib.util.spec_from_file_location('bridge','Zpass/scripts/zpass_web_bridge.py'); b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
class Response:
 def __init__(self,data,status=200): self.status=status; self.body=json.dumps(data).encode()
class Ref:
 def set(self,data): events.append(('order',data))
class DB:
 def collection(self,name): return self
 def document(self,id): return Ref()
class Request:
 async def json(self): return {'productId':'zpass_individual_monthly'}
events=[]
async def verify(r): return {'uid':'fixture-user'}
async def provider(r): return Response({'sessionId':'cs_fixture','checkoutUrl':'https://checkout.stripe.com/fixture'})
async def notify(m): events.append(('notification',m))
g={'verify_checkout_user':verify,'checkout_create_payment_handler':provider,'checkout_create_stripe_session_handler':provider,'web':SimpleNamespace(json_response=lambda d,status=200:Response(d,status)), 'CHECKOUT_PLANS':{'zpass_individual_monthly':{'amount':5,'name':'Pro'}},'invoice_db':SimpleNamespace(record=lambda *a,**kw:events.append(('invoice',a,kw))),'zpass_id':lambda uid:'ZP-FIXTURE','firestore_db':DB(),'firestore':SimpleNamespace(SERVER_TIMESTAMP='timestamp'),'notify_admin':notify}
b.install(g)
async def test():
 a=await g['checkout_create_stripe_session_handler'](Request()); c=await g['checkout_create_stripe_session_handler'](Request())
 assert json.loads(a.body)['invoiceId'] != json.loads(c.body)['invoiceId']
 assert events[0][1][1]=='fixture-user' and events[1][1]['status']=='PENDING'
 async def denied(r): return None
 g['verify_checkout_user']=denied
 n=len(events); assert (await g['checkout_create_stripe_session_handler'](Request())).status==401; assert len(events)==n
 print('PASS: unique invoice IDs, verified UID binding, pending status, admin notification, unauthenticated rejection; no live requests')
asyncio.run(test())
