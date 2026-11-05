import {getFirestore,collection,doc,addDoc,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const allowed={STRIPE:['checkout.stripe.com'],NOWPAYMENTS:['nowpayments.io','payment.nowpayments.io']};
export function validatePaymentUrl(value,provider){const url=new URL(value);if(url.protocol!=='https:' || !allowed[provider]?.includes(url.hostname) || url.username || url.password)throw Error('Invalid payment link');return url.href;}
const inflight=new Set();
export async function requestCheckout(app,user,productId,provider,coin='') {
  if(!user)throw Error('Sign in before paying.');
  const pendingKey='zpassPendingPayment:'+user.uid;
  if(inflight.has(user.uid))throw Error('A payment request is already pending.');
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
    return await new Promise((resolve,reject)=>{
      timer=setTimeout(()=>reject(Error('The local payment bot has not responded. Start START-ALL-BOTS.bat and try again.')),90000);
      unsubscribe=onSnapshot(ref,snapshot=>{const data=snapshot.data();if(data?.status==='READY'){sessionStorage.removeItem(pendingKey);try{resolve(validatePaymentUrl(data.paymentUrl,provider));}catch(error){reject(error);}}else if(data?.status==='FAILED'){sessionStorage.removeItem(pendingKey);reject(Error(data.error || 'Payment unavailable.'));}},()=>reject(Error('Payment service could not be reached. Please try again.')));
    });
  } finally {unsubscribe?.();clearTimeout(timer);inflight.delete(user.uid);}
}
