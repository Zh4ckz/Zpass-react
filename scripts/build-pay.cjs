// Build a payment-only Firebase Hosting artifact from the shared checkout sources.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
 const root = path.resolve(__dirname, '..');
 const output = path.join(root, 'out-pay');
 // Write only the allowlisted payment files; unrelated website pages are never copied.
 const files = [
  ['public/subdomain/pay/index.html','index.html'],
  ['public/resources/css/pay-checkout.css','resources/css/pay-checkout.css'],
  ['public/resources/js/pay-checkout.mjs','resources/js/pay-checkout.mjs'],
  ['public/resources/data/pay-backend.json','resources/data/pay-backend.json'],
  ['public/resources/assets/app-logo/zpass.png','resources/assets/app-logo/zpass.png']
 ];
 for(const [source,destination] of files){const target=path.join(output,destination);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,source),target);}
 const { paymentPlans } = await import(pathToFileURL(path.join(root,'public/resources/js/payment-plans.mjs')).href);
 const plans = {};
 for(const tier of ['PLUS','PRO'])for(const interval of ['MONTHLY','YEARLY'])plans[tier+'_'+interval]={price:paymentPlans[tier][interval.toLowerCase()].price,enabled:true,commitmentMonths:interval==='YEARLY'?12:0};
 const serialized=JSON.stringify(plans,null,2)+'\n';
 for(const target of ['public/resources/data/checkout-plans.json','out/resources/data/checkout-plans.json','out-pay/resources/data/checkout-plans.json']){const filename=path.join(root,target);fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,serialized);}
 console.log('Payment-only Hosting build: out-pay (no Functions required).');
})().catch(error=>{console.error(error);process.exitCode=1;});
