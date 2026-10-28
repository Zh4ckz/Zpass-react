"""Connect existing checkout handlers to the bot's existing invoice/export menus."""
import asyncio
import json
import uuid
from pathlib import Path

def install(g):
    for name, method in [('checkout_create_payment_handler', 'NOWPAYMENTS'),
                         ('checkout_create_stripe_session_handler', 'STRIPE')]:
        original = g[name]
        async def wrapped(request, original=original, method=method):
            identity = await g['verify_checkout_user'](request)
            if not identity:
                return g['web'].json_response({'error': 'Sign in again before paying'}, status=401)
            response = await original(request)
            if response.status != 200:
                return response
            result = json.loads(response.body)
            payload = await request.json()
            selected = g['CHECKOUT_PLANS'][str(payload['productId']).lower()]
            uid = identity['uid']
            invoice_id = 'ZP-' + uuid.uuid4().hex.upper()
            ref = result.get('orderId') or result.get('sessionId')
            g['invoice_db'].record(invoice_id, uid, selected['amount'], method,
                bot='ZPass', item=selected['name'], ref=ref,
                note=g['zpass_id'](uid), extra={'firebase_uid': uid, 'providerRef': ref}, product='zpass:web')
            g['firestore_db'].collection('zpass_web_orders').document(invoice_id).set({
                'uid': uid, 'zPassId': g['zpass_id'](uid), 'provider': method,
                'providerRef': ref, 'amountUsd': selected['amount'], 'plan': payload['productId'],
                'paymentUrl': result.get('checkoutUrl') or result.get('invoiceUrl') or '',
                'status': 'PENDING', 'createdAt': g['firestore'].SERVER_TIMESTAMP})
            try:
                await g['notify_admin'](f"🧾 Z Pass checkout created\nInvoice: `{invoice_id}`\nAccount: `{g['zpass_id'](uid)}`\nFirebase UID: `{uid}`\n{method} · {selected['name']} · ${selected['amount']}")
            except Exception:
                print('Checkout admin notification unavailable; invoice retained.')
            result['invoiceId'] = invoice_id
            return g['web'].json_response(result)
        g[name] = wrapped

async def watch_new_users(g):
    """Persistent baseline avoids notifying all historical accounts on every restart.
    Paid state is mirrored only from records created by existing verified handlers.
    """
    state_file = Path(g['BASE_DIR']) / 'data' / 'zpass-known-users.json'
    known = set(json.loads(state_file.read_text()) if state_file.exists() else [])
    initialized = state_file.exists()
    while True:
        try:
            if not g['firestore_db'] or not g['firebase_auth']:
                await asyncio.sleep(30)
                continue
            users = await asyncio.to_thread(lambda: list(g['firebase_auth'].list_users().iterate_all()))
            for user in users:
                if user.uid not in known:
                    if initialized:
                        await g['notify_admin'](f"👤 New Z Pass account\nID: `{g['zpass_id'](user.uid)}`\nFirebase UID: `{user.uid}`")
                    known.add(user.uid)
            state_file.parent.mkdir(exist_ok=True)
            state_file.write_text(json.dumps(sorted(known)))
            initialized = True
            pending = await asyncio.to_thread(lambda: list(g['firestore_db'].collection('zpass_web_orders').where(
                filter=g['FieldFilter']('status', '==', 'PENDING')).stream()))
            for doc in pending:
                order = doc.to_dict()
                ref = order['providerRef']
                if order['provider'] == 'STRIPE':
                    record = await asyncio.to_thread(g['firestore_db'].collection('stripe_payment_records').document(ref).get)
                    data = record.to_dict() or {}
                    paid = data.get('uid') == order['uid'] and data.get('status') == 'PAID'
                else:
                    data = g['load_db'](g['CRYPTO_DB']).get('subscription_orders', {}).get(ref, {})
                    paid = data.get('firebase_uid') == order['uid'] and data.get('activated') is True
                if paid:
                    g['invoice_db'].set_status(doc.id, 'paid')
                    await asyncio.to_thread(doc.reference.update, {'status': 'PAID'})
                    await g['notify_admin'](f"✅ Z Pass payment confirmed\nInvoice: `{doc.id}`\nAccount: `{order['zPassId']}`\n{order['provider']} · ${order['amountUsd']}\nPDF / CSV: /invoices")
        except Exception as exc:
            # No provider response bodies, tokens, or private account details in logs.
            print('Z Pass invoice sync retry:', type(exc).__name__)
        await asyncio.sleep(30)
