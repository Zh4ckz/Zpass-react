const fs=require('fs'),assert=require('assert');
(async()=>{
 const source=fs.readFileSync('public/js/firebase-config.mjs','utf8');
 for(const [host,project] of [['zpass.web.app','zpasss'],['zpass.firebaseapp.com','zpasss'],['zpas.org','zpasss'],['web.zpas.org','zpasss'],['localhost','zpasss'],['127.0.0.1','zpasss']]){
  globalThis.location={hostname:host};
  const config=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+host);
  assert.equal(config.firebaseConfig.projectId,project);assert.equal(config.firebaseConfig.authDomain,project+'.firebaseapp.com');
  assert.throws(()=>config.firebaseConfigForHostname('zpass.web.app.evil.example'),/no configured/);
  console.log('PASS:',host,'->',project);
 }
 for(const name of ['js/admin.js','js/app-verify.js','checkout.html','subscription.html']){
  const content=fs.readFileSync('public/'+name,'utf8');assert.match(content,/import \{firebaseConfig\} from/);assert.ok(!/const firebaseConfig\s*=\s*\{/.test(content));
 }
 console.log('PASS: dashboard, login, admin, verification, checkout and subscription share hostname configuration');
})().catch(e=>{console.error(e);process.exitCode=1});
