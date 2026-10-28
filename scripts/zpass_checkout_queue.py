"""Firebase checkout queue; provider calls stay in the existing verified bot handlers."""
import asyncio
import json
import time
from urllib.parse import urlparse

PLANS = {'zpass_individual_monthly','zpass_individual_yearly','zpass_family_monthly','zpass_family_yearly'}
ORIGINS = {'https://zpass.web.app','http://localhost:4178','http://127.0.0.1:4178'}

class TrustedCheckoutRequest:
    def __init__(self, identity, payload):
        self.identity, self.payload, self.headers = identity, payload, {}
    async def json(self):
        return self.payload

def valid_url(url, provider):
    parsed = urlparse(url or '')
    allowed = {'checkout.stripe.com'} if provider == 'STRIPE' else {'nowpayments.io','payment.nowpayments.io'}
    return parsed.scheme == 'https' and parsed.hostname in allowed and not parsed.username and not parsed.password

def validate(data, now):
    created = data.get('createdAt')
    return (data.get('status') == 'PENDING' and data.get('productId') in PLANS and
        data.get('provider') in {'STRIPE','NOWPAYMENTS'} and data.get('origin') in ORIGINS and
        isinstance(data.get('uid'), str) and 0 < len(data['uid']) <= 128 and
        created is not None and hasattr(created,'timestamp') and now-600 < created.timestamp() <= now+5)

async def process(g, snapshot):
    from google.cloud import firestore
    db = g['firestore_db']
    @firestore.transactional
    def claim(transaction):
        fresh = snapshot.reference.get(transaction=transaction)
        data = fresh.to_dict() or {}
        if not validate(data, time.time()):
            return None
        limiter=db.collection('checkout_rate_limits').document(data['uid'])
        previous=limiter.get(transaction=transaction).to_dict() or {}
        last=previous.get('lastCreatedAt')
        if last and time.time()-last.timestamp()<30:
            transaction.update(snapshot.reference, {'status':'FAILED','error':'Please wait 30 seconds before creating another payment.'})
            return None
        transaction.set(limiter, {'lastCreatedAt':firestore.SERVER_TIMESTAMP})
        transaction.update(snapshot.reference, {'status':'PROCESSING','startedAt':firestore.SERVER_TIMESTAMP})
        return data
    data = await asyncio.to_thread(claim, db.transaction())
    if data is None:
        return
    try:
        account = await asyncio.to_thread(g['firebase_auth'].get_user, data['uid'])
        if account.disabled:
            raise ValueError('Account disabled')
        request = TrustedCheckoutRequest({'uid':account.uid,'email':account.email or ''},
            {'productId':data['productId'],'coin':data.get('coin',''),'origin':data['origin'],'requestId':snapshot.id})
        handler = g['checkout_create_stripe_session_handler'] if data['provider']=='STRIPE' else g['checkout_create_payment_handler']
        response = await handler(request)
        result = json.loads(response.body)
        if response.status != 200:
            await asyncio.to_thread(snapshot.reference.update, {'status':'FAILED','error':str(result.get('error','Payment unavailable'))[:200]})
            return
        url = result.get('checkoutUrl') or result.get('invoiceUrl')
        if not valid_url(url,data['provider']):
            raise ValueError('Provider URL rejected')
        await asyncio.to_thread(snapshot.reference.update, {'status':'READY','paymentUrl':url,
            'invoiceId':result.get('invoiceId',''),'providerRef':result.get('sessionId') or result.get('orderId',''),
            'completedAt':firestore.SERVER_TIMESTAMP})
    except Exception:
        await asyncio.to_thread(snapshot.reference.update, {'status':'FAILED','error':'Payment link could not be created. Please try again.'})

async def watch_checkout_requests(g):
    from google.cloud.firestore_v1.base_query import FieldFilter
    while True:
        try:
            if g.get('firestore_db') and g.get('firebase_auth'):
                pending = await asyncio.to_thread(lambda:list(g['firestore_db'].collection('web_checkout_requests').where(filter=FieldFilter('status','==','PENDING')).limit(50).stream()))
                for snapshot in pending:
                    data=snapshot.to_dict() or {}
                    if not validate(data,time.time()):
                        await asyncio.to_thread(snapshot.reference.update,{'status':'FAILED','error':'Payment request expired. Please try again.'})
                        continue
                    await process(g,snapshot)
        except Exception:
            print('Firebase checkout queue unavailable; retrying.')
        await asyncio.sleep(2)
