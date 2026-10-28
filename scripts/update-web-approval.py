from pathlib import Path
p=Path('Zpass/public/js/app.js');s=p.read_text(encoding='utf-8');s=s.replace('let approvalTimer = null;','let approvalTimer = null;\nlet approvalCountdown = null;\nlet approvalRequestRef = null;\nlet approvalGeneration = 0;')
a=s.index('function stopApprovalListener() {');b=s.index('$("loginApprovalUseRecovery")',a)
s=s[:a]+'''function approvalText(value,...args){return (window.ZPassI18n?.get(value) || value).replace(/\\{(\\d+)\\}/g,(_,index)=>String(args[Number(index)] ?? ''));}
function stopApprovalListener() {
  ++approvalGeneration;
  approvalUnsubscribe?.();approvalUnsubscribe=null;
  clearTimeout(approvalTimer);approvalTimer=null;
  clearInterval(approvalCountdown);approvalCountdown=null;
  if(approvalRequestRef){deleteDoc(approvalRequestRef).catch(()=>{});approvalRequestRef=null;}
}
async function startApprovalRequest(user) {
  stopApprovalListener();const generation=approvalGeneration;
  $('loginApprovalMessage').textContent='';$('loginApprovalCode').textContent='--';
  $('loginApprovalRetry').hidden=true;
  if(!$('loginApprovalDialog').open)$('loginApprovalDialog').showModal();
  const wrapKeyBytes=crypto.getRandomValues(new Uint8Array(32));
  const wrapKey=await crypto.subtle.importKey('raw',wrapKeyBytes,'AES-GCM',false,['decrypt']);
  const codes=distinctCodes(3),displayCode=codes[0];
  let requestRef;
  try {
    requestRef=await addDoc(collection(db,'loginRequests'),{uid:user.uid,purpose:'LOGIN',deviceLabel:`Browser · ${navigator.platform || 'Web'}`,accountEmail:user.email || '',locationLabel:'',locationKind:'unavailable',displayCode,candidateCodes:codes.join(','),wrapKey:bytesToBase64(wrapKeyBytes),status:'pending',createdAt:serverTimestamp()});
  }catch{
    if(generation===approvalGeneration){$('loginApprovalMessage').textContent=approvalText('Could not complete this request. Check your connection and try again.');$('loginApprovalRetry').hidden=false;}
    return;
  }
  if(generation!==approvalGeneration || !$('loginApprovalDialog').open){deleteDoc(requestRef).catch(()=>{});return;}
  approvalRequestRef=requestRef;
  let deadline=Date.now()+60000;
  $('loginApprovalCode').textContent=displayCode;
  const fail=message=>{stopApprovalListener();$('loginApprovalCode').textContent='--';$('loginApprovalMessage').textContent=approvalText(message);$('loginApprovalRetry').hidden=false;};
  const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(!remaining){fail('This request expired. Request a new code on your computer.');return;}$('loginApprovalMessage').textContent=approvalText('Expires in {0}s',remaining);};
  tick();approvalCountdown=setInterval(tick,250);approvalTimer=setTimeout(()=>fail('This request expired. Request a new code on your computer.'),60000);
  approvalUnsubscribe=onSnapshot(requestRef,async snapshot=>{
    if(generation!==approvalGeneration)return;
    const data=snapshot.data();
    const created=data?.createdAt?.toMillis?.();if(Number.isFinite(created))deadline=Math.min(deadline,created+60000);
    if(Date.now()>=deadline){fail('This request expired. Request a new code on your computer.');return;}
    if(!data){fail('This request expired. Request a new code on your computer.');return;}
    if(data.status==='pending')return;
    stopApprovalListener();const completedGeneration=approvalGeneration;
    if(data.status==='approved'){
      try {
        const secret=await decryptCloud(data.approvedSecretEnc,wrapKey);
        if(completedGeneration!==approvalGeneration || !$('loginApprovalDialog').open || auth.currentUser?.uid!==user.uid)return;
        $('loginApprovalDialog').close();$('loginApprovalCode').textContent='--';
        await unlockCloudVault(secret);
      }catch{$('loginApprovalMessage').textContent=approvalText('Could not complete this request. Check your connection and try again.');$('loginApprovalRetry').hidden=false;$('loginApprovalCode').textContent='--';}
    }else{$('loginApprovalMessage').textContent=approvalText('Sign-in was denied on your phone.');$('loginApprovalCode').textContent='--';$('loginApprovalRetry').hidden=false;}
  },()=>fail('Approval requests are unavailable.'));
}
$('loginApprovalRetry')?.addEventListener('click',()=>{if(auth.currentUser)startApprovalRequest(auth.currentUser);});
$('loginApprovalDialog')?.addEventListener('cancel',()=>stopApprovalListener());
'''+s[b:]
s=s.replace("const message=document.createElement('p');message.textContent='Select this number in Z Pass on your phone and confirm with your device PIN. Expires in 60 seconds.';","const message=document.createElement('p');message.textContent=approvalText('Confirm this code in Z Pass on your phone.');")
s=s.replace("locationLabel:'Browser location unavailable',accountEmail:","locationLabel:'',locationKind:'unavailable',accountEmail:")
s=s.replace("  let reference,unsubscribe,timer;\n  try {", "  let reference,unsubscribe,timer,countdown;\n  try {")
s=s.replace("      timer=setTimeout(()=>finish(false),60000);", "      const deadline=Date.now()+60000;\n      const tick=()=>{message.textContent=approvalText('Expires in {0}s',Math.max(0,Math.ceil((deadline-Date.now())/1000)));};tick();countdown=setInterval(tick,250);\n      timer=setTimeout(()=>{codeElement.textContent='--';finish(false);},60000);")
s=s.replace('finally {clearTimeout(timer);unsubscribe?.();if(reference)', 'finally {clearInterval(countdown);clearTimeout(timer);unsubscribe?.();if(reference)')
p.write_text(s,encoding='utf-8')
p=Path('Zpass/public/dashboard.html');s=p.read_text(encoding='utf-8');s=s.replace('Open Z Pass on your phone. When it shows this number, tap it to approve this sign-in.','Confirm this code in Z Pass on your phone.');s=s.replace('<button id="loginApprovalUseRecovery" type="button">','<button id="loginApprovalUseRecovery" type="button" hidden style="display:none">');s=s.replace('<button id="loginApprovalCancel"','<button id="loginApprovalRetry" type="button" hidden>Request a new code</button><button id="loginApprovalCancel"');p.write_text(s,encoding='utf-8')
