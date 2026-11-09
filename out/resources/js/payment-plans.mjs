import {cachedConfig,refreshConfig} from './runtime-config.mjs?v=2';
// Prices per month. MONTHLY bills every month; YEARLY bills `charge` once a year (shown per month, monthly price struck through).
export const paymentPlans={
 PLUS:{name:'PassGram Plus',monthly:{price:3.99,charge:3.99,commitmentMonths:0},yearly:{price:2.99,listPrice:3.99,charge:35.88,commitmentMonths:12}},
 PRO:{name:'PassGram Pro',monthly:{price:6.99,charge:6.99,commitmentMonths:0},yearly:{price:5.99,listPrice:6.99,charge:71.88,commitmentMonths:12}}
};
export let runtimeConfig=cachedConfig();
function apply(value){if(!value)return;runtimeConfig=value;if(value.billingModel!=='v2-yearly-upfront')return;for(const tier of ['PLUS','PRO'])for(const period of ['monthly','yearly'])Object.assign(paymentPlans[tier][period],value.plans[tier+'_'+period.toUpperCase()]);}
apply(runtimeConfig);
if(typeof window!=='undefined')refreshConfig().then(value=>{apply(value);window.dispatchEvent(new Event('zpass-config-updated'));});
