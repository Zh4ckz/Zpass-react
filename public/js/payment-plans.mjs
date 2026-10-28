import {cachedConfig,refreshConfig} from './runtime-config.mjs';
export const paymentPlans={
  PLUS:{name:'Z Pass Plus',monthly:{price:4.99},yearly:{price:49.9}},
  PRO:{name:'Z Pass Pro',monthly:{price:9},yearly:{price:90}}
};
export let runtimeConfig=cachedConfig();
function apply(value){if(!value)return;runtimeConfig=value;for(const tier of ['PLUS','PRO'])for(const period of ['monthly','yearly'])Object.assign(paymentPlans[tier][period],value.plans[tier+'_'+period.toUpperCase()]);}
apply(runtimeConfig);
if(typeof window!=='undefined')refreshConfig().then(value=>{apply(value);window.dispatchEvent(new Event('zpass-config-updated'));});
