const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
 const rows=new Map();const ref=key=>({key,async get(){return{exists:rows.has(key),data:()=>rows.get(key)}},async update(v){rows.set(key,{...rows.get(key),...v})}});
 const db={
  collection(name){return {
   doc:id=>ref(name+'/'+id),
   where(field,op,value){return {limit(){return {async get(){
    const v=[...rows].find(([key,data])=>key.startsWith(name+'/')&&data[field]===value);
    return {empty:!v,docs:v?[{id:v[0].split('/').at(-1)}]:[]};
   }}}};}
  };},
  async runTransaction(fn){return fn({get:r=>r.get(),create(r,v){assert(!rows.has(r.key));rows.set(r.key,v)},update(r,v){rows.set(r.key,{...rows.get(r.key),...v})},set(r,v){rows.set(r.key,{...rows.get(r.key),...v})}});}
 };
 globalThis.payTestContext={db,auth:{getUser:async uid=>({uid,disabled:false})}};globalThis.testCrypto=crypto;
 let source=fs.readFileSync('C:/Users/rezan/Desktop/Bots-JS/payment-bot/pay-checkout.js','utf8').replace(/^import .*;\r?\n/gm,'').replace('let context;','let context=globalThis.payTestContext;');source=`const crypto=globalThis.testCrypto;const FieldValue={serverTimestamp:()=>new Date()};const Timestamp={fromMillis:n=>({toMillis:()=>n})};\n`+source;
 const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.deepEqual(m.monthlyTerms('zpass_plus_yearly'),{amountCents:425,commitmentMonths:12});assert.equal(m.monthlyTerms('zpass_plus_monthly').amountCents,499);assert.equal(m.monthlyTerms('zpass_pro_yearly').amountCents,750);
 assert.equal(m.commitmentEnd(Date.UTC(2024,1,29)/1000,12),Date.UTC(2025,1,28)/1000);
 const routes={};let sent;
 m.registerPayCheckout({get:(p,f)=>routes[p]=f,post:(p,f)=>routes[p]=f},{plans:{zpass_plus_yearly:{amount:49.9,days:365}},ready:()=>true,stripePost:async(endpoint,form)=>{sent=form;return{id:'cs_fixture',url:'https://checkout.stripe.com/c/pay_fixture'}}});rows.set('users/fixture',{zPassId:'ZP-ABCDEFGHIJ'});
 const payload={productId:'zpass_plus_yearly',zPassId:'ZP-ABCDEFGHIJ',requestId:'a'.repeat(32)};const res={code:200,status(n){this.code=n;return this},set(){return this},json(v){this.value=v;return this}};
 await routes['/checkout/pay-session']({headers:{origin:m.PAY_ORIGIN},body:Buffer.from(JSON.stringify(payload))},res);assert.equal(res.code,200);assert.equal(sent.mode,'subscription');assert.equal(sent['line_items[0][price_data][unit_amount]'],'425');assert.equal(sent['line_items[0][price_data][recurring][interval]'],'month');assert(!rows.has('subscriptions/fixture'));
 const order=[...rows.values()].find(v=>v.orderId),anchor=Date.UTC(2026,10,3)/1000;
 let sub={id:'sub_fixture',customer:'cus_fixture',status:'active',start_date:anchor,latest_invoice:'in_first',metadata:{pay_checkout:'passgram-org',pay_order_id:order.orderId,pay_uid:'fixture'},items:{data:[{quantity:1,price:{id:'price_fixture',unit_amount:425,currency:'usd',recurring:{interval:'month',interval_count:1}}}]}};
 const invoice=(id,start,end)=>({id,subscription:sub.id,customer:sub.customer,status:'paid',amount_paid:425,currency:'usd',lines:{data:[{price:{id:'price_fixture'},quantity:1,amount:425,period:{start,end}}]}});
 const first=invoice('in_first',anchor,Date.UTC(2026,11,3)/1000);let cancellations=0;
 const request=async(method,path,data)=>{if(method==='POST'){assert.equal(path,'subscriptions/sub_fixture');assert.equal(Number(data.cancel_at),Date.UTC(2027,10,3)/1000);assert.equal(data.proration_behavior,'none');cancellations++;sub={...sub,cancel_at:Number(data.cancel_at)};return sub}return path.startsWith('subscriptions/')?sub:first};
 const session={id:'cs_fixture',mode:'subscription',subscription:sub.id,payment_status:'paid',currency:'usd',amount_total:425,client_reference_id:'fixture',metadata:{pay_checkout:'passgram-org',pay_order_id:order.orderId}};
 await m.completePayEvent({id:'evt_checkout',type:'checkout.session.completed',data:{object:session}},{request});assert.equal(cancellations,1);assert.equal(rows.get('subscriptions/fixture').expiresAt.toMillis(),Date.UTC(2026,11,3));
 await m.completePayEvent({id:'evt_repeat',type:'invoice.paid',data:{object:first}},{request});assert.equal(rows.get('subscriptions/fixture').expiresAt.toMillis(),Date.UTC(2026,11,3));
 const second=invoice('in_second',Date.UTC(2026,11,3)/1000,Date.UTC(2027,0,3)/1000);await m.completePayEvent({id:'evt_second',type:'invoice.paid',data:{object:second}},{request});assert.equal(rows.get('subscriptions/fixture').expiresAt.toMillis(),Date.UTC(2027,0,3));
 for(const bad of [{...second,id:'in_bad',amount_paid:1},{...second,id:'in_bad',currency:'eur'}])await assert.rejects(m.completePayEvent({id:'evt_bad',type:'invoice.paid',data:{object:bad}},{request}));
 await m.completePayEvent({id:'evt_failed',type:'invoice.payment_failed',data:{object:{subscription:sub.id}}},{request});assert.equal(rows.get('subscriptions/fixture').expiresAt.toMillis(),Date.UTC(2027,0,3));assert.equal(rows.get('subscriptions/fixture').stripeStatus,'past_due');
 await m.completePayEvent({id:'evt_cancel',type:'customer.subscription.deleted',data:{object:{...sub,status:'canceled'}}},{request});assert.equal(rows.get('subscriptions/fixture').autoRenew,false);
 assert(!m.validPayRequest({...payload,amount:1}));console.log('JS PASS: $4.25 charged monthly, not $49.90 upfront; 12-month automatic end; paid-month-only access; duplicate invoice, failed payment, cancellation and tampered price protections. No live requests.');
})().catch(e=>{console.error(e);process.exit(1)});
