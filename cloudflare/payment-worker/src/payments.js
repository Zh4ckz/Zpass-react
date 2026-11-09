import {BILLING_MODEL,knownModel,intervalOf,terms,validRequest,checkoutForm,objectId,stripeId,invoiceSubscription,verifiedSession,verifiedInvoice,commitmentEnd} from './billing.js';
export class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
export class PaymentService {
 constructor({db,stripe,now=()=>Date.now()}){this.db=db;this.stripe=stripe;this.now=now}
 async product(plan){const id='passgram_'+plan.toLowerCase();try{const p=await this.stripe('GET','products/'+id);if(p?.id===id)return id}catch{}const made=await this.stripe('POST','products',{id,name:'PassGram '+(plan==='PLUS'?'Plus':'Pro')},'passgram-product-'+id);if(made?.id!==id)throw Error('Invalid product');return id}
 async customer(uid,email){const record=await this.db.get?.('subscriptions/'+uid);if(stripeId(record?.stripeCustomerId,'cus'))return record.stripeCustomerId;const c=await this.stripe('POST','customers',{...(email?{email}:{}),'metadata[pay_uid]':uid,'metadata[pay_checkout]':'passgram-org'},'passgram-customer-'+uid);if(!stripeId(c.id,'cus'))throw Error('Invalid customer');return c.id}
 async create(payload,expectedUid,embedded=false,email=''){
  if(!validRequest(payload)&&!(expectedUid&&terms(payload?.productId)&&/^[a-f0-9-]{32,36}$/i.test(payload?.requestId||'')&&typeof payload.zPassId==='string'&&payload.zPassId.length<=128&&Object.keys(payload).every(k=>['productId','zPassId','requestId'].includes(k))))throw new HttpError(400,'Choose a plan and enter a valid Z Pass ID.');
  const account=expectedUid&&!/^ZP-[A-Z0-9]{10}$/.test(payload.zPassId)?{uid:expectedUid}:await this.db.findRecipient(payload.zPassId);if(!account)throw new HttpError(400,'Check your Z Pass ID in the app and try again.');
  if(expectedUid&&account.uid!==expectedUid)throw new HttpError(403,'Checkout account mismatch.');
  const value=terms(payload.productId),orderId=await digest(account.uid+':'+payload.productId+':'+payload.requestId),path='pay_orders/'+orderId,ratePath='pay_rate_limits/'+await digest(account.uid);
  const order={orderId,uid:account.uid,zPassId:payload.zPassId,productId:payload.productId,...value,billingModel:BILLING_MODEL,currency:'usd',status:'CREATED',processor:'cloudflare'};
  const existing=await this.db.transaction(async tx=>{
   const [previous,subscription,rate]=await Promise.all([tx.get(path),tx.get('subscriptions/'+account.uid),tx.get(ratePath)]);
   if(previous){if(previous.uid!==order.uid||previous.productId!==order.productId||previous.amountCents!==order.amountCents||previous.billingModel!==BILLING_MODEL)throw new HttpError(409,'This checkout needs to be refreshed.');return previous}
   if(subscription?.status==='ACTIVE'&&subscription?.expiresAt instanceof Date&&subscription.expiresAt.getTime()>this.now())throw new HttpError(409,'Manage your existing subscription to change plans.');
   if(subscription?.stripeSubscriptionId&&['active','trialing','past_due','unpaid','incomplete'].includes(subscription.stripeStatus))throw new HttpError(409,'This account already has an automatic subscription. Manage the existing subscription or contact support.');
   if(rate?.createdAt instanceof Date&&this.now()-rate.createdAt.getTime()<15000)throw new HttpError(429,'Please wait a few seconds before trying again.');
   tx.set(path,{...order,createdAt:new Date(this.now())},{create:true});tx.set(ratePath,{createdAt:new Date(this.now())});return null;
  });
  if(embedded==='native'){
   if(existing?.nativeSecret)return{paymentIntentClientSecret:existing.nativeSecret,subscriptionId:existing.subscriptionId};
   const plan=order.productId.includes('_plus_')?'PLUS':'PRO',product=await this.product(plan),customer=await this.customer(order.uid,email);
   const sub=await this.stripe('POST','subscriptions',{customer,'items[0][quantity]':'1','items[0][price_data][currency]':'usd','items[0][price_data][product]':product,'items[0][price_data][unit_amount]':String(order.amountCents),'items[0][price_data][recurring][interval]':intervalOf(order),payment_behavior:'default_incomplete','payment_settings[save_default_payment_method]':'on_subscription','metadata[pay_checkout]':'passgram-org','metadata[pay_order_id]':orderId,'metadata[pay_uid]':order.uid,'expand[0]':'latest_invoice.confirmation_secret'},'passgram-pay-native-'+orderId);
   if(!stripeId(sub.id,'sub')||sub.metadata?.pay_order_id!==orderId)throw Error('Invalid provider subscription');
   let secret=sub.latest_invoice?.confirmation_secret?.client_secret;
   if(!secret){const inv=objectId(sub.latest_invoice);if(stripeId(inv,'in')){const full=await this.stripe('POST','invoices/'+inv,{'expand[0]':'payment_intent'});secret=full?.payment_intent?.client_secret}}
   if(typeof secret!=='string'||!/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(secret))throw Error('Invalid payment secret');
   await this.db.patch(path,{sessionId:'native_'+sub.id,subscriptionId:sub.id,customerId:customer,nativeSecret:secret,channel:'android'});
   return{paymentIntentClientSecret:secret,subscriptionId:sub.id};
  }
  if(embedded){
   if(existing?.clientSecret)return{clientSecret:existing.clientSecret};
   const session=await this.stripe('POST','checkout/sessions',checkoutForm(order,true),'passgram-pay-elements-'+orderId);
   if(!stripeId(session.id,'cs')||typeof session.client_secret!=='string'||!session.client_secret.startsWith(session.id))throw Error('Invalid provider session');
   await this.db.patch(path,{sessionId:session.id,clientSecret:session.client_secret});return{clientSecret:session.client_secret};
  }
  if(existing?.paymentUrl)return{checkoutUrl:this.providerUrl(existing.paymentUrl)};
  const session=await this.stripe('POST','checkout/sessions',checkoutForm(order),'passgram-pay-'+orderId),url=this.providerUrl(session.url);
  if(!stripeId(session.id,'cs'))throw Error('Invalid provider session');
  await this.db.patch(path,{sessionId:session.id,paymentUrl:url});return{checkoutUrl:url};
 }
 providerUrl(value){const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password||url.port)throw Error('Invalid provider URL');return url.href}
 async ensureTerm(sub,order){
  if(order.commitmentMonths!==12||intervalOf(order)==='year'||sub.cancel_at_period_end||sub.schedule)return sub;const end=commitmentEnd(sub.start_date||sub.billing_cycle_anchor,12);if(!Number.isInteger(end)||end<=0)throw Error('Subscription start missing');
  if(sub.cancel_at!==end&&sub.status!=='canceled')return this.stripe('POST','subscriptions/'+sub.id,{cancel_at:String(end),proration_behavior:'none'},'passgram-pay-term-'+order.orderId);return sub;
 }
 async applyInvoice(eventId,invoice,sub,order){
  if(!verifiedInvoice(invoice,sub,order)||!stripeId(invoice.id,'in'))throw Error('Invoice does not match order');
  const price=sub.items.data[0].price.id,line=invoice.lines.data.find(v=>objectId(v.price)===price||v.pricing?.price_details?.price===price),paidThrough=new Date(line.period.end*1000),orderPath='pay_orders/'+order.orderId,accountPath='subscriptions/'+order.uid,marker='pay_stripe_invoices/'+invoice.id;
  await this.db.transaction(async tx=>{
   const [seen,current,previous]=await Promise.all([tx.get(marker),tx.get(orderPath),tx.get(accountPath)]);if(seen)return;if(current?.sessionId!==order.sessionId)throw Error('Order changed');
   const expiresAt=new Date(Math.max(previous?.expiresAt instanceof Date?previous.expiresAt.getTime():0,paidThrough.getTime()));
   const firstPayment=invoice.billing_reason==='subscription_create'?{firstInvoiceId:previous?.firstInvoiceId||invoice.id,firstSubscriptionId:previous?.firstSubscriptionId||previous?.stripeSubscriptionId||sub.id,firstPaidAt:previous?.firstPaidAt||new Date((invoice.status_transitions?.paid_at||invoice.created||this.now()/1000)*1000)}:{};
   tx.set(accountPath,{...firstPayment,...(order.productId.includes('_pro_')?{scheduledPlan:null,scheduledAt:null}:{}),plan:order.productId.includes('_plus_')?'PLUS':'PRO',planId:order.productId,status:'ACTIVE',provider:'STRIPE',zPassId:order.zPassId,expiresAt,autoRenew:sub.status!=='canceled'&&!sub.cancel_at_period_end&&(!sub.cancel_at||sub.cancel_at>line.period.end),stripeCustomerId:objectId(sub.customer),stripeSubscriptionId:sub.id,stripeCheckoutSessionId:order.sessionId,stripeStatus:sub.status,billingInterval:intervalOf(order),commitmentMonths:order.commitmentMonths,monthlyAmount:(order.monthlyCents??order.amountCents)/100,chargeAmount:order.amountCents/100,updatedAt:new Date(this.now())});
   tx.set(orderPath,{status:'SUBSCRIBED',subscriptionId:sub.id,lastInvoiceId:invoice.id,lastPaidThrough:paidThrough});tx.set(marker,{orderId:order.orderId,eventId,processedAt:new Date(this.now())},{create:true});
  });
 }
 async webhook(event){
  if(!/^evt_[A-Za-z0-9]+$/.test(event.id||''))throw Error('Invalid event');const value=event.data?.object||{},kind=event.type;
  if(kind==='checkout.session.completed'&&value.metadata?.pay_checkout==='passgram-org'){
   const id=value.metadata.pay_order_id;if(!/^[a-f0-9]{64}$/.test(id||''))throw Error('Invalid order');const path='pay_orders/'+id,order=await this.db.get(path);
   if(!knownModel(order))return; // Existing legacy one-time orders remain with their original bot webhook.
   if(!verifiedSession(value,order))throw Error('Invalid paid session');let sub=await this.stripe('GET','subscriptions/'+objectId(value.subscription));
   if(sub.metadata?.pay_order_id!==id||sub.metadata?.pay_uid!==order.uid||sub.metadata?.pay_checkout!=='passgram-org')throw Error('Subscription identity mismatch');
   sub=await this.ensureTerm(sub,order);await this.db.patch(path,{subscriptionId:sub.id,customerId:objectId(sub.customer),status:'SUBSCRIBED'});
   if(!stripeId(objectId(sub.latest_invoice),'in'))throw Error('Paid invoice missing');await this.applyInvoice(event.id,await this.stripe('GET','invoices/'+objectId(sub.latest_invoice)),sub,order);return;
  }
  if(kind==='invoice.paid'){
   const sid=invoiceSubscription(value);if(!stripeId(sid,'sub'))return;let sub=await this.stripe('GET','subscriptions/'+sid);if(sub.metadata?.pay_checkout!=='passgram-org')return;
   const id=sub.metadata.pay_order_id;if(!/^[a-f0-9]{64}$/.test(id||''))throw Error('Invalid order');const order=await this.db.get('pay_orders/'+id);if(!knownModel(order))return;sub=await this.ensureTerm(sub,order);await this.applyInvoice(event.id,value,sub,order);return;
  }
  if(['customer.subscription.updated','customer.subscription.deleted','invoice.payment_failed'].includes(kind)){
   let sub=value;if(kind==='invoice.payment_failed'){const sid=invoiceSubscription(value);if(!stripeId(sid,'sub'))return;sub=await this.stripe('GET','subscriptions/'+sid)}
   if(sub.metadata?.pay_checkout!=='passgram-org')return;const id=sub.metadata.pay_order_id;if(!/^[a-f0-9]{64}$/.test(id||''))throw Error('Invalid order');const order=await this.db.get('pay_orders/'+id);
   if(!knownModel(order))return;if(order.uid!==sub.metadata.pay_uid||(order.subscriptionId&&order.subscriptionId!==sub.id))throw Error('Subscription identity mismatch');
   const path='subscriptions/'+order.uid;await this.db.transaction(async tx=>{const previous=await tx.get(path);if(previous?.stripeSubscriptionId!==sub.id)return;tx.set(path,{stripeStatus:kind==='invoice.payment_failed'?'past_due':sub.status,autoRenew:kind!=='customer.subscription.deleted'&&sub.status!=='canceled'&&!sub.cancel_at_period_end&&(!sub.cancel_at||sub.cancel_at*1000>(previous.expiresAt?.getTime?.()||0)),updatedAt:new Date(this.now())})});
  }
 }
}
