import "./web-ads.mjs";
import {assessPassword,generatePassword} from './password-tools.mjs';
import {queueCheckout} from './navigation.mjs';
import {paymentPlans} from './payment-plans.mjs';
const $=id=>document.getElementById(id);
let strings={},period='YEARLY',selected='PLUS',languageRequest=0,toastTimer;
const t=key=>strings[key] || key;
const prices=Object.fromEntries(Object.entries(paymentPlans).map(([key,value])=>[key,{MONTHLY:value.monthly.price,YEARLY:value.yearly.price}]));
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
async function translate(){
  const request=++languageRequest;
  const response=await fetch(`/resources/assets/lang/marketing/${window.ZPassI18n.getLanguage()}.json`);
  if(!response.ok)return;
  const next=await response.json();if(request!==languageRequest)return;strings=next;
  document.querySelectorAll('[data-m]').forEach(element=>element.textContent=t(element.dataset.m));
  renderPricing();check();
}
function renderPricing(){
  document.querySelectorAll('[data-billing]').forEach(button=>{button.classList.toggle('active',button.dataset.billing===period);button.setAttribute('aria-pressed',String(button.dataset.billing===period));});
  const annualBadge=$('yearlyUpfrontBadge');if(annualBadge)annualBadge.textContent=period==='YEARLY'?'Billed upfront':'Monthly billing';
  document.querySelectorAll('[data-plan]').forEach(card=>{card.classList.toggle('selected',card.dataset.plan===selected);card.setAttribute('aria-pressed',String(card.dataset.plan===selected));});
  document.querySelectorAll('[data-price]').forEach(node=>{
    node.replaceChildren(document.createTextNode(money(period==='YEARLY'?prices[node.dataset.price][period]/12:prices[node.dataset.price][period])));
    const small=document.createElement('small');small.textContent=' / '+t('monthUnit');node.append(small);
  });
  document.querySelector('[data-price-unit]').textContent=' / '+t('monthUnit');
  document.querySelectorAll('[data-total]').forEach(node=>node.textContent=money(prices[node.dataset.total][period])+' · '+t(period==='YEARLY'?'annualBill':'monthlyBill'));
  $('selectedPlanName').textContent=selected==='FREE'?t('freePlan'):selected==='PLUS'?'Z Pass Plus':'Z Pass Pro';
  $('selectedPlanTotal').textContent=selected==='FREE'?t('forever'):money(prices[selected][period])+' · '+t(period==='YEARLY'?'annualBill':'monthlyBill');
  $('subscribe').querySelector('span').textContent=t(selected==='FREE'?'startFree':'subscribe');
}
function choose(plan){selected=plan;renderPricing();}
function go(plan){
  if(plan==='FREE'){sessionStorage.removeItem('zpassAfterLogin');sessionStorage.removeItem('zpassCheckoutCreated');}
  else queueCheckout(plan,period);
  location.hash='login';
}
document.querySelectorAll('[data-plan]').forEach(card=>{
  card.addEventListener('click',event=>{choose(card.dataset.plan);if(event.target.closest('.plan-choose'))go(card.dataset.plan);});
  card.addEventListener('keydown',event=>{if(event.target===card && ['Enter',' '].includes(event.key)){event.preventDefault();choose(card.dataset.plan);}});
});
document.querySelectorAll('[data-billing]').forEach(button=>button.addEventListener('click',()=>{period=button.dataset.billing;renderPricing();}));
document.querySelectorAll('[data-audience]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-audience]').forEach(node=>{node.classList.toggle('active',node===button);node.setAttribute('aria-pressed',String(node===button));});
  choose(button.dataset.audience==='family'?'PRO':'PLUS');
}));
$('subscribe').addEventListener('click',()=>go(selected));
function check(){
  const result=assessPassword($('checkPassword').value,$('personalHint').value);
  const keys=['enterPassword','weak','fair','good','strong'];
  $('strengthFill').style.width=(result.level*25)+'%';$('strengthFill').style.background=['','#ee7d96','#d6a268','#ada2ec','#84d0b0'][result.level];
  $('strengthLabel').textContent=t(keys[result.level]);
  $('strengthHint').textContent=t(result.level===1?'hintWarning':'unique');
}
function generate(){
  $('generatedPassword').value=generatePassword($('passwordLength').value,$('generatorMode').value,$('personalHint').value);
}
$('checkPassword').addEventListener('input',check);$('personalHint').addEventListener('input',check);
$('toggleCheck').addEventListener('click',()=>{
  const shown=$('checkPassword').type==='password';$('checkPassword').type=shown?'text':'password';$('toggleCheck').textContent=t(shown?'hide':'show');
});
$('passwordLength').addEventListener('input',()=>{$('lengthValue').textContent=$('passwordLength').value;generate();});
$('generatorMode').addEventListener('change',()=>{
  const phrase=$('generatorMode').value==='phrase';$('passwordLength').disabled=phrase;
  generate();
});
$('generatePassword').addEventListener('click',generate);
$('copyPassword').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('generatedPassword').value);$('toolToast').textContent=t('copied');}
  catch{$('generatedPassword').select();$('toolToast').textContent=t('copyManual');}
  $('toolToast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toolToast').hidden=true,2500);
});
const cookieChoice=localStorage.getItem('zpassCookieChoice');$('cookieBanner').hidden=Boolean(cookieChoice);
for(const [id,choice] of [['cookieAccept','accepted'],['cookieEssential','essential']])$(id).addEventListener('click',()=>{localStorage.setItem('zpassCookieChoice',choice);$('cookieBanner').hidden=true;});

window.addEventListener('pagehide',()=>{$('checkPassword').value='';$('personalHint').value='';$('generatedPassword').value='';});
window.addEventListener('zpass:languagechange',translate);
await window.ZPassI18n.ready;await translate();generate();
