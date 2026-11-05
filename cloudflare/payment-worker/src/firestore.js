const utf8=new TextEncoder();
const bytes64=bytes=>btoa(String.fromCharCode(...bytes));
const base64url=bytes=>bytes64(bytes).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encode=value=>base64url(utf8.encode(JSON.stringify(value)));
let tokenCache;
export async function accessToken(env,fetcher=(...args)=>globalThis.fetch(...args)){
 if(tokenCache?.source===env.FIREBASE_SERVICE_ACCOUNT_JSON&&tokenCache.expires>Date.now()+60000)return tokenCache.token;
 const account=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON||'{}');
 if(account.project_id!=='passgram-org'||!account.client_email||!account.private_key)throw Error('Firebase credentials unavailable');
 const pem=account.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
 const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const now=Math.floor(Date.now()/1000),unsigned=encode({alg:'RS256',typ:'JWT',kid:account.private_key_id})+'.'+encode({iss:account.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,utf8.encode(unsigned));
 const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+base64url(new Uint8Array(signature))}),signal:AbortSignal.timeout(10000)});
 const result=await response.json();if(!response.ok||!result.access_token){const error=Error('Firebase authentication unavailable');error.stage='oauth';error.status=response.status;error.reason=['invalid_grant','invalid_scope','unauthorized_client','invalid_client'].includes(result.error)?result.error:'oauth_error';throw error;}
 tokenCache={source:env.FIREBASE_SERVICE_ACCOUNT_JSON,token:result.access_token,expires:Date.now()+(result.expires_in||3600)*1000};return result.access_token;
}
export function decodeValue(v){if('nullValue'in v)return null;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return v.doubleValue;if('booleanValue'in v)return v.booleanValue;if('timestampValue'in v)return new Date(v.timestampValue);if('arrayValue'in v)return(v.arrayValue.values||[]).map(decodeValue);if('mapValue'in v)return decodeFields(v.mapValue.fields||{});return undefined}
export function decodeFields(fields){return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,decodeValue(v)]))}
export function encodeValue(v){if(v===null)return{nullValue:null};if(v instanceof Date)return{timestampValue:v.toISOString()};if(typeof v==='string')return{stringValue:v};if(typeof v==='boolean')return{booleanValue:v};if(typeof v==='number'){if(!Number.isFinite(v))throw Error('Invalid number');return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}}if(Array.isArray(v))return{arrayValue:{values:v.map(encodeValue)}};if(typeof v==='object')return{mapValue:{fields:encodeFields(v)}};throw Error('Invalid Firestore value')}
export function encodeFields(v){return Object.fromEntries(Object.entries(v).filter(([,value])=>value!==undefined).map(([k,value])=>[k,encodeValue(value)]))}
export class Firestore {
 constructor(env,{fetcher=(...args)=>globalThis.fetch(...args),token=()=>accessToken(env,fetcher)}={}){this.env=env;this.fetcher=(...args)=>fetcher(...args);this.token=token;this.database='projects/passgram-org/databases/(default)';this.base='https://firestore.googleapis.com/v1/'+this.database+'/documents'}
 async request(method,url,body){const response=await this.fetcher(url,{method,headers:{Authorization:'Bearer '+await this.token(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(response.status===404)return null;const value=await response.json();if(!response.ok){const e=Error('Database request failed');e.stage='firestore';e.status=response.status;e.retryable=response.status===409||value.error?.status==='ABORTED';throw e}return value}
 name(path){if(!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(path))throw Error('Invalid document path');return this.database+'/documents/'+path}
 async get(path,transaction){this.name(path);const doc=await this.request('GET',this.base+'/'+path+(transaction?'?transaction='+encodeURIComponent(transaction):''));return doc?{...decodeFields(doc.fields||{}),__updateTime:doc.updateTime}:null}
 async findRecipient(zid){for(const collection of ['subscriptions','users']){const result=await this.request('POST',this.base+':runQuery',{structuredQuery:{from:[{collectionId:collection}],where:{fieldFilter:{field:{fieldPath:'zPassId'},op:'EQUAL',value:{stringValue:zid}}},limit:1}});const doc=result?.find(v=>v.document)?.document;if(doc){const uid=doc.name.split('/').at(-1);const response=await this.request('POST','https://identitytoolkit.googleapis.com/v1/projects/passgram-org/accounts:lookup',{localId:[uid]});const user=response?.users?.find(v=>v.localId===uid);return user&&!user.disabled?{uid}:null}}return null}
 async transaction(fn){
  for(let attempt=0;attempt<4;attempt++){
   const begin=await this.request('POST',this.base+':beginTransaction',{options:{readWrite:{}}});
   const transaction=begin.transaction,writes=[];let writing=false;
   const tx={
    get:async path=>{if(writing)throw Error('Read after transaction write');return this.get(path,transaction)},
    set:(path,data,{create=false}={})=>{
     writing=true;
     writes.push({update:{name:this.name(path),fields:encodeFields(data)},...(create?{currentDocument:{exists:false}}:{updateMask:{fieldPaths:Object.keys(data).filter(k=>data[k]!==undefined)}})});
    }
   };
   try{const result=await fn(tx);await this.request('POST',this.base+':commit',{transaction,writes});return result}
   catch(e){try{await this.request('POST',this.base+':rollback',{transaction})}catch{}if(e.retryable&&attempt<3)continue;throw e}
  }
  throw Error('Database transaction unavailable');
 }
 async patch(path,data){return this.transaction(async tx=>{const current=await tx.get(path);if(!current)throw Error('Missing document');tx.set(path,data)})}
}

