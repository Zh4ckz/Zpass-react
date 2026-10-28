from pathlib import Path
p=Path('Zpass/public/checkout.html');s=p.read_text(encoding='utf-8');s=s.replace('    const firebaseConfig =','    import {requestCheckout} from "./js/firebase-checkout.mjs";\n\n    const firebaseConfig =',1)
a=s.index('        const idToken = await user.getIdToken();',s.index('async function startPayment'));b=s.index('      } catch (err)',a)
s=s[:a]+'''        if(selectedProvider !== 'stripe' && !selectedCoin)throw Error('Please select a coin.');
        const url=await requestCheckout(firebaseApp,user,pId,selectedProvider==='stripe'?'STRIPE':'NOWPAYMENTS',selectedCoin || '');
        const proceed=document.createElement('a');proceed.href=url;proceed.className='checkout-btn';proceed.textContent='Continue to secure payment';
        pmError.replaceChildren(proceed);pmError.style.display='block';
        btnElement.textContent='Payment link ready';
'''+s[b:];p.write_text(s,encoding='utf-8')
p=Path('Zpass/firestore.rules');s=p.read_text();needle='    match /loginRequests/{requestId} {';s=s.replace(needle,'''    match /web_checkout_requests/{requestId} {
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.status == 'PENDING'
        && request.resource.data.createdAt == request.time
        && request.resource.data.productId in ['zpass_individual_monthly','zpass_individual_yearly','zpass_family_monthly','zpass_family_yearly']
        && request.resource.data.provider in ['STRIPE','NOWPAYMENTS']
        && request.resource.data.coin is string && request.resource.data.coin.size() <= 32
        && request.resource.data.origin in ['https://zpass.web.app','http://localhost:4178','http://127.0.0.1:4178']
        && request.resource.data.keys().hasOnly(['uid','productId','provider','coin','origin','status','createdAt']);
      allow read: if request.auth != null && request.auth.uid == resource.data.uid;
      allow update, delete: if false;
    }
'''+needle);p.write_text(s)
