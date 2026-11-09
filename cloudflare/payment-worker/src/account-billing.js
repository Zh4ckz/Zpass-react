import {HttpError,digest} from './payments.js';
import {knownModel,terms,objectId,stripeId,invoiceSubscription,commitmentEnd} from './billing.js';
export const REFUND_WINDOW_MS=24*60*60*1000;
const iso=value=>value instanceof Date?value.toISOString():null;
export function documentUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&['invoice.stripe.com','pay.stripe.com','files.stripe.com'].includes(url.hostname)&&!url.username&&!url.password&&!url.port?url.href:null}catch{return null}}
export function accountTier(value,now=Date.now()){return value?.status==='ACTIVE'&&value.expiresAt instanceof Date&&value.expiresAt.getTime()>now?value.plan==='PRO'||value.plan==='FAMILY'||value.planId?.startsWith('zpass_pro_')?'PRO':value.plan==='PLUS'||value.plan==='INDIVIDUAL'||value.planId?.startsWith('zpass_plus_')?'PLUS':'FREE':'FREE'}
export function refundableAmount(invoice){const net=invoice.total_excluding_tax;return invoice.status==='paid'&&invoice.currency==='usd'&&Number.isSafeInteger(net)&&net>0&&Number.isSafeInteger(invoice.amount_paid)?Math.min(net,invoice.amount_paid):0}
export class AccountBilling {
 constructor({db,stripe,now=()=>Date.now()}){this.db=db;this.stripe=stripe;this.now=now}
 async record(uid){return await this.db.get('subscriptions/'+uid)||{plan:'FREE',status:'FREE'}}
 async owned(uid,record){const value=record||await this.record(uid);if(!stripeId(value.stripeSubscriptionId,'sub')||!stripeId(value.stripeCustomerId,'cus'))throw new HttpError(409,'This subscription is managed by its original provider. Contact support.');const sub=await this.stripe('GET','subscriptions/'+value.stripeSubscriptionId);if(sub.id!==value.stripeSubscriptionId||objectId(sub.customer)!==value.stripeCustomerId||sub.metadata?.pay_uid!==uid||sub.metadata?.pay_checkout!=='passgram-org')throw new HttpError(403,'Subscription ownership could not be verified.');return {record:value,sub}}
 async locked(uid,action){const path='pay_billing_locks/'+await digest(uid),nonce=crypto.randomUUID();await this.db.transaction(async tx=>{const previous=await tx.get(path);if(previous?.expiresAt instanceof Date&&previous.expiresAt.getTime()>this.now())throw new HttpError(409,'Another billing change is in progress. Please try again.');tx.set(path,{nonce,expiresAt:new Date(this.now()+120000)})});try{return await action()}finally{await this.db.transaction(async tx=>{const lock=await tx.get(path);if(lock?.nonce===nonce)tx.set(path,{expiresAt:new Date(0)})})}}
 async invoices(uid,cursor=''){
  if(cursor&&!stripeId(cursor,'in'))throw new HttpError(400,'Invalid invoice cursor.');
  const record=await this.record(uid);if(!record.stripeSubscriptionId)return {invoices:[],hasMore:false,cursor:null};
  const {sub}=await this.owned(uid,record),query='invoices?customer='+record.stripeCustomerId+'&subscription='+sub.id+'&limit=100'+(cursor?'&starting_after='+cursor:'');
  const page=await this.stripe('GET',query);const invoices=(page.data||[]).filter(v=>objectId(v.customer)===record.stripeCustomerId&&invoiceSubscription(v)===sub.id&&v.status!=='draft').map(v=>({id:v.id,number:String(v.number||v.id).slice(0,100),created:v.created,currency:v.currency,subtotal:v.total_excluding_tax??null,paid:v.amount_paid,status:v.status,pdf:documentUrl(v.invoice_pdf),view:documentUrl(v.hosted_invoice_url)}));
  return {invoices,hasMore:Boolean(page.has_more),cursor:page.has_more?page.data?.at(-1)?.id||null:null};
 }
 async firstInvoice(uid,record,sub){
  if(record.firstInvoiceId){const invoice=await this.stripe('GET','invoices/'+record.firstInvoiceId);if(!stripeId(invoice.id,'in')||objectId(invoice.customer)!==record.stripeCustomerId||invoiceSubscription(invoice)!==sub.id)throw new HttpError(403,'Invoice ownership could not be verified.');return invoice}
  let cursor='',first=null;for(let pageIndex=0;pageIndex<10;pageIndex++){
   const page=await this.stripe('GET','invoices?customer='+record.stripeCustomerId+'&subscription='+sub.id+'&status=paid&limit=100'+(cursor?'&starting_after='+cursor:''));
   for(const invoice of page.data||[])if(objectId(invoice.customer)===record.stripeCustomerId&&invoiceSubscription(invoice)===sub.id&&invoice.billing_reason==='subscription_create'&&invoice.status==='paid'&&(!first||invoice.created<first.created))first=invoice;
   if(!page.has_more)break;cursor=page.data?.at(-1)?.id;if(!stripeId(cursor,'in')||pageIndex===9)throw new HttpError(409,'Invoice history needs support review.');
  }
  if(first){await this.db.patch('subscriptions/'+uid,{firstInvoiceId:first.id,firstSubscriptionId:record.firstSubscriptionId||sub.id,firstPaidAt:new Date((first.status_transitions?.paid_at||first.created)*1000)});}
  return first;
 }
 async overview(uid){
  let record=await this.record(uid);if(record.refundInvoiceId){await this.reconcileRefund(uid,record.refundInvoiceId);record=await this.record(uid)}
  let refund={eligible:false,deadline:null,amount:0,currency:'usd',status:null},managed=false,cancelled=!record.autoRenew;
  if(record.stripeSubscriptionId){const {sub}=await this.owned(uid,record);managed=true;cancelled=Boolean(sub.cancel_at_period_end||sub.status==='canceled');const first=record.firstSubscriptionId&&record.firstSubscriptionId!==sub.id?null:await this.firstInvoice(uid,record,sub);if(first){const paidAt=(first.status_transitions?.paid_at||first.created)*1000,deadline=paidAt+REFUND_WINDOW_MS,prior=await this.db.get('pay_refunds/'+first.id);refund={eligible:(!prior&&this.now()<deadline&&this.now()>=paidAt)||(prior?.status==='requested'&&prior.requestedAt instanceof Date&&prior.requestedAt.getTime()>=paidAt&&prior.requestedAt.getTime()<deadline),deadline:new Date(deadline).toISOString(),amount:refundableAmount(first),currency:'usd',status:prior?.status||null};refund.eligible=refund.eligible&&refund.amount>0;}}
  const page=await this.invoices(uid);
  const profile=await this.db.get('chat_profiles/'+uid);
  return {username:profile?.username||profile?.displayName||null,plan:accountTier(record,this.now()),status:record.status||'FREE',expiresAt:iso(record.expiresAt),autoRenew:managed?!cancelled&&Boolean(record.autoRenew):Boolean(record.autoRenew),managed,commitmentMonths:record.commitmentMonths||0,monthlyAmount:record.monthlyAmount||0,billingInterval:record.billingInterval||'month',chargeAmount:record.chargeAmount||record.monthlyAmount||0,scheduledPlan:record.scheduledPlan||null,scheduledAt:iso(record.scheduledAt),refund,...page};
 }
 async releaseSchedule(uid,sub){const id=objectId(sub.schedule);if(id){if(!/^sub_sched_[A-Za-z0-9]+$/.test(id))throw new HttpError(409,'Subscription schedule could not be verified.');await this.stripe('POST','subscription_schedules/'+id+'/release',{},'passgram-release-'+id);await this.db.patch('subscriptions/'+uid,{scheduledPlan:null,scheduledAt:null})}}
 async cancel(uid){return this.locked(uid,async()=>{const {sub}=await this.owned(uid);if(sub.status==='canceled')return {cancelled:true};await this.releaseSchedule(uid,sub);const result=await this.stripe('POST','subscriptions/'+sub.id,{cancel_at_period_end:'true'},'passgram-cancel-'+sub.id+'-'+this.now());if(!result.cancel_at_period_end&&result.status!=='canceled')throw new HttpError(503,'Cancellation has not been confirmed.');await this.db.patch('subscriptions/'+uid,{autoRenew:false,cancelRequestedAt:new Date(this.now()),scheduledPlan:null,scheduledAt:null});return {cancelled:true,message:'Renewal cancelled. Your paid access remains until the end of the paid period.'}})}
 async resume(uid){return this.locked(uid,async()=>{const {sub}=await this.owned(uid);if(sub.status==='canceled')throw new HttpError(409,'This subscription already ended. Start a new one from the plans screen.');if(!sub.cancel_at_period_end)return {resumed:true,message:'Auto-renew is already on.'};const result=await this.stripe('POST','subscriptions/'+sub.id,{cancel_at_period_end:'false'},'passgram-resume-'+sub.id+'-'+this.now());if(result.cancel_at_period_end)throw new HttpError(503,'Renewal could not be turned back on.');await this.db.patch('subscriptions/'+uid,{autoRenew:true,cancelRequestedAt:null});return {resumed:true,message:'Auto-renew is on again. You will be charged at the next renewal date.'}})}
 async reconcileRefund(uid,invoiceId){const path='pay_refunds/'+invoiceId,refund=await this.db.get(path);if(!refund||refund.uid!==uid)return null;let status=refund.status;if(refund.refundId&&status!=='succeeded'&&status!=='failed'&&status!=='canceled'){const value=await this.stripe('GET','refunds/'+refund.refundId);if(value.id!==refund.refundId||value.amount!==refund.amount)throw new HttpError(503,'Refund confirmation unavailable.');status=value.status;await this.db.patch(path,{status})}
  if(status==='succeeded'){
   const current=await this.db.get('subscriptions/'+uid);
   if(current?.stripeSubscriptionId===refund.subscriptionId&&current.refundStatus!=='succeeded'){
    const existing=await this.stripe('GET','subscriptions/'+refund.subscriptionId);
    if(existing.metadata?.pay_uid!==uid)throw new HttpError(403,'Refund subscription ownership could not be verified.');
    if(existing.status!=='canceled'){const cancelled=await this.stripe('DELETE','subscriptions/'+refund.subscriptionId,{invoice_now:'false',prorate:'false'},'passgram-refunded-cancel-'+refund.subscriptionId);if(cancelled.status!=='canceled')throw new HttpError(503,'Refund issued; subscription cancellation is still being confirmed.');}
    await this.db.transaction(async tx=>{const latest=await tx.get('subscriptions/'+uid);if(latest?.stripeSubscriptionId===refund.subscriptionId&&latest.refundStatus!=='succeeded')tx.set('subscriptions/'+uid,{status:'REFUNDED',stripeStatus:'canceled',autoRenew:false,expiresAt:new Date(this.now()),refundInvoiceId:invoiceId,refundStatus:'succeeded',scheduledPlan:null,scheduledAt:null})});
   }
  }
  return {...refund,status};
 }
 async refund(uid){return this.locked(uid,async()=>{
  const {record,sub}=await this.owned(uid);if(record.firstSubscriptionId&&record.firstSubscriptionId!==sub.id)throw new HttpError(409,'Only your first subscription payment can be refunded.');const invoice=await this.firstInvoice(uid,record,sub);if(!invoice)throw new HttpError(409,'The first paid invoice could not be found.');
  const path='pay_refunds/'+invoice.id,existing=await this.db.get(path);if(existing?.refundId){const value=await this.reconcileRefund(uid,invoice.id);return {status:value.status,amount:value.amount,currency:'usd'}}
  const paidAt=(invoice.status_transitions?.paid_at||invoice.created)*1000,requestedAt=existing?.requestedAt?.getTime()??this.now(),amount=refundableAmount(invoice);
  if(requestedAt<paidAt||requestedAt>=paidAt+REFUND_WINDOW_MS)throw new HttpError(409,'The 24-hour refund window has expired. Viewing or downloading invoices does not reset it.');
  if(!amount)throw new HttpError(409,'This invoice requires a manual refund review.');
  if(!existing)await this.db.transaction(async tx=>{const prior=await tx.get(path);if(!prior)tx.set(path,{uid,subscriptionId:sub.id,amount,status:'requested',requestedAt:new Date(requestedAt)},{create:true})});
  await this.releaseSchedule(uid,sub);
  const stopped=sub.status==='canceled'?sub:await this.stripe('POST','subscriptions/'+sub.id,{cancel_at_period_end:'true'},'passgram-cancel-'+sub.id+'-'+this.now());if(!stopped.cancel_at_period_end&&stopped.status!=='canceled')throw new HttpError(503,'Cancellation has not been confirmed.');
  let payment=objectId(invoice.payment_intent),charge=objectId(invoice.charge);
  if(!stripeId(payment,'pi')&&!stripeId(charge,'ch')){const payments=await this.stripe('GET','invoice_payments?invoice='+invoice.id+'&limit=100');payment=objectId(payments.data?.find(p=>p.status==='paid'&&objectId(p.invoice)===invoice.id)?.payment?.payment_intent);}
  if(!stripeId(payment,'pi')&&!stripeId(charge,'ch'))throw new HttpError(409,'Payment requires manual refund review.');
  const result=await this.stripe('POST','refunds',{...(stripeId(payment,'pi')?{payment_intent:payment}:{charge}),amount:String(amount),reason:'requested_by_customer','metadata[pay_uid]':uid,'metadata[pay_invoice]':invoice.id},'passgram-refund-'+invoice.id);
  if(!stripeId(result.id,'re')||result.amount!==amount||result.currency!=='usd')throw new HttpError(503,'Refund could not be verified.');
  await this.db.patch(path,{refundId:result.id,status:result.status});await this.db.patch('subscriptions/'+uid,{autoRenew:false,refundInvoiceId:invoice.id});await this.reconcileRefund(uid,invoice.id);
  return {status:result.status,amount,currency:'usd',message:result.status==='succeeded'?'Refund issued to the original payment method. Bank processing time varies.':'Refund submitted. The payment provider is processing it.'};
 })}
 async upgrade(uid){return this.locked(uid,async()=>{
  const {record,sub}=await this.owned(uid);if(record.scheduledPlan==='PRO')return {scheduledPlan:'PRO',scheduledAt:iso(record.scheduledAt)};
  if(accountTier(record,this.now())!=='PLUS'||sub.status!=='active'||sub.cancel_at_period_end||sub.schedule)throw new HttpError(409,'Only an active Plus subscription without a pending change can upgrade.');
  const item=sub.items?.data?.[0];if(sub.items?.data?.length!==1||!stripeId(item?.price?.id,'price')||item.quantity!==1)throw new HttpError(409,'This subscription needs manual review.');
  const next=item.current_period_end||sub.current_period_end,start=item.current_period_start||sub.current_period_start;
  if(!Number.isInteger(next)||next*1000<=this.now()||!Number.isInteger(start))throw new HttpError(409,'The next billing date could not be verified.');
  const yearly=record.billingInterval==='year',legacyTerm=record.commitmentMonths===12&&!yearly,interval=record.commitmentMonths===12?'yearly':'monthly',productId='zpass_pro_'+interval,value=terms(productId),termEnd=legacyTerm?commitmentEnd(sub.start_date||sub.billing_cycle_anchor,12):commitmentEnd(next,yearly?12:1);
  if(termEnd<=next)throw new HttpError(409,'The commitment is ending. Choose Pro after it ends.');
  const orderId=await digest(uid+':scheduled-pro:'+sub.id),old=await this.db.get('pay_orders/'+sub.metadata.pay_order_id);if(!old||old.uid!==uid||!knownModel(old))throw new HttpError(403,'Subscription order could not be verified.');
  const price=await this.stripe('POST','prices',{currency:'usd',unit_amount:String(value.amountCents),'recurring[interval]':value.interval,'product_data[name]':'PassGram Pro','metadata[pay_product_id]':productId},'passgram-pro-price-'+productId+'-'+value.interval+'-'+value.amountCents);if(!stripeId(price.id,'price'))throw new HttpError(503,'Upgrade price unavailable.');
  await this.db.transaction(async tx=>{const prior=await tx.get('pay_orders/'+orderId);if(!prior)tx.set('pay_orders/'+orderId,{...old,orderId,productId,...value,status:'SCHEDULED',subscriptionId:sub.id,createdAt:new Date(this.now())},{create:true})});
  const schedule=await this.stripe('POST','subscription_schedules',{from_subscription:sub.id},'passgram-upgrade-schedule-'+sub.id);if(!/^sub_sched_[A-Za-z0-9]+$/.test(schedule.id||''))throw new HttpError(503,'Upgrade schedule unavailable.');
  const form={end_behavior:legacyTerm?'cancel':'release',proration_behavior:'none','phases[0][start_date]':String(schedule.current_phase?.start_date||start),'phases[0][end_date]':String(next),'phases[0][items][0][price]':item.price.id,'phases[0][items][0][quantity]':'1','phases[0][proration_behavior]':'none','phases[1][start_date]':String(next),'phases[1][end_date]':String(termEnd),'phases[1][items][0][price]':price.id,'phases[1][items][0][quantity]':'1','phases[1][proration_behavior]':'none','phases[1][metadata][pay_checkout]':'passgram-org','phases[1][metadata][pay_uid]':uid,'phases[1][metadata][pay_order_id]':orderId};
  await this.stripe('POST','subscription_schedules/'+schedule.id,form,'passgram-upgrade-phases-'+sub.id);
  await this.db.patch('subscriptions/'+uid,{scheduledPlan:'PRO',scheduledAt:new Date(next*1000),upgradeScheduleId:schedule.id});return {scheduledPlan:'PRO',scheduledAt:new Date(next*1000).toISOString(),message:'Pro is scheduled for your next renewal. No extra charge was made today.'};
 })}
}
