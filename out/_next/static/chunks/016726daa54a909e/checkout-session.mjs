import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {firebaseConfig} from './firebase-config.mjs';
const params=new URLSearchParams(location.search);
const checkoutRequested=params.get('checkout')==='1';
let status=document.getElementById('checkout-status');
if(checkoutRequested&&!status){status=document.createElement('p');status.id='checkout-status';status.setAttribute('role','status');status.style.cssText='position:fixed;bottom:20px;left:20px;right:20px;z-index:99999;padding:16px;background:#fff;color:#19263e;border:1px solid #dce5f1;border-radius:12px';document.body.append(status);}
const plan=['PLUS','PRO'].includes(params.get('plan'))?params.get('plan'):'PLUS',billing=['MONTHLY','YEARLY'].includes(params.get('billing'))?params.get('billing'):'MONTHLY';
if(checkoutRequested)onAuthStateChanged(getAuth(getApps()[0]||initializeApp(firebaseConfig)),async user=>{
 if(!user){status.textContent='Sign in to continue. This page will continue automatically.';return;}
 status.textContent='Creating your 15-minute checkout session...';
 try{
 const config=await (await fetch('/_next/static/chunks/2d28d024b0e256f3/pay-backend.json',{cache:'no-store'})).json(),backend=new URL(config.url);
 if(backend.protocol!=='https:'||!(backend.hostname==='api.zpas.org'||/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(backend.hostname)||/^[a-z0-9-]+\.trycloudflare\.com$/.test(backend.hostname)))throw Error('Payment service unavailable.');
 const response=await fetch(backend.origin+'/checkout/pay-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:await user.getIdToken()}),signal:AbortSignal.timeout(20000)}),result=await response.json();
 if(!response.ok)throw Error(result.error||'Checkout unavailable.');
 window.top.location.replace('https://pay.zpas.org/?'+new URLSearchParams({plan,billing,key:result.key}));
 }catch(error){status.textContent=error.message;}
});
