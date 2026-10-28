from pathlib import Path
p=Path('Zpass/scripts/zpass_checkout_queue.py');s=p.read_text();s=s.replace('        transaction.update(snapshot.reference, {\'status\':\'PROCESSING\'', '''        limiter=db.collection('checkout_rate_limits').document(data['uid'])
        previous=limiter.get(transaction=transaction).to_dict() or {}
        last=previous.get('lastCreatedAt')
        if last and time.time()-last.timestamp()<30:
            transaction.update(snapshot.reference, {'status':'FAILED','error':'Please wait 30 seconds before creating another payment.'})
            return None
        transaction.set(limiter, {'lastCreatedAt':firestore.SERVER_TIMESTAMP})
        transaction.update(snapshot.reference, {'status':'PROCESSING' ''').replace("{'status':'PROCESSING' ,","{'status':'PROCESSING',")
p.write_text(s)
p=Path('Zpass/scripts/zpass_web_bridge.py');s=p.read_text(encoding='utf-8');needle="            await g['notify_admin'](f\"🧾";a=s.index(needle);b=s.index("            result['invoiceId']",a);original=s[a:b];s=s[:a]+"            try:\n"+''.join('    '+line if line.strip() else line for line in original.splitlines(keepends=True))+"            except Exception:\n                print('Checkout admin notification unavailable; invoice retained.')\n"+s[b:];p.write_text(s,encoding='utf-8')
p=Path('Zpass/public/js/firebase-checkout.mjs');s=p.read_text();s=s.replace('collection,addDoc','collection,doc,addDoc');s=s.replace('export async function requestCheckout','const inflight=new Set();\nexport async function requestCheckout');a=s.index('  if(sessionStorage.getItem(pendingKey))');b=s.index('    return await new Promise',a);s=s[:a]+'''  if(inflight.has(user.uid))throw Error('A payment request is already pending.');
  inflight.add(user.uid);
  let unsubscribe,timer;
  try {
    let cached;try{cached=JSON.parse(sessionStorage.getItem(pendingKey));}catch{}
    let ref;
    if(cached?.id && cached.productId===productId && cached.provider===provider && cached.coin===coin && Date.now()-cached.createdAt<600000){ref=doc(getFirestore(app),'web_checkout_requests',cached.id);}
    else {
      ref=await addDoc(collection(getFirestore(app),'web_checkout_requests'),{uid:user.uid,productId,provider,coin,origin:location.origin,status:'PENDING',createdAt:serverTimestamp()});
      sessionStorage.setItem(pendingKey,JSON.stringify({id:ref.id,productId,provider,coin,createdAt:Date.now()}));
    }
'''+s[b:];s=s.replace("if(data?.status==='READY'){try{resolve", "if(data?.status==='READY'){sessionStorage.removeItem(pendingKey);try{resolve").replace("else if(data?.status==='FAILED')reject(Error(data.error || 'Payment unavailable.'));", "else if(data?.status==='FAILED'){sessionStorage.removeItem(pendingKey);reject(Error(data.error || 'Payment unavailable.'));}");s=s.replace('sessionStorage.removeItem(pendingKey);}\n}', 'inflight.delete(user.uid);}\n}');p.write_text(s)
