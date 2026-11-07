import {cachedConfig,refreshConfig} from './runtime-config.mjs?v=2';
// YEARLY means a 12-month commitment, charged monthly. All prices are per month.
export const paymentPlans={
 PLUS:{name:'PassGram Plus',monthly:{price:4.99,commitmentMonths:0},yearly:{price:4.25,commitmentMonths:12}},
 PRO:{name:'PassGram Pro',monthly:{price:9,commitmentMonths:0},yearly:{price:7.5,commitmentMonths:12}}
};
export let runtimeConfig=cachedConfig();
function apply(value){if(!value)return;runtimeConfig=value;if(value.billingModel!=='monthly-v1')return;for(const tier of ['PLUS','PRO'])for(const period of ['monthly','yearly'])Object.assign(paymentPlans[tier][period],value.plans[tier+'_'+period.toUpperCase()]);}
apply(runtimeConfig);
if(typeof window!=='undefined')refreshConfig().then(value=>{apply(value);window.dispatchEvent(new Event('zpass-config-updated'));});
