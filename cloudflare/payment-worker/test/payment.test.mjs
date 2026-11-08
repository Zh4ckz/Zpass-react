import test from 'node:test';
import assert from 'node:assert/strict';
import {terms,commitmentEnd,checkoutForm,validRequest} from '../src/billing.js';
import {createWorker,verifySignature,paymentSession} from '../src/index.js';
import {PaymentService} from '../src/payments.js';
import {Firestore,encodeFields,decodeFields,accessToken} from '../src/firestore.js';
const now=Date.UTC(2026,10,3),anchor=now/1000,end1=Date.UTC(2026,11,3)/1000,end2=Date.UTC(2027,0,3)/1000;
const payload={productId:'zpass_plus_yearly',zPassId:'ZP-ABCDEFGHIJ',requestId:'a'.repeat(32)};
const jsonResponse=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function fixture(){
 const rows=new Map(),calls=[];
 const db={findRecipient:async zid=>zid===payload.zPassId?{uid:'fixture'}:null,get:async path=>rows.get(path)||null,async patch(path,data){rows.set(path,{...rows.get(path),...data})},async transaction(fn){const staged=[];const result=await fn({get:async path=>rows.get(path)||null,set:(path,data,options={})=>staged.push({path,data,options})});for(const {path,data,options}of staged){if(options.create)assert(!rows.has(path));rows.set(path,{...rows.get(path),...data})}return result}};
 let sub,first;
 const stripe=async(method,path,form,key)=>{calls.push({method,path,form,key});if(path==='checkout/sessions')return{id:'cs_fixture',url:'https://checkout.stripe.com/c/pay_fixture'};if(method==='POST'){sub={...sub,cancel_at:Number(form.cancel_at)};return sub}return path.startsWith('subscriptions/')?sub:first};
 const service=new PaymentService({db,stripe,now:()=>now});
 return{rows,calls,db,service,setup(order){sub={id:'sub_fixture',customer:'cus_fixture',status:'active',start_date:anchor,latest_invoice:'in_first',metadata:{pay_checkout:'passgram-org',pay_order_id:order.orderId,pay_uid:'fixture'},items:{data:[{quantity:1,price:{id:'price_fixture',unit_amount:425,currency:'usd',recurring:{interval:'month',interval_count:1}}}]}};first=this.invoice('in_first',anchor,end1);return{sub,first}},invoice(id,start,end){return{id,subscription:'sub_fixture',customer:'cus_fixture',status:'paid',amount_paid:425,currency:'usd',lines:{data:[{price:{id:'price_fixture'},quantity:1,amount:425,period:{start,end}}]}}}};
}
test('monthly terms, calendar boundaries and malicious client amounts',()=>{
 assert.deepEqual(terms('zpass_plus_yearly'),{amountCents:425,commitmentMonths:12});assert.equal(terms('zpass_plus_monthly').amountCents,499);assert.equal(terms('zpass_pro_yearly').amountCents,750);assert.equal(terms('arbitrary'),null);assert(validRequest(payload));assert(!validRequest({...payload,amount:1}));assert(!validRequest({...payload,zPassId:'../bad'}));assert.equal(commitmentEnd(Date.UTC(2024,1,29)/1000,12),Date.UTC(2025,1,28)/1000);
 const form=checkoutForm({orderId:'a'.repeat(64),uid:'fixture',productId:payload.productId,...terms(payload.productId)});assert.equal(form.mode,'subscription');assert.equal(form['line_items[0][price_data][unit_amount]'],'425');assert.equal(form['line_items[0][price_data][recurring][interval]'],'month');assert(form.success_url.startsWith('https://pay.zpas.org/'));
});
test('session creation is idempotent, rate limited, and cannot activate an account',async()=>{
 const f=fixture();await assert.rejects(f.service.create({...payload,amount:1}),/Choose a plan/);const result=await f.service.create(payload);assert.equal(result.checkoutUrl,'https://checkout.stripe.com/c/pay_fixture');assert(!f.rows.has('subscriptions/fixture'));assert.equal(f.calls[0].form['line_items[0][price_data][unit_amount]'],'425');assert(f.calls[0].key.startsWith('passgram-pay-'));await f.service.create(payload);assert.equal(f.calls.length,1);await assert.rejects(f.service.create({...payload,requestId:'b'.repeat(32)}),e=>e.status===429);
 const g=fixture();g.rows.set('subscriptions/fixture',{stripeSubscriptionId:'sub_existing',stripeStatus:'active'});await assert.rejects(g.service.create(payload),e=>e.status===409);assert.equal(g.calls.length,0);
});
test('paid invoices grant only a paid month, retries do not double grant, failures do not extend',async()=>{
 const f=fixture();await f.service.create(payload);const order=[...f.rows.values()].find(v=>v.orderId),{sub,first}=f.setup(order);
 const session={id:'cs_fixture',mode:'subscription',subscription:sub.id,payment_status:'paid',currency:'usd',amount_total:425,client_reference_id:'fixture',metadata:{pay_checkout:'passgram-org',pay_order_id:order.orderId}};
 await f.service.webhook({id:'evt_checkout',type:'checkout.session.completed',data:{object:session}});assert.equal(f.rows.get('subscriptions/fixture').expiresAt.getTime(),end1*1000);assert.equal(f.calls.find(c=>c.path==='subscriptions/sub_fixture'&&c.method==='POST').form.cancel_at,String(Date.UTC(2027,10,3)/1000));
 await f.service.webhook({id:'evt_duplicate',type:'invoice.paid',data:{object:first}});assert.equal(f.rows.get('subscriptions/fixture').expiresAt.getTime(),end1*1000);
 const second=f.invoice('in_second',end1,end2);await f.service.webhook({id:'evt_renewal',type:'invoice.paid',data:{object:second}});assert.equal(f.rows.get('subscriptions/fixture').expiresAt.getTime(),end2*1000);
 for(const change of [{amount_paid:1},{currency:'eur'}])await assert.rejects(f.service.webhook({id:'evt_bad',type:'invoice.paid',data:{object:{...second,id:'in_bad',...change}}}));
 await f.service.webhook({id:'evt_failed',type:'invoice.payment_failed',data:{object:{subscription:sub.id}}});assert.equal(f.rows.get('subscriptions/fixture').expiresAt.getTime(),end2*1000);assert.equal(f.rows.get('subscriptions/fixture').stripeStatus,'past_due');
 await f.service.webhook({id:'evt_cancel',type:'customer.subscription.deleted',data:{object:{...sub,status:'canceled'}}});assert.equal(f.rows.get('subscriptions/fixture').autoRenew,false);
});
test('invoice can arrive before Checkout completion without granting twice',async()=>{
 const f=fixture();await f.service.create(payload);const order=[...f.rows.values()].find(v=>v.orderId),{sub,first}=f.setup(order);await f.service.webhook({id:'evt_first',type:'invoice.paid',data:{object:first}});
 await f.service.webhook({id:'evt_checkout',type:'checkout.session.completed',data:{object:{id:'cs_fixture',mode:'subscription',subscription:sub.id,payment_status:'paid',currency:'usd',amount_total:425,client_reference_id:'fixture',metadata:{pay_checkout:'passgram-org',pay_order_id:order.orderId}}}});assert.equal(f.rows.get('subscriptions/fixture').expiresAt.getTime(),end1*1000);assert.equal([...f.rows.keys()].filter(v=>v.startsWith('pay_stripe_invoices/')).length,1);
});
async function sign(body,secret,time=Math.floor(now/1000)){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const hash=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(time+'.'+body));return't='+time+',v1='+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('')}
test('signature supports rotation and rejects forged or stale notifications',async()=>{
 const body='{"id":"evt_fixture","name":"özel"}',secret='fixture-secret',header=await sign(body,secret);assert(await verifySignature(body,header,secret,now));assert(await verifySignature(body,header+',v1='+'0'.repeat(64),secret,now));assert(!await verifySignature(body+' ',header,secret,now));assert(!await verifySignature(body,await sign(body,secret,Math.floor(now/1000)-301),secret,now));assert(!await verifySignature(body,header,'wrong',now));
});
test('HTTP boundaries fail closed, check origins and never expose secrets',async()=>{
 const env={FIREBASE_PROJECT_ID:'passgram-org',FIREBASE_SERVICE_ACCOUNT_JSON:'fixture',STRIPE_SECRET_KEY:'fixture-key',STRIPE_WEBHOOK_SECRET:'fixture-secret'};let created=0,handled=0;const worker=createWorker({serviceFactory:()=>({create:async()=>{created++;return{checkoutUrl:'https://checkout.stripe.com/c/fixture'}},webhook:async()=>{handled++}})});
 let response=await worker.fetch(new Request('https://worker/checkout/pay-config'),{});assert.equal((await response.json()).available,false);
 response=await worker.fetch(new Request('https://worker/checkout/pay-session',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),env);assert.equal(response.status,403);assert.equal(created,0);
 response=await worker.fetch(new Request('https://worker/checkout/pay-session',{method:'POST',headers:{Origin:'https://pay.zpas.org'},body:'x'.repeat(4097)}),env);assert.equal(response.status,413);
 response=await worker.fetch(new Request('https://worker/stripe-webhook',{method:'POST',body:'{}'}),env);assert.equal(response.status,401);assert.equal(handled,0);
 const body=JSON.stringify({id:'evt_fixture',type:'ignored'}),signature=await sign(body,env.STRIPE_WEBHOOK_SECRET,Math.floor(Date.now()/1000));response=await worker.fetch(new Request('https://worker/stripe-webhook',{method:'POST',headers:{'Stripe-Signature':signature},body}),env);assert.equal(response.status,200);assert.equal(handled,1);
 response=await worker.fetch(new Request('https://worker/health'),env);const text=await response.text();assert(!text.includes(env.STRIPE_SECRET_KEY));assert(!text.includes(env.STRIPE_WEBHOOK_SECRET));assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('Firestore REST values, merge masks and transactional retry use real API shapes',async()=>{
 const data={name:'fixture',n:425,flag:false,date:new Date(now),nested:{x:1},list:['a',null]};assert.deepEqual(decodeFields(encodeFields(data)),data);
 let begins=0,commits=0,rollbacks=0;const requests=[];const db=new Firestore({}, {token:async()=>'fixture-token',fetcher:async(url,options)=>{const body=options.body?JSON.parse(options.body):null;requests.push({url,options,body});if(url.endsWith(':beginTransaction'))return jsonResponse({transaction:'tx'+(++begins)});if(url.includes('/documents/pay_orders/'))return jsonResponse({error:{status:'NOT_FOUND'}},404);if(url.endsWith(':commit')){commits++;return commits===1?jsonResponse({error:{status:'ABORTED'}},409):jsonResponse({writeResults:[]})}if(url.endsWith(':rollback')){rollbacks++;return jsonResponse({})}throw Error('Unexpected Firestore URL')}});
 await db.transaction(async tx=>{assert.equal(await tx.get('pay_orders/fixture'),null);tx.set('pay_orders/fixture',{status:'CREATED'},{create:true});tx.set('subscriptions/fixture',{expiresAt:new Date(now)})});assert.equal(commits,2);assert.equal(rollbacks,1);const body=requests.find(v=>v.url.endsWith(':commit')).body;assert.equal(body.writes[0].currentDocument.exists,false);assert.deepEqual(body.writes[1].updateMask.fieldPaths,['expiresAt']);assert(body.writes[0].update.name.startsWith('projects/passgram-org/'));
});
test('Google service account JWT is signed with WebCrypto, scoped and cached',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);const bytes=new Uint8Array(await crypto.subtle.exportKey('pkcs8',pair.privateKey));const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(bytes).toString('base64')+'\n-----END PRIVATE KEY-----';const env={FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'passgram-org',client_email:'fixture@passgram-org.iam.gserviceaccount.com',private_key:pem})};let calls=0;
 const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://oauth2.googleapis.com/token');const assertion=new URLSearchParams(options.body).get('assertion'),parts=assertion.split('.'),claims=JSON.parse(Buffer.from(parts[1],'base64url'));assert.equal(claims.aud,url);assert.equal(claims.scope,'https://www.googleapis.com/auth/cloud-platform');assert.equal(claims.exp-claims.iat,3600);assert(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',pair.publicKey,Buffer.from(parts[2],'base64url'),new TextEncoder().encode(parts[0]+'.'+parts[1])));return jsonResponse({access_token:'fixture-oauth',expires_in:3600})};assert.equal(await accessToken(env,fetcher),'fixture-oauth');assert.equal(await accessToken(env,fetcher),'fixture-oauth');assert.equal(calls,1);
});
test('native Cloudflare fetch functions keep their global receiver',async()=>{
 const saved=globalThis.fetch;let calls=0;
 globalThis.fetch=function(url,options){assert.equal(this,globalThis);calls++;return Promise.resolve(jsonResponse({error:{status:'NOT_FOUND'}},404))};
 try{const db=new Firestore({}, {token:async()=>'fixture'});assert.equal(await db.get('pay_orders/fixture'),null);assert.equal(calls,1)}finally{globalThis.fetch=saved}
});

test('checkout keys expire at 15 minutes and cannot select another account',async()=>{
 const key='a'.repeat(36)+'b'.repeat(36),expiresAt=new Date(now+15*60*1000);
 const db={get:async()=>({uid:'fixture',username:'alice',expiresAt})};
 assert.equal((await paymentSession(db,key,now)).username,'alice');
 await assert.rejects(paymentSession(db,key,expiresAt.getTime()),/Session key expired/);
 await assert.rejects(paymentSession(db,'invalid',now),/Session key expired/);
 await assert.rejects(paymentSession({get:async()=>null},key,now),/Session key expired/);
 const f=fixture();await assert.rejects(f.service.create(payload,'another-user'),/account mismatch/);assert.equal(f.calls.length,0);
});

test('authenticated accounts can checkout without a legacy ZP identifier, with UID binding',async()=>{const f=fixture();await f.service.create({...payload,zPassId:''},'fixture');assert.equal(f.calls.length,1);const order=[...f.rows.values()].find(value=>value.orderId);assert.equal(order.uid,'fixture');const denied=fixture();await assert.rejects(denied.service.create({...payload,zPassId:'',amount:1},'fixture'),/Choose a plan/);assert.equal(denied.calls.length,0)});

test('accepts real-format Stripe IDs with a mode segment',async()=>{const {stripeId}=await import('../src/billing.js');assert.equal(stripeId('cs_live_b1Xy9KqZ','cs'),true);assert.equal(stripeId('cs_test_a1B2','cs'),true);assert.equal(stripeId('sub_1Abc','sub'),true);assert.equal(stripeId('cs_bad-id','cs'),false);assert.equal(stripeId('pi_live_1','cs'),false)});

test('elements checkout returns a client secret, never a redirect URL, and stays idempotent',async()=>{const rows=new Map(),calls=[];const db={transaction:async fn=>fn({get:async p=>rows.get(p)||null,set:(p,d)=>rows.set(p,{...(rows.get(p)||{}),...d})}),patch:async(p,d)=>rows.set(p,{...rows.get(p),...d}),findRecipient:async()=>({uid:'fixture'})};const stripe=async(method,path,form,key)=>{calls.push({path,form,key});return{id:'cs_live_fixture1',client_secret:'cs_live_fixture1_secret_abc',url:null}};const service=new PaymentService({db,stripe});const payload={productId:'zpass_plus_monthly',requestId:'a'.repeat(32),zPassId:''};const r=await service.create(payload,'fixture',true);assert.equal(r.clientSecret,'cs_live_fixture1_secret_abc');assert.equal(r.checkoutUrl,undefined);assert.equal(calls[0].form.ui_mode,'elements');assert(calls[0].form.return_url.includes('{CHECKOUT_SESSION_ID}'));assert.equal(calls[0].form.redirect_on_completion,undefined);assert.equal(calls[0].form.success_url,undefined);assert(calls[0].form.return_url.startsWith('https://pay.zpas.org/'));assert(calls[0].key.startsWith('passgram-pay-elements-'));const again=await service.create(payload,'fixture',true);assert.equal(again.clientSecret,r.clientSecret);assert.equal(calls.length,1);const rows2=new Map();const forged=new PaymentService({db:{...db,transaction:async fn=>fn({get:async p=>rows2.get(p)||null,set:(p,d)=>rows2.set(p,d)}),patch:async()=>{}},stripe:async()=>({id:'cs_live_x',client_secret:'cs_live_other_secret',url:null})});await assert.rejects(forged.create(payload,'fixture',true),/Invalid provider session/)});
