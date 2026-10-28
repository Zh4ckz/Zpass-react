const fs=require('fs'),assert=require('assert');
const source=fs.readFileSync('Zh4ckz/functions/index.js','utf8');
const start=source.indexOf('    await tomsssDb.runTransaction(async (tx) => {',source.indexOf('exports.manageZPassFamily'));
const end=source.indexOf('\n    });',start);
const body=source.slice(start,end+8);
async function scenario(count,memberOwner=false){
 let writes=0;
 const ownerUid='owner',targetUid='new',targetZPassId='ZP-FIXTURE',action='ADD';
 const owner={status:'ACTIVE',plan:'FAMILY',expiresAt:{toMillis:()=>Date.now()+100000},...(memberOwner?{familyOwnerUid:'other'}:{})};
 const ownerRef={kind:'owner'},targetRef={kind:'target'},membersRef={doc:()=>({})};
 const tx={get:async r=>r===membersRef?{size:count,docs:Array.from({length:count},(_,i)=>({id:'m'+i}))}:{data:()=>r===ownerRef?owner:{}},set:()=>writes++,update:()=>writes++,delete:()=>writes++};
 const tomsssDb={collection:()=>({doc:id=>id===ownerUid?ownerRef:targetRef}),runTransaction:fn=>fn(tx)};
 const admin={firestore:{FieldValue:{serverTimestamp:()=>0,delete:()=>0}}};
 const fn=new Function('tomsssDb','ownerUid','targetUid','targetZPassId','action','membersRef','admin','return (async()=>{'+body+'})()');
 try{await fn(tomsssDb,ownerUid,targetUid,targetZPassId,action,membersRef,admin);return{writes};}catch(e){return{writes,error:e.message};}
}
(async()=>{assert((await scenario(3)).writes===3);assert((await scenario(4)).writes===0);assert((await scenario(4)).error.includes('5 people'));assert((await scenario(0,true)).writes===0);console.log('PASS: fourth invite allowed; fifth invite rejected; family members cannot act as paying owner');})();
