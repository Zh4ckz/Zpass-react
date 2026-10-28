const key='zpassRuntimeConfigV1';
export function validateConfig(value){
  if(value?.schemaVersion!==1 || value.currency!=='USD')throw Error('Unsupported configuration');
  const plans={};
  for(const id of ['PLUS_MONTHLY','PLUS_YEARLY','PRO_MONTHLY','PRO_YEARLY']){
    const plan=value.plans?.[id];
    if(!plan || typeof plan.price!=='number' || !Number.isFinite(plan.price) || plan.price<0 || plan.price>100000)throw Error('Invalid plan');
    plans[id]={price:plan.price,enabled:plan.enabled!==false};
  }
  const providers={};for(const id of ['stripe','crypto'])providers[id]={enabled:value.providers?.[id]?.enabled!==false};
  const pages=(Array.isArray(value.pages)?value.pages:[]).slice(0,8).filter(page=>{
    try{const url=new URL(page.url);return page.enabled!==false && typeof page.title==='string' && page.title.length<=80 && url.protocol==='https:' && ['zpas.org','www.zpas.org','web.zpas.org','zpass.web.app'].includes(url.hostname) && !url.username && !url.password && !url.port;}catch{return false;}
  }).map(({title,url})=>({title,url}));
  return {schemaVersion:1,currency:'USD',plans,providers,pages};
}
export function cachedConfig(){try{return validateConfig(JSON.parse(localStorage.getItem(key)).value);}catch{return null;}}
let pending;
export function refreshConfig(){
  if(pending)return pending;
  pending=(async()=>{
    try{
      const cached=JSON.parse(localStorage.getItem(key)||'null');
      if(cached && Date.now()-cached.fetchedAt<900000)return validateConfig(cached.value);
      const response=await fetch('/api/payment-config.json',{signal:AbortSignal.timeout(4000)});
      if(!response.ok || Number(response.headers.get('content-length'))>65536)throw Error('Config unavailable');
      const raw=await response.text();if(raw.length>65536)throw Error('Config too large');
      const value=validateConfig(JSON.parse(raw));
      try{localStorage.setItem(key,JSON.stringify({value,fetchedAt:Date.now()}));}catch{}
      return value;
    }catch{return cachedConfig();}
  })().finally(()=>{pending=null;});
  return pending;
}
