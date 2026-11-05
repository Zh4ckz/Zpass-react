import {Firestore} from './firestore.js';
import {authenticatedUser} from './auth.js';
import {AccountBilling} from './account-billing.js';
import {publicConfig,BILLING_MODEL} from './billing.js';
import {digest,PaymentService,HttpError} from './payments.js';
const origins=new Set(['https://pay.zpas.org','https://web.zpas.org','https://zpas.org','https://passgram.web.app','https://passgram-pay.web.app']);
const configured=env=>Boolean(env.STRIPE_SECRET_KEY&&env.STRIPE_WEBHOOK_SECRET&&env.FIREBASE_SERVICE_ACCOUNT_JSON&&env.FIREBASE_PROJECT_ID==='passgram-org');
const encoder=new TextEncoder();
let firebaseHealth={until:0,ready:false,error:null};
export async function verifySignature(body,header,secret,now=Date.now()){
 if(!secret||!header)return false;const parts=header.split(',').map(part=>part.trim().split('=')),timestamp=parts.find(([key])=>key==='t')?.[1],signatures=parts.filter(([key])=>key==='v1').map(([,value])=>value);
 if(!/^\d+$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300)return false;
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(timestamp+'.'+body)));
 return signatures.some(signature=>{if(!/^[a-f0-9]{64}$/i.test(signature||''))return false;let difference=0;for(let i=0;i<signed.length;i++)difference|=signed[i]^parseInt(signature.slice(i*2,i*2+2),16);return difference===0});
}
async function limitedText(request,max){if(Number(request.headers.get('Content-Length'))>max)throw new HttpError(413,'Request too large.');if(!request.body)return'';const reader=request.body.getReader(),chunks=[];let count=0;while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>max){await reader.cancel();throw new HttpError(413,'Request too large.')}chunks.push(value)}const bytes=new Uint8Array(count);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return new TextDecoder().decode(bytes)}
export function stripeClient(env,fetcher=(...args)=>globalThis.fetch(...args)){return async(method,endpoint,data={},idempotencyKey)=>{if(!/^[A-Za-z0-9_/?=&-]+$/.test(endpoint))throw Error('Invalid provider endpoint');const headers={Authorization:'Bearer '+env.STRIPE_SECRET_KEY},options={method,headers,signal:AbortSignal.timeout(15000)};if(method!=='GET'){headers['Content-Type']='application/x-www-form-urlencoded';options.body=new URLSearchParams(data);if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey}const response=await fetcher('https://api.stripe.com/v1/'+endpoint,options),result=await response.json();if(!response.ok)throw Error('Payment provider unavailable');return result}}
export function createWorker({serviceFactory=env=>new PaymentService({db:new Firestore(env),stripe:stripeClient(env)}),accountFactory=env=>new AccountBilling({db:new Firestore(env),stripe:stripeClient(env)}),authenticate=authenticatedUser}={}){
 return{async fetch(request,env){const url=new URL(request.url),origin=request.headers.get('Origin'),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'};if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='OPTIONS'){if(!origins.has(origin))return reply({error:'Origin not allowed.'},403);return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}})}
  if(url.pathname==='/health'&&request.method==='GET'){
   let ready=false;
   if(configured(env)){
    if(firebaseHealth.until>Date.now())ready=firebaseHealth.ready;
    else{let diagnostic=null;try{await new Firestore(env).get('pay_orders/worker_healthcheck');ready=true}catch(error){diagnostic=['oauth','firestore'].includes(error.stage)?error.stage+':'+(error.status||0)+':'+(error.reason||'request_error'):['DataError','OperationError','NotSupportedError','SyntaxError','TypeError'].includes(error.name)?error.name:'credentials_error';}firebaseHealth={until:Date.now()+(ready?60000:5000),ready,error:diagnostic};}
   }
   return reply({ok:!configured(env)||ready,service:'passgram-pay-api',billingModel:BILLING_MODEL,configured:configured(env),firebaseReady:ready,firebaseError:ready?null:firebaseHealth.error,runtime:'cloudflare-worker'},configured(env)&&!ready?503:200);
  }
  if(url.pathname.startsWith('/billing/')&&request.method==='POST'){
   if(!['https://web.zpas.org','https://pay.zpas.org'].includes(origin))return reply({error:'Origin not allowed.'},403);
   if(!configured(env))return reply({error:'Billing is not configured.'},503);
   try{let payload;try{payload=JSON.parse(await limitedText(request,12288))}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'Invalid billing request.');}if(!payload||Object.keys(payload).some(k=>!['idToken','cursor','confirm'].includes(k)))throw new HttpError(400,'Invalid billing request.');
    const user=await authenticate(payload.idToken),account=accountFactory(env),action=url.pathname.slice('/billing/'.length);
    if(action==='overview')return reply(await account.overview(user.uid));
    if(action==='invoices')return reply(await account.invoices(user.uid,payload.cursor||''));
    if(!['cancel','refund','upgrade'].includes(action))return reply({error:'Not found.'},404);
    if(payload.confirm!==true)throw new HttpError(400,'Confirm this billing change before continuing.');
    return reply(await account[action](user.uid));
   }catch(error){return reply({error:error instanceof HttpError?error.message:'Billing service is temporarily unavailable.'},error instanceof HttpError?error.status:503)}
  }
  if(url.pathname==='/checkout/pay-config'&&request.method==='GET')return reply(publicConfig(configured(env)));
  if(['/checkout/pay-key','/checkout/pay-account'].includes(url.pathname)&&request.method==='POST'){
   if(!origins.has(origin))return reply({error:'Origin not allowed.'},403);
   try{const payload=JSON.parse(await limitedText(request,8192)),db=new Firestore(env);
    if(url.pathname==='/checkout/pay-key'){
     if(typeof payload.idToken!=='string')throw new HttpError(401,'Sign in before paying.');
     const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyBvnc-swQuAx_Fe67TUY7TGoM4VdG89cI4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:payload.idToken}),signal:AbortSignal.timeout(10000)});
     const user=(await response.json()).users?.[0];if(!response.ok||!user?.localId||user.disabled)throw new HttpError(401,'Sign in before paying.');
     const uid=user.localId,[profile,subscription,chatProfile]=await Promise.all([db.get('users/'+uid),db.get('subscriptions/'+uid),db.get('chat_profiles/'+uid)]),zPassId=subscription?.zPassId||profile?.zPassId;
     if(zPassId!=null&&(typeof zPassId!=='string'||zPassId.length>128))throw new HttpError(400,'Account identifier is invalid.');
     const key=crypto.randomUUID()+crypto.randomUUID(),expiresAt=new Date(Date.now()+15*60*1000),username=chatProfile?.username||chatProfile?.displayName||profile?.username||user.displayName||user.email||'PassGram account';
     await db.transaction(async tx=>tx.set('pay_sessions/'+await digest(key),{uid,zPassId:zPassId||'',username,expiresAt},{create:true}));
     return reply({key,expiresAt:expiresAt.toISOString()});
    }
    const session=await paymentSession(db,payload.key);return reply({username:session.username,expiresAt:session.expiresAt.toISOString()});
   }catch(e){return reply({error:e instanceof HttpError?e.message:'Session could not be loaded.'},e instanceof HttpError?e.status:503)}
  }
  if(url.pathname==='/checkout/pay-session'&&request.method==='POST'){
   if(!['https://pay.zpas.org','https://web.zpas.org'].includes(origin))return reply({error:'Open checkout at pay.zpas.org.'},403);if(!configured(env))return reply({error:'Checkout is not configured yet.'},503);
   try{let payload;try{payload=JSON.parse(await limitedText(request,4096))}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,'Invalid checkout request.')}const session=await paymentSession(new Firestore(env),payload.key);if(Object.keys(payload).some(k=>!['key','productId','requestId'].includes(k)))throw new HttpError(400,'Invalid checkout request.');return reply(await serviceFactory(env).create({productId:payload.productId,requestId:payload.requestId,zPassId:session.zPassId},session.uid))}catch(e){return reply({error:e instanceof HttpError?e.message:'Checkout could not be created. Try again shortly.'},e instanceof HttpError?e.status:503)}
  }
  if(url.pathname==='/stripe-webhook'&&request.method==='POST'){
   if(!configured(env))return reply({error:'Webhook is not configured.'},503);
   try{const body=await limitedText(request,1024*1024);if(!await verifySignature(body,request.headers.get('Stripe-Signature'),env.STRIPE_WEBHOOK_SECRET))return reply({error:'Invalid signature.'},401);let event;try{event=JSON.parse(body)}catch{return reply({error:'Invalid event.'},400)}await serviceFactory(env).webhook(event);return reply({received:true})}catch(e){return reply({error:e instanceof HttpError?e.message:'Payment confirmation will retry.'},e instanceof HttpError?e.status:500)}
  }
  return reply({error:'Not found.'},404);
 }};
}
export async function paymentSession(db,key,now=Date.now()){
 if(typeof key!=='string'||!/^([a-f0-9-]{36}){2}$/.test(key))throw new HttpError(401,'Session key expired. Start checkout again.');
 const session=await db.get('pay_sessions/'+await digest(key));
 if(!session||!(session.expiresAt instanceof Date)||session.expiresAt.getTime()<=now)throw new HttpError(401,'Session key expired. Start checkout again.');
 return session;
}
export default createWorker();
