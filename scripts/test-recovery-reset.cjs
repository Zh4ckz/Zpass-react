const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('Zpass/public/js/app-verify.js','utf8');
const start=source.indexOf('async function resetPortableVault('),end=source.indexOf('async function completeRecoverySignIn',start);
let writes=0;const context={setDoc:()=>{writes++},deleteDoc:()=>{writes++}};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{await assert.rejects(context.resetPortableVault('fixture-user','fixture-password'),/preserved/);assert.equal(writes,0);console.log('PASS: forgotten-password flow performs zero writes or deletes');})().catch(e=>{console.error(e);process.exitCode=1});
