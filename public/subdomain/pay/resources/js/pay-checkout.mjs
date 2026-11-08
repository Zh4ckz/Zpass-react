// Review only: card details and payment confirmation stay with the bot + Stripe.
import {embeddedAvailable,loadStripe,mountEmbedded} from './stripe-embedded.mjs';
const params=new URLSearchParams(location.search);
let plan=['PLUS','PRO'].includes(params.get('plan')?.toUpperCase())?params.get('plan').toUpperCase():'PLUS';
let billing=['MONTHLY','YEARLY'].includes(params.get('billing')?.toUpperCase())?params.get('billing').toUpperCase():'MONTHLY';
const $=id=>document.getElementById(id);
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
let apiOrigin=null,config=null,busy=false,account=null;
const sessionKey=params.get("key");
const sessionValid=()=>account && Date.parse(account.expiresAt)>Date.now();
try{const fallback=await fetch('/subdomain/pay/resources/data/checkout-plans.json',{cache:'no-store'});if(fallback.ok)config={available:false,plans:Object.fromEntries(Object.entries(await fallback.json()).map(([key,value])=>['zpass_'+key.toLowerCase(),value]))}}catch{}
const features={PLUS:['Unlimited vault entries and notes','Unlimited authenticator accounts and aliases','Vault sharing up to 10','Uploads up to 2,000 MB'],PRO:['Unlimited vault entries and notes','Unlimited authenticator accounts and aliases','Unlimited vault sharing','Uploads up to 4,000 MB']};
export function backendOrigin(value,now=Date.now()){
 try{const url=new URL(value?.url);const temporary=/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname);const host=temporary||url.hostname==='api.zpas.org'||/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname);const updated=Date.parse(value.updatedAt);if(url.protocol!=='https:'||!host||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;if(temporary&&(!Number.isFinite(updated)||now-updated>86400000||updated>now+60000))return null;return url.origin}catch{return null}
}
export function stripeCheckout(value){try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='checkout.stripe.com'&&!url.port&&!url.username&&!url.password?url.href:null}catch{return null}}
function render(){
 document.querySelectorAll('input[name="plan"]').forEach(i=>i.checked=i.value===plan);
 document.querySelectorAll('input[name="billing"]').forEach(i=>i.checked=i.value===billing);
 $('summary-title').textContent='PassGram '+(plan==='PLUS'?'Plus':'Pro');
 $('pay-plan-description').textContent=plan==='PLUS'?'For your everyday essentials.':'For a bigger personal vault.';
 $('pay-includes').replaceChildren(...features[plan].map(text=>{const li=document.createElement('li');li.textContent=text;return li}));
 const entry=config?.plans?.['zpass_'+plan.toLowerCase()+'_'+billing.toLowerCase()];
 const price=entry?.price;const valid=typeof price==='number'&&Number.isFinite(price)&&price>0;
 $('pay-amount').textContent=valid?money.format(price):'—';$('pay-subtotal').textContent=valid?money.format(price):'Unavailable';
 $('pay-interval').textContent=billing==='YEARLY'?'/ month':'/ month';$('pay-billing-label').textContent=billing==='YEARLY'?'12 monthly payments':'Monthly';
 $('pay-renewal').textContent=billing==='YEARLY'?`${money.format(valid?price:0)} charged now and monthly for 12 months. Total ${money.format(valid?price*12:0)}. Ends after 12 months.`:'Charged monthly automatically until cancelled.';
 const monthly=config?.plans?.['zpass_'+plan.toLowerCase()+'_monthly']?.price;const yearly=config?.plans?.['zpass_'+plan.toLowerCase()+'_yearly']?.price;const savings=monthly>0&&yearly>0?Math.max(0,Math.round((1-yearly/monthly)*100)):0;
 $('pay-savings').hidden=!savings;$('pay-savings').textContent=savings?'Save '+savings+'%':'';
 const available=Boolean(valid&&entry.enabled!==false&&apiOrigin&&config?.available&&config?.billingModel==='monthly-v1');
 $('pay-submit').disabled=!available||!sessionValid()||busy;
 $('pay-submit').textContent=busy?'Opening Stripe…':available?'Continue to Stripe ↗':'Checkout unavailable';
 $('pay-status').textContent=!available?'Online checkout is temporarily unavailable. No payment has been taken.':!sessionValid()?(sessionKey?'Session key expired. Start checkout again.':'Sign in to continue with your account.'):'Review your account and final amount before paying on Stripe.';
 const embeddedOpen=Boolean(document.getElementById('pay-embedded')&&!document.getElementById('pay-embedded').hidden);
 document.querySelectorAll('input').forEach(i=>i.disabled=busy||embeddedOpen);
 const url=new URL(location.href);url.search=new URLSearchParams({plan,billing}).toString();if(params.has('payment'))url.searchParams.set('payment',params.get('payment'));if(sessionKey)url.searchParams.set('key',sessionKey);history.replaceState(null,'',url);
 $('pay-account').textContent=account?.username || (sessionKey?'Session key expired':'Sign in to your account');
 $('pay-signin').hidden=Boolean(sessionValid());
 $('pay-signin').textContent=sessionKey?'Start checkout again':'Sign in to continue';
 $('pay-signin').href='https://web.zpas.org/web?'+new URLSearchParams({checkout:'1',plan,billing,v:'3'});
 try{if(window.top!==window.self&&window.top.location.hostname==='pay.zpas.org'){window.top.history.replaceState(null,'','/'+url.search);window.top.document.title='Checkout — PassGram'}}catch{}
}
document.querySelectorAll('input[name="plan"],input[name="billing"]').forEach(input=>input.addEventListener('change',()=>{if(input.name==='plan')plan=input.value;else billing=input.value;render()}));

// Embedded checkout: the Stripe payment form opens inside this page (falls back to the Stripe page if Stripe.js cannot load).
async function createSession(embedded){
 const response=await fetch(apiOrigin+'/checkout/pay-session',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({productId:'zpass_'+plan.toLowerCase()+'_'+billing.toLowerCase(),key:sessionKey,requestId:crypto.randomUUID(),...(embedded?{embedded:true}:{})})});
 const result=await response.json();if(!response.ok)throw Error(typeof result.error==='string'?result.error:'Checkout could not be created. Try again shortly.');return result;
}
async function openEmbedded(){
 if(!embeddedAvailable(config))return false;
 try{await loadStripe()}catch{return false}
 let box=$('pay-embedded');if(!box){box=document.createElement('div');box.id='pay-embedded';box.className='pay-embedded';$('pay-submit').insertAdjacentElement('afterend',box)}
 $('pay-status').textContent='Enter your payment details below. Your card details go directly to Stripe.';
 await mountEmbedded({publishableKey:config.publishableKey,container:box,fetchClientSecret:async()=>(await createSession(true)).clientSecret,onComplete:()=>{$('pay-submit').hidden=true;$('pay-status').textContent='Payment received. Your membership will appear in the app in a moment.'}});
 $('pay-submit').hidden=true;document.querySelectorAll('input[name="plan"],input[name="billing"]').forEach(i=>i.disabled=true);
 return true;
}
$('pay-submit').addEventListener('click',async()=>{
 if($('pay-submit').disabled||!apiOrigin||!sessionValid())return;
 busy=true;render();
 try{
  if(await openEmbedded()){busy=false;document.querySelectorAll('input[name="plan"],input[name="billing"]').forEach(i=>i.disabled=true);return}
  const result=await createSession(false);
  const destination=stripeCheckout(result.checkoutUrl);if(!destination)throw Error('The payment provider could not be verified. No payment has been taken.');
  window.top.location.assign(destination);
 }catch(error){busy=false;render();$('pay-status').textContent=error.name==='TimeoutError'?'The payment service took too long. No payment has been taken. Try again shortly.':String(error.message||'Checkout is temporarily unavailable.').slice(0,180)}
});
window.addEventListener('pageshow',()=>{if(busy){busy=false;render()}});
try{
 const response=await fetch('/subdomain/pay/resources/data/pay-backend.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('No payment service');apiOrigin=backendOrigin(await response.json());if(!apiOrigin)throw Error('Payment service not current');
 const configResponse=await fetch(apiOrigin+'/checkout/pay-config',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(5000)});if(!configResponse.ok)throw Error('Payment service unavailable');const live=await configResponse.json();if(live.billingModel!=='monthly-v1')throw Error('Payment backend requires update');config=live;
 if(sessionKey){const response=await fetch(apiOrigin+'/checkout/pay-account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:sessionKey}),signal:AbortSignal.timeout(10000)});if(response.ok)account=await response.json();}
}catch{if(config)config.available=false}
render();
setInterval(()=>{if(account&&!sessionValid()){account=null;render()}},1000);
if(params.get('payment')==='returned')$('pay-status').textContent='Check your membership in the app. If confirmation is still pending, contact support.';
if(params.get('payment')==='cancelled')$('pay-status').textContent='Checkout was cancelled. You can review your plan and try again.';
