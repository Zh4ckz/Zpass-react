const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('C:/Users/rezan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../verification/backup-interop');
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;if(name==='/'){res.setHeader('Content-Type','text/html');return res.end('<script src="/js/argon2.umd.min.js"></script>');}const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async content=>{
  const {readZhc,writeZhc}=await import('/js/zhc-backup.mjs');
  const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));const encode=a=>{let s='';for(const b of a)s+=String.fromCharCode(b);return btoa(s);};
  const aes=async(raw)=>crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
  async function keys(password,s1,s2){const hash=await hashwasm.argon2id({password,salt:decode(s1),iterations:3,parallelism:4,memorySize:65536,hashLength:32,outputType:'binary'});const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return[await aes(hash),await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:decode(s2),iterations:600000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])];}
  async function enc(value,key){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value)));const all=new Uint8Array(12+bytes.length);all.set(iv);all.set(bytes,12);return encode(all);}
  async function dec(value,key){const all=decode(value);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},key,all.slice(12)));}
  const adapter={decrypt:async(value,password,s1,s2)=>{const[a,b]=await keys(password,s1,s2);return dec(await dec(value,b),a);},encrypt:async(value,password)=>{const salt1=encode(crypto.getRandomValues(new Uint8Array(32))),salt2=encode(crypto.getRandomValues(new Uint8Array(32)));const[a,b]=await keys(password,salt1,salt2);return{salt1,salt2,cipher:await enc(await enc(value,a),b)};}};
  const password='Fixture-Şîfre-2026';const data=await readZhc(content,password,adapter);
  if(data.entries[0].password!=='fixture-account-password'||!data.entries[0].archived||data.cards[0].number!=='4111111111111111'||data.authenticators[0].secret!=='JBSWY3DPEHPK3PXP'||data.personalInfo.addressLine1!=='Fixture address')throw Error('Desktop/browser mismatch');
  let wrong=false;try{await readZhc(content,'wrong-fixture-password',adapter);}catch{wrong=true;}if(!wrong)throw Error('Wrong password accepted');
  const lines=content.split('\n');lines[4]=(lines[4][0]==='A'?'B':'A')+lines[4].slice(1);let tamper=false;try{await readZhc(lines.join('\n'),password,adapter);}catch{tamper=true;}if(!tamper)throw Error('Tampering accepted');
  let old=false;try{await readZhc('ZPASS.ZHC\n2\nfixture',null,adapter);}catch(e){old=e.message.includes('Android key');}if(!old)throw Error('Legacy key requirement hidden');
  return writeZhc(data,password,adapter);
 },fs.readFileSync(process.argv[2] || path.join(out,'desktop.zhc'),'utf8'));
 fs.writeFileSync(process.argv[3] || path.join(out,'browser.zhc'),result);assert(!result.includes('fixture-account-password'));
 console.log('PASS: real browser decrypted portable v4; all four types, Unicode, archive, wrong password, tampering and legacy-key warning; browser v4 exported');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e.message);server.close();process.exitCode=1;});
