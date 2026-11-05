from pathlib import Path
import importlib.util,types,datetime,calendar,ast
import sys
sys.dont_write_bytecode=True
path=Path(r'C:/Users/rezan/Desktop/Bots/Payment-bot/zpass_pay_checkout.py');spec=importlib.util.spec_from_file_location('monthly_pay',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.monthly_terms('zpass_plus_yearly')=={'amountCents':425,'commitmentMonths':12}
assert m.monthly_terms('zpass_plus_monthly')['amountCents']==499
anchor=int(datetime.datetime(2026,11,3,tzinfo=datetime.timezone.utc).timestamp());end1=int(datetime.datetime(2026,12,3,tzinfo=datetime.timezone.utc).timestamp());end2=int(datetime.datetime(2027,1,3,tzinfo=datetime.timezone.utc).timestamp());term=int(datetime.datetime(2027,11,3,tzinfo=datetime.timezone.utc).timestamp())
assert m.commitment_end(anchor,12)==term
leap=int(datetime.datetime(2024,2,29,tzinfo=datetime.timezone.utc).timestamp());assert datetime.datetime.fromtimestamp(m.commitment_end(leap,12),datetime.timezone.utc).day==28
rows={}
class Ref:
 def __init__(self,key):self.key=key
 def get(self,transaction=None):return types.SimpleNamespace(exists=self.key in rows,to_dict=lambda:rows.get(self.key))
 def update(self,data):rows[self.key]={**rows.get(self.key,{}),**data}
class Tx:
 def create(self,ref,data):assert ref.key not in rows;rows[ref.key]=data
 def update(self,ref,data):ref.update(data)
 def set(self,ref,data,merge=False):ref.update(data)
class DB:
 def collection(self,name):return types.SimpleNamespace(document=lambda key:Ref(name+'/'+key))
 def transaction(self):return Tx()
firestore=types.SimpleNamespace(transactional=lambda fn:fn,SERVER_TIMESTAMP=datetime.datetime.now(datetime.timezone.utc));m._context=(DB(),None,None,firestore)
order={'orderId':'a'*64,'uid':'fixture','zPassId':'ZP-ABCDEFGHIJ','productId':'zpass_plus_yearly','amountCents':425,'commitmentMonths':12,'billingModel':'monthly-v1','sessionId':'cs_fixture','status':'CREATED'};rows['pay_orders/'+order['orderId']]=order
sub={'id':'sub_fixture','customer':'cus_fixture','status':'active','start_date':anchor,'latest_invoice':'in_first','metadata':{'pay_checkout':'passgram-org','pay_order_id':order['orderId'],'pay_uid':'fixture'},'items':{'data':[{'quantity':1,'price':{'id':'price_fixture','unit_amount':425,'currency':'usd','recurring':{'interval':'month','interval_count':1}}}]}}
def invoice(key,start,end):return {'id':key,'subscription':sub['id'],'customer':sub['customer'],'status':'paid','amount_paid':425,'currency':'usd','lines':{'data':[{'price':{'id':'price_fixture'},'quantity':1,'amount':425,'period':{'start':start,'end':end}}]}}
first=invoice('in_first',anchor,end1);cancellations=[]
def request(method,path,data=None,key=None):
 if method=='POST':assert int(data['cancel_at'])==term and data['proration_behavior']=='none';sub['cancel_at']=term;cancellations.append(data);return sub
 return sub if path.startswith('subscriptions/') else first
session={'id':'cs_fixture','mode':'subscription','subscription':sub['id'],'payment_status':'paid','currency':'usd','amount_total':425,'client_reference_id':'fixture','metadata':{'pay_checkout':'passgram-org','pay_order_id':order['orderId']}}
m.complete_event({'id':'evt_checkout','type':'checkout.session.completed','data':{'object':session}},request=request)
assert len(cancellations)==1
assert int(rows['subscriptions/fixture']['expiresAt'].timestamp())==end1
m.complete_event({'id':'evt_duplicate','type':'invoice.paid','data':{'object':first}},request=request)
assert int(rows['subscriptions/fixture']['expiresAt'].timestamp())==end1
second=invoice('in_second',end1,end2);m.complete_event({'id':'evt_second','type':'invoice.paid','data':{'object':second}},request=request)
assert int(rows['subscriptions/fixture']['expiresAt'].timestamp())==end2
for change in [{'amount_paid':1},{'currency':'eur'}]:
 try:m.complete_event({'id':'evt_bad','type':'invoice.paid','data':{'object':{**second,'id':'in_bad',**change}}},request=request);raise AssertionError('Invalid invoice accepted')
 except ValueError:pass
m.complete_event({'id':'evt_failed','type':'invoice.payment_failed','data':{'object':{'subscription':sub['id']}}},request=request)
assert rows['subscriptions/fixture']['stripeStatus']=='past_due' and int(rows['subscriptions/fixture']['expiresAt'].timestamp())==end2
m.complete_event({'id':'evt_cancel','type':'customer.subscription.deleted','data':{'object':{**sub,'status':'canceled'}}},request=request)
assert rows['subscriptions/fixture']['autoRenew'] is False
print('Python PASS: monthly installment terms; leap-year end date; paid-month-only access; duplicate, failed and invalid invoices; cancellation. No live requests.')
# Exercise the Python HTTP session builder with a fake provider, never the network.
import asyncio,sys
sent={}
class ProviderResponse:
 status=200
 async def __aenter__(self):return self
 async def __aexit__(self,*args):pass
 async def json(self):return {'id':'cs_created','url':'https://checkout.stripe.com/c/pay_created'}
class ProviderSession:
 def __init__(self,**kwargs):sent['headers']=kwargs.get('headers')
 async def __aenter__(self):return self
 async def __aexit__(self,*args):pass
 def post(self,url,data):sent['form']=data;return ProviderResponse()
class Reply:
 def __init__(self,data,status=200,headers=None):self.data=data;self.status=status
web=types.SimpleNamespace(json_response=lambda data,status=200,headers=None:Reply(data,status,headers))
sys.modules['aiohttp']=types.SimpleNamespace(web=web,ClientSession=ProviderSession,ClientTimeout=lambda **kw:None)
routes={};app=types.SimpleNamespace(router=types.SimpleNamespace(add_get=lambda p,f:routes.update({p:f}),add_post=lambda p,f:routes.update({p:f})))
m.resolve_account=lambda ctx,zid:types.SimpleNamespace(uid='fixture',disabled=False)
m.register(app,{'STRIPE_SECRET_KEY':'sk_fixture','STRIPE_WEBHOOK_SECRET':'whsec_fixture','CHECKOUT_PLANS':{'zpass_plus_yearly':{'amount':49.9,'days':365}}})
class Request:
 headers={'Origin':'https://pay.zpas.org'}
 async def json(self):return {'productId':'zpass_plus_yearly','zPassId':'ZP-ABCDEFGHIJ','requestId':'b'*32}
reply=asyncio.run(routes['/checkout/pay-session'](Request()))
assert reply.status==200,reply.data
assert sent['form']['mode']=='subscription'
assert sent['form']['line_items[0][price_data][unit_amount]']=='425'
assert sent['form']['line_items[0][price_data][recurring][interval]']=='month'
print('Python HTTP builder PASS: old $49.90 plan metadata cannot cause upfront charging; Stripe receives a $4.25 monthly subscription.')
