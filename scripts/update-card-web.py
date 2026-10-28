from pathlib import Path
p=Path('Zpass/public/js/app.js');s=p.read_text(encoding='utf-8');s=s.replace('    list.append(article);\n  }\n  $("cardsLocked")', '''    article.tabIndex = 0; article.setAttribute('role','button'); article.setAttribute('aria-label','Verify identity to view card');
    article.addEventListener('click',()=>viewProtectedCard(card));
    article.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();viewProtectedCard(card);}});
    list.append(article);
  }
  $("cardsLocked")''');s=s.replace('Bulut yedeğinde kart bulunamadı. APK’de Back up now düğmesine basın.','No cards yet. Cards saved on your connected devices sync automatically.');s+='''
let cardVerificationBusy=false;
async function viewProtectedCard(card) {
  if(cardVerificationBusy || !activeRecoveryKey || !auth.currentUser)return;
  cardVerificationBusy=true;
  const key=activeRecoveryKey,uid=auth.currentUser.uid;
  const dialog=document.createElement('dialog');dialog.className='desktop-dialog';
  const heading=document.createElement('h2');heading.textContent='Approve on your phone';
  const codeElement=document.createElement('p');codeElement.style.cssText='font-size:64px;text-align:center;color:#58a6ff';
  const message=document.createElement('p');message.textContent='Select this number in Z Pass on your phone and confirm with your device PIN. Expires in 60 seconds.';
  const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
  dialog.append(heading,codeElement,message,cancel);document.body.append(dialog);dialog.showModal();
  let reference,unsubscribe,timer;
  try {
    const codes=distinctCodes(3);codeElement.textContent=codes[0];
    reference=await addDoc(collection(db,'loginRequests'),{uid,purpose:'CARD_VIEW',cardId:card.id,deviceLabel:`Browser · ${navigator.platform || 'Web'}`,locationLabel:'Browser location unavailable',accountEmail:auth.currentUser.email || '',displayCode:codes[0],candidateCodes:codes.join(','),status:'pending',createdAt:serverTimestamp()});
    const approved=await new Promise(resolve=>{
      let settled=false;const finish=value=>{if(settled)return;settled=true;resolve(value);};
      dialog.addEventListener('close',()=>finish(false),{once:true});
      timer=setTimeout(()=>finish(false),60000);
      unsubscribe=onSnapshot(reference,snapshot=>{const data=snapshot.data();if(data?.status==='approved')finish(true);else if(!data || data.status==='denied')finish(false);},()=>finish(false));
      if(!dialog.open)finish(false);
    });
    dialog.close();
    if(!approved || activeRecoveryKey!==key || auth.currentUser?.uid!==uid)return;
    const details=document.createElement('dialog');details.className='desktop-dialog';
    const title=document.createElement('h2');title.textContent=card.bank || 'Payment card';details.append(title);
    for(const [label,value] of [['Cardholder',card.holder],['Number',card.number],['Expiry',card.expiry],['CVV',card.cvv],['CVV2',card.cvv2]]) {
      const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.readOnly=true;input.value=value || '';input.dataset.private='';row.append(input);details.append(row);
    }
    const close=document.createElement('button');close.textContent='Close';close.onclick=()=>details.close();details.append(close);document.body.append(details);details.showModal();
    const expiry=setTimeout(()=>details.close(),60000);
    const locked=setInterval(()=>{if(activeRecoveryKey!==key || auth.currentUser?.uid!==uid)details.close();},500);
    details.addEventListener('close',()=>{clearTimeout(expiry);clearInterval(locked);details.querySelectorAll('input').forEach(input=>input.value='');details.remove();},{once:true});
  } catch { showError(Error('Could not verify card access. Check your connection and try again.')); }
  finally {clearTimeout(timer);unsubscribe?.();if(reference)deleteDoc(reference).catch(()=>{});dialog.remove();cardVerificationBusy=false;}
}
''';p.write_text(s,encoding='utf-8')
