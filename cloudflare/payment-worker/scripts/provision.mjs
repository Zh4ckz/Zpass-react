// Uses existing local credentials in memory and sends them only through Wrangler stdin.
// Never write Stripe or Firebase private keys into a file, command argument, or console.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
const projectRoot=path.resolve(here,'../../..');
const botRoot=process.env.PAYMENT_BOT_ROOT||path.resolve(projectRoot,'../../Bots-JS/payment-bot');
const require=createRequire(path.join(botRoot,'package.json'));
const {parse}=require('dotenv');
const settings=parse(fs.readFileSync(path.join(botRoot,'.env')));
const stripeKey=settings.STRIPE_SECRET_KEY;
const account=JSON.parse(fs.readFileSync(settings.ZPASS_WEB_SERVICE_ACCOUNT||path.join(botRoot,'zpass-web-service-account.json'),'utf8'));
if(!/^sk_(live|test)_/.test(stripeKey||'')||account.project_id!=='passgram-org'||!account.private_key)throw Error('Existing payment credentials are unavailable.');
const workerOrigin=process.env.PAYMENT_WORKER_ORIGIN||'https://passgram-pay-api.rezanhassoun.workers.dev';
if(!/^https:\/\/passgram-pay-api\.[a-z0-9-]+\.workers\.dev$/.test(workerOrigin))throw Error('Unexpected Worker origin.');
const config=path.join(projectRoot,'cloudflare/payment-worker/wrangler.jsonc'),wrangler=path.join(projectRoot,'cloudflare/payment-worker/node_modules/wrangler/bin/wrangler.js');
const required=['checkout.session.completed','invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted'];
async function stripe(method,endpoint,data){const headers={Authorization:'Bearer '+stripeKey};const options={method,headers,signal:AbortSignal.timeout(15000)};if(data){headers['Content-Type']='application/x-www-form-urlencoded';options.body=new URLSearchParams(data)}const response=await fetch('https://api.stripe.com/v1/'+endpoint,options);const result=await response.json();if(!response.ok)throw Error('Stripe webhook configuration failed (HTTP '+response.status+').');return result;}
function installSecrets(values){const result=spawnSync(process.execPath,[wrangler,'secret','bulk','--config',config],{cwd:projectRoot,input:JSON.stringify(values),encoding:'utf8',maxBuffer:2*1024*1024,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(result.status!==0)throw Error('Encrypted Worker secret upload failed. No credential values were logged.');}
const list=await stripe('GET','webhook_endpoints?limit=100');
let endpoint=(list.data||[]).find(item=>item.url===workerOrigin+'/stripe-webhook'&&item.description==='PassGram Cloudflare payment worker');
let webhookSecret;
if(endpoint){
 const response=await fetch(workerOrigin+'/health',{signal:AbortSignal.timeout(20000)});const current=await response.json();if(!current.configured)throw Error('The existing Worker webhook signing secret needs recovery. No endpoint was deleted or replaced.');
 const events=endpoint.enabled_events.includes('*')?['*']:[...new Set([...endpoint.enabled_events,...required])];const body={};events.forEach((name,index)=>body['enabled_events['+index+']']=name);endpoint=await stripe('POST','webhook_endpoints/'+endpoint.id,body);
}else{
 const body={url:workerOrigin+'/stripe-webhook',description:'PassGram Cloudflare payment worker'};required.forEach((name,index)=>body['enabled_events['+index+']']=name);endpoint=await stripe('POST','webhook_endpoints',body);webhookSecret=endpoint.secret;if(!/^whsec_/.test(webhookSecret||''))throw Error('Stripe did not return a signing secret.');
}
const values={STRIPE_SECRET_KEY:stripeKey,FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify(account),STRIPE_WEBHOOK_ENDPOINT_ID:endpoint.id};
if(webhookSecret)values.STRIPE_WEBHOOK_SECRET=webhookSecret;
installSecrets(values);
console.log('Stripe and Firebase credentials installed as encrypted Cloudflare secrets.');
let health;
for(let i=0;i<12;i++){
 try{const response=await fetch(workerOrigin+'/health',{signal:AbortSignal.timeout(20000)});health=await response.json();if(response.ok&&health.configured&&health.firebaseReady)break}catch{}
 await new Promise(resolve=>setTimeout(resolve,1000));
}
if(!health?.configured||!health?.firebaseReady)throw Error('The Worker is deployed, but its live Firebase readiness check did not pass. Website routing was not changed.');
const configResponse=await fetch(workerOrigin+'/checkout/pay-config',{headers:{Origin:'https://pay.zpas.org'},signal:AbortSignal.timeout(15000)});const pricing=await configResponse.json();
if(!configResponse.ok||!pricing.available||pricing.billingModel!=='monthly-v1'||pricing.plans?.zpass_plus_yearly?.price!==4.25)throw Error('Live payment configuration did not match the expected monthly terms.');
const unsigned=await fetch(workerOrigin+'/stripe-webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});if(unsigned.status!==401)throw Error('Unsigned webhooks were not rejected.');
if(webhookSecret){
 const body=JSON.stringify({id:'evt_deploymentprobe',type:'deployment.probe',data:{object:{}}}),timestamp=Math.floor(Date.now()/1000),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(webhookSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+body))),v=>v.toString(16).padStart(2,'0')).join('');
 const response=await fetch(workerOrigin+'/stripe-webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':'t='+timestamp+',v1='+signature},body,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('The signed, non-payment deployment probe failed.');
}
const routing={url:workerOrigin,runtime:'cloudflare-worker',updatedAt:new Date().toISOString()};
fs.writeFileSync(path.join(projectRoot,'public/resources/data/pay-backend.json'),JSON.stringify(routing,null,2)+'\n');
fs.writeFileSync(path.join(projectRoot,'cloudflare/payment-worker/deployment.json'),JSON.stringify({workerOrigin,script:'passgram-pay-api',stripeWebhookId:endpoint.id,deployedAt:new Date().toISOString()},null,2)+'\n');
console.log('Live checks passed: Firebase access, monthly terms, unsigned webhook rejected'+(webhookSecret?', signed non-payment webhook accepted.':'; existing encrypted signing secret preserved.'));
console.log('Payment backend prepared at '+workerOrigin+'; no real payment or subscription was created.');
