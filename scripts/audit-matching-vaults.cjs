const fs=require('fs');const auth=require('C:/Users/rezan/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{const a=auth.getGlobalDefaultAccount();const token=await auth.getAccessToken(a.tokens.refresh_token,[]);const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
for(const project of ['tomsss','zpasss']){
 const base='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents';
 const response=await fetch(base+':runQuery',{method:'POST',headers,body:JSON.stringify({structuredQuery:{from:[{collectionId:'users'}],where:{fieldFilter:{field:{fieldPath:'email'},op:'EQUAL',value:{stringValue:'rezanhassoun@gmail.com'}}}}})});const rows=await response.json();if(!response.ok){console.log(project,'query failed',response.status);continue;}
 for(const row of rows){if(!row.document)continue;const profile=row.document;const uid=profile.name.split('/').pop();console.log(project,'UID',uid,'profile backup count',profile.fields?.backupItemCount?.integerValue);
  const path=base+'/vaults/'+uid;const names=await(await fetch(path+':listCollectionIds',{method:'POST',headers,body:'{"pageSize":100}'})).json();const backup={profile,vault:await(await fetch(path,{headers})).json(),collections:{}};
  for(const name of names.collectionIds||[]){let docs=[],page;do{const url=path+'/'+name+'?pageSize=300'+(page?'&pageToken='+encodeURIComponent(page):'');const r=await(await fetch(url,{headers})).json();docs.push(...(r.documents||[]));page=r.nextPageToken;}while(page);console.log(' ',name,docs.length);backup.collections[name]=docs;}
  fs.mkdirSync('Zpass/verification/recovery-audit',{recursive:true});fs.writeFileSync('Zpass/verification/recovery-audit/'+project+'-'+uid+'.json',JSON.stringify(backup));
 }
}
})().catch(e=>{console.error(e.message);process.exitCode=1});
