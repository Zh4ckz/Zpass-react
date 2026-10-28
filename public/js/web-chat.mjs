import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, signOut, getAdditionalUserInfo, deleteUser } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, setDoc, addDoc, collection, query, where, orderBy, limitToLast, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
import { signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { firebaseConfig } from './firebase-config.mjs';

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const createWebQrLogin = httpsCallable(functions, 'createWebQrLogin');
const pollWebQrLogin = httpsCallable(functions, 'pollWebQrLogin');
const completeWebQrLogin = httpsCallable(functions, 'completeWebQrLogin');
const $ = id => document.getElementById(id);
const authView = $('auth-view'), setupView = $('setup-view'), chatApp = $('chat-app');
const enc = new TextEncoder(), dec = new TextDecoder();
let me = null, profile = null, currentPeer = null, currentChatId = null;
let chatsStop = null, messagesStop = null, peerStop = null, typingStop = null;
let searchTimer = null, typingTimer = null, pairStop = null, pairRef = null, pairExpiry = null, toastTimer = null, presenceTimer = null;
let qrPollTimer = null, qrCountdownTimer = null, qrLoginRequest = null, qrPolling = false, browserSessionStop = null;
let browserIdentity = null, messages = [];
const profileCache = new Map();

function randomSecret(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
function qrLoginStatus(message,error=false){const node=$('qr-login-status');node.textContent=message;node.style.color=error?'#bb4a54':'#27835f'}
function stopQrLogin(){clearInterval(qrPollTimer);clearInterval(qrCountdownTimer);qrPollTimer=null;qrCountdownTimer=null;qrLoginRequest=null;qrPolling=false}
function drawLoginQr(value){const qr=globalThis.qrcode(0,'M');qr.addData(value);qr.make();const canvas=$('web-login-qr'),ctx=canvas.getContext('2d'),count=qr.getModuleCount(),quiet=4,unit=canvas.width/(count+quiet*2);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#111827';for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.isDark(row,col))ctx.fillRect(Math.round((col+quiet)*unit),Math.round((row+quiet)*unit),Math.ceil(unit),Math.ceil(unit));$('qr-loading').hidden=true}
async function startWebQrLogin(){
  stopQrLogin();$('qr-login-retry').hidden=true;$('qr-loading').hidden=false;$('web-login-qr').getContext('2d').clearRect(0,0,256,256);$('qr-login-countdown').textContent='--:--';qrLoginStatus('Güvenli kod hazırlanıyor…');
  try{
    const qrSecret=randomSecret(),pollSecret=randomSecret();
    const created=await createWebQrLogin({qrSecret,pollSecret,deviceName:`Web tarayıcısı · ${navigator.platform||'Web'}`});
    const data=created.data,expiresAt=Number(data.expiresAt);
    if(!data.requestId||!Number.isFinite(expiresAt))throw Error('Sunucu geçerli bir QR isteği oluşturmadı.');
    qrLoginRequest={requestId:data.requestId,qrSecret,pollSecret,expiresAt};
    const payload=new URL('zpass://web-login');payload.searchParams.set('requestId',data.requestId);payload.searchParams.set('secret',qrSecret);
    drawLoginQr(payload.toString());qrLoginStatus('Z Pass uygulamasından tara; telefonda web girişini onayla.');
    const updateCountdown=()=>{const remain=Math.max(0,expiresAt-Date.now());$('qr-login-countdown').textContent=`${String(Math.floor(remain/60000)).padStart(2,'0')}:${String(Math.floor(remain%60000/1000)).padStart(2,'0')}`;if(remain<=0){stopQrLogin();$('qr-loading').hidden=true;$('qr-login-retry').hidden=false;qrLoginStatus('QR kodunun süresi doldu. Yeni bir kod oluştur.',true)}};
    updateCountdown();qrCountdownTimer=setInterval(updateCountdown,500);
    qrPollTimer=setInterval(async()=>{
      if(qrPolling||!qrLoginRequest)return;qrPolling=true;
      try{const result=await pollWebQrLogin({requestId:data.requestId,pollSecret}),state=result.data;
        if(state.status==='expired'||state.status==='cancelled'){stopQrLogin();$('qr-login-retry').hidden=false;qrLoginStatus('Bu QR isteği sona erdi. Yeni kod oluştur.',true);return}
        if(state.status==='approved'&&state.customToken){stopQrLogin();qrLoginStatus('Telefon onayladı. Güvenli oturum açılıyor…');await signInWithCustomToken(auth,state.customToken);await completeWebQrLogin({requestId:data.requestId,pollSecret});$('qr-login-dialog').close()}
      }catch(error){if(error?.code==='functions/unauthenticated'||error?.code==='functions/permission-denied'){stopQrLogin();$('qr-login-retry').hidden=false;qrLoginStatus('QR isteği doğrulanamadı. Yeni bir kod oluştur.',true)}else qrLoginStatus('Sunucuya bağlanılamıyor. Bağlantı yeniden denenecek.',true)}
      finally{qrPolling=false}
    },1800);
  }catch(error){stopQrLogin();$('qr-loading').hidden=true;$('qr-login-retry').hidden=false;qrLoginStatus(error?.message||'QR kod oluşturulamadı. Firebase Functions dağıtımını kontrol et.',true)}
}

async function registerBrowserSession(user){
  const key=`zpass-web-session:${user.uid}`;let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id)}
  const ref=doc(db,'users',user.uid,'devices',id),existing=await getDoc(ref);
  if(existing.get('revoked')===true){sessionStorage.removeItem(key);await signOut(auth);throw Error('Bu web oturumu telefondan sonlandırıldı. Yeniden QR ile giriş yap.')}
  const session={deviceId:id,ownerUid:user.uid,deviceName:`Web tarayıcısı · ${navigator.platform||'Web'}`,platform:'WEB',appVersion:'Z Pass Web',lastSeenAt:serverTimestamp(),acceptVoiceCalls:true,acceptVideoCalls:true,revoked:false};
  await setDoc(ref,session,{merge:true});
  browserSessionStop?.();browserSessionStop=onSnapshot(ref,snap=>{if(snap.get('revoked')===true){browserSessionStop?.();browserSessionStop=null;signOut(auth).catch(()=>{});sessionStorage.removeItem(key)}});
  setDoc(doc(db,'users',user.uid,'sessionDirectory',id),{deviceId:id,ownerUid:user.uid,deviceName:session.deviceName,platform:'WEB',appVersion:'Z Pass Web',lastSeenAt:serverTimestamp(),revoked:false},{merge:true}).catch(()=>{});
}

function toast(text) { const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600); }
function setStatus(id,text,error=true){$(id).textContent=text;$(id).style.color=error?'#bb4a54':'#27835f';}
function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function unb64(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
function cryptoKeyId(uid){return `zpass-chat-key:${uid}`}
function openKeyDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('zpass-chat-device',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveIdentity(uid,identity){const d=await openKeyDb();await new Promise((resolve,reject)=>{const t=d.transaction('keys','readwrite');t.objectStore('keys').put(identity,cryptoKeyId(uid));t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close()}
async function loadIdentity(uid){const d=await openKeyDb();const v=await new Promise((resolve,reject)=>{const r=d.transaction('keys').objectStore('keys').get(cryptoKeyId(uid));r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)});d.close();return v}
function sortedChatId(a,b){return [a,b].sort().join('_')}
function shortTime(ms){if(!ms)return '';const d=new Date(ms),now=new Date();return d.toDateString()===now.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'})}
function initial(p){return (p?.displayName||p?.firstName||p?.username||'Z').trim().slice(0,1).toUpperCase()}
function displayName(p){return p?.displayName||[p?.firstName,p?.lastName].filter(Boolean).join(' ')||`@${p?.username||'user'}`}

async function e2eKey(peerUid,chatId){
  if(!browserIdentity)throw Error('Şifreli sohbetleri açmak için bu tarayıcıyı telefonunla eşleştir.');
  let peerKey=profileCache.get(`pub:${peerUid}`);
  if(!peerKey){const snap=await getDoc(doc(db,'chat_profiles',peerUid));peerKey=snap.get('pubKey');if(!peerKey)throw Error('Bu kişi telefonunda Z Pass sohbetini henüz etkinleştirmemiş.');profileCache.set(`pub:${peerUid}`,peerKey)}
  const publicKey=await crypto.subtle.importKey('spki',unb64(peerKey),{name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:publicKey},browserIdentity.privateKey,256));
  const prefix=enc.encode('zpass-e2e-v1'),cid=enc.encode(chatId),material=new Uint8Array(prefix.length+cid.length+shared.length);
  material.set(prefix);material.set(cid,prefix.length);material.set(shared,prefix.length+cid.length);shared.fill(0);
  const raw=await crypto.subtle.digest('SHA-256',material);material.fill(0);
  return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function seal(peerUid,chatId,text){if(!text)return text;const key=await e2eKey(peerUid,chatId),iv=crypto.getRandomValues(new Uint8Array(12));const body=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(chatId),tagLength:128},key,enc.encode(text)));const payload=new Uint8Array(iv.length+body.length);payload.set(iv);payload.set(body,iv.length);return 'e2e1:'+b64(payload)}
async function unseal(peerUid,chatId,text){if(typeof text!=='string'||!text.startsWith('e2e1:'))return text||'';try{const key=await e2eKey(peerUid,chatId),payload=unb64(text.slice(5));return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:payload.slice(0,12),additionalData:enc.encode(chatId),tagLength:128},key,payload.slice(12)))}catch{return '🔒 Bu cihazda çözülemeyen şifreli mesaj.'}}

async function phonePair(){
  if(!me)return;
  if(pairStop)pairStop();if(pairRef)await deleteDoc(pairRef).catch(()=>{});clearTimeout(pairExpiry);
  $('pair-code').textContent='··';setStatus('pair-status','Tek kullanımlık şifreli istek hazırlanıyor…',false);$('pair-start').disabled=true;
  const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const requestPublicKey=b64(new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey)));
  const codes=new Set();while(codes.size<3)codes.add(String(crypto.getRandomValues(new Uint16Array(1))[0]%100).padStart(2,'0'));
  const [displayCode,...rest]=codes, candidateCodes=[displayCode,...rest].join(',');
  const ref=await addDoc(collection(db,'loginRequests'),{uid:me.uid,purpose:'CHAT_PAIR',deviceLabel:`Web browser · ${navigator.platform||'Web'}`,accountEmail:me.email||'',accountName:profile?.displayName||'',locationLabel:'',locationKind:'unavailable',displayCode,candidateCodes,status:'pending',createdAt:serverTimestamp(),expiresAt:new Date(Date.now()+60000),protocolVersion:2,requestPublicKey});
  pairRef=ref;$('pair-code').textContent=displayCode;setStatus('pair-status','Telefonunda Z Pass’i açıp aynı kodu onayla.',false);
  const started=Date.now();pairExpiry=setTimeout(()=>{pairStop?.();setStatus('pair-status','İsteğin süresi doldu. Yeni kod almak için tekrar başlat.');$('pair-start').disabled=false},60000);
  pairStop=onSnapshot(ref,async snap=>{
    const data=snap.data();if(!data)return;
    const created=data.createdAt?.toMillis?.();if(Date.now()>=Math.min(started+60000,(created||started)+60000)){clearTimeout(pairExpiry);setStatus('pair-status','İsteğin süresi doldu. Yeni kod almak için tekrar başlat.');$('pair-start').disabled=false;pairStop?.();return}
    if(data.status==='denied'){clearTimeout(pairExpiry);setStatus('pair-status','Telefonundan eşleştirme isteği reddedildi.');$('pair-start').disabled=false;pairStop?.();return}
    if(data.status!=='approved')return;
    pairStop?.();clearTimeout(pairExpiry);
    try{
      const responsePublicKey=await crypto.subtle.importKey('spki',unb64(data.responsePublicKey),{name:'ECDH',namedCurve:'P-256'},false,[]);
      const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:responsePublicKey},pair.privateKey,256));
      const context=enc.encode(`ZPass.LoginApproval.v2|${ref.id}|${me.uid}|${requestPublicKey}|${data.responsePublicKey}`),joined=new Uint8Array(shared.length+context.length);joined.set(shared);joined.set(context,shared.length);shared.fill(0);
      const wrapRaw=await crypto.subtle.digest('SHA-256',joined);joined.fill(0);const wrap=await crypto.subtle.importKey('raw',wrapRaw,'AES-GCM',false,['decrypt']);
      const payload=unb64(data.approvedSecretEnc);const json=dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:payload.slice(0,12),tagLength:128},wrap,payload.slice(12)));const approved=JSON.parse(json);
      const privateKey=await crypto.subtle.importKey('pkcs8',unb64(approved.chatPrivateKey),{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
      const publicKeyBytes=approved.chatPublicKey;if(!publicKeyBytes)throw Error('Telefon sohbet anahtarını göndermedi. Z Pass’i güncelleyip tekrar dene.');
      const publicKey=await crypto.subtle.importKey('spki',unb64(publicKeyBytes),{name:'ECDH',namedCurve:'P-256'},false,[]);
      await setDoc(doc(db,'chat_profiles',me.uid),{pubKey:publicKeyBytes},{merge:true});
      await saveIdentity(me.uid,{privateKey,publicKey});browserIdentity={privateKey,publicKey};
      if(approved.vaultSecret){sessionStorage.setItem('zpass-chat-pair-session',me.uid)}
      $('pair-dialog').close();toast('Tarayıcı eşleştirildi. Uçtan uca şifreleme hazır.');startLive();
    }catch(error){console.error('Secure browser pairing failed',error);setStatus('pair-status',error.message||'Güvenli eşleştirme başarısız. Tekrar dene.');$('pair-start').disabled=false}
  },error=>{setStatus('pair-status',error.message||'Eşleştirme isteğine ulaşılamıyor.');$('pair-start').disabled=false});
}

function authError(error){const map={'auth/invalid-credential':'E-posta/telefon veya şifre yanlış.','auth/email-already-in-use':'Bu e-posta zaten kullanılıyor.','auth/weak-password':'Daha güçlü bir şifre seç.','auth/popup-closed-by-user':'Giriş iptal edildi.','auth/unauthorized-domain':'web.zpas.org veya login.zpas.org Firebase Authentication > Authorized domains listesinde yok.','auth/operation-not-allowed':'Bu giriş yöntemi Firebase Authentication’da etkin değil.','auth/popup-blocked':'Tarayıcı Google giriş penceresini engelledi; açılır pencerelere izin verip tekrar dene.','auth/network-request-failed':'İnternet bağlantısı kurulamadı. Bağlantını kontrol edip tekrar dene.','auth/invalid-api-key':'Web uygulamasındaki Firebase API anahtarı geçersiz. Firebase web yapılandırmasını kontrol et.','auth/account-exists-with-different-credential':'Bu e-posta Firebase’de başka bir giriş sağlayıcısına bağlı. Önce o sağlayıcıyla giriş yap.','auth/invalid-phone-number':'Telefonu ülke koduyla yaz; örnek: +15551234567.','auth/missing-phone-number':'Telefon numarasını ülke koduyla yaz.','auth/invalid-verification-code':'SMS kodu yanlış. Tekrar kontrol et.','auth/code-expired':'SMS kodunun süresi doldu. Yeni kod iste.','auth/captcha-check-failed':'Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyip tekrar dene.','auth/too-many-requests':'Çok fazla deneme yapıldı. Bir süre bekleyip tekrar dene.','auth/quota-exceeded':'Firebase SMS gönderim kotası doldu. Daha sonra tekrar dene.','auth/billing-not-enabled':'Firebase telefon doğrulaması için faturalandırma ayarı gerekiyor.'};return map[error?.code]||`Giriş başarısız (${error?.code||'bilinmeyen hata'}).`}
$('login-identifier').addEventListener('input',()=>{const raw=$('login-identifier').value.trim();const isPhone=raw.length>0&&!raw.includes('@');$('password-label').hidden=isPhone;$('password').required=!isPhone;$('login-identifier').inputMode=isPhone?'tel':'email';if(!phoneConfirmation)$('email-submit').textContent=isPhone?'SMS kodu gönder':'Giriş yap'});
let phoneConfirmation=null,phoneRecaptcha=null;
function clearPhoneLogin(message=''){phoneConfirmation=null;phoneRecaptcha?.clear();phoneRecaptcha=null;$('login-identifier').disabled=false;$('phone-code-label').hidden=true;$('phone-code').value='';$('phone-cancel').hidden=true;$('password-label').hidden=false;$('password').required=true;$('email-submit').textContent='Giriş yap';if(message)setStatus('auth-status',message,false)}
$('phone-cancel').onclick=()=>clearPhoneLogin('Telefon girişi iptal edildi.');
$('email-form').onsubmit=async e=>{e.preventDefault();const identifier=$('login-identifier').value.trim();try{
  if(phoneConfirmation){setStatus('auth-status','SMS kodu doğrulanıyor…',false);const result=await phoneConfirmation.confirm($('phone-code').value.trim());if(getAdditionalUserInfo(result)?.isNewUser){try{await deleteUser(result.user)}finally{await signOut(auth).catch(()=>{})}clearPhoneLogin('Bu telefonla kayıtlı Z Pass hesabı bulunamadı. Hesabını APK’da oluştur.');return}clearPhoneLogin();return}
  if(identifier.includes('@')){setStatus('auth-status','Giriş yapılıyor…',false);await signInWithEmailAndPassword(auth,identifier,$('password').value);return}
  const phone=identifier.replace(/[\s()-]/g,'');if(!/^\+[1-9]\d{7,14}$/.test(phone)){setStatus('auth-status','Telefon numarasını ülke koduyla yaz; örnek: +15551234567.');return}
  setStatus('auth-status','Güvenlik doğrulaması hazırlanıyor…',false);phoneRecaptcha?.clear();phoneRecaptcha=new RecaptchaVerifier(auth,'recaptcha-container',{size:'invisible'});setStatus('auth-status','SMS doğrulama kodu gönderiliyor…',false);phoneConfirmation=await signInWithPhoneNumber(auth,phone,phoneRecaptcha);$('login-identifier').disabled=true;$('password-label').hidden=true;$('phone-code-label').hidden=false;$('phone-cancel').hidden=false;$('phone-code').focus();$('email-submit').textContent='Kodu doğrula';setStatus('auth-status','SMS kodu gönderildi. Telefonundaki 6 haneli kodu gir.',false);
}catch(error){if(phoneConfirmation){phoneConfirmation=null;phoneRecaptcha?.clear();phoneRecaptcha=null}setStatus('auth-status',authError(error))}};
$('google-signin').onclick=async()=>{try{setStatus('auth-status','Google girişi açılıyor…',false);const result=await signInWithPopup(auth,new GoogleAuthProvider());if(getAdditionalUserInfo(result)?.isNewUser){try{await deleteUser(result.user)}finally{await signOut(auth).catch(()=>{})}setStatus('auth-status','Yeni hesap webde oluşturulamaz. APK’yı indirip hesabını uygulamada oluştur.')}}catch(e){setStatus('auth-status',authError(e))}};
$('qr-login-open').onclick=()=>{if(!$('qr-login-dialog').open)$('qr-login-dialog').showModal();startWebQrLogin()};
$('qr-login-retry').onclick=startWebQrLogin;
$('qr-login-dialog').addEventListener('close',stopQrLogin);
$('signout').onclick=()=>signOut(auth);
$('pair-device').onclick=()=>{$('pair-dialog').showModal();$('pair-start').disabled=false;setStatus('pair-status','Şifreli sohbetleri açmak için telefonunda bu tarayıcıyı onayla.',false)};
$('pair-start').onclick=phonePair;
$('pair-dialog').addEventListener('close',()=>{pairStop?.();pairStop=null;clearTimeout(pairExpiry);if(pairRef){deleteDoc(pairRef).catch(()=>{});pairRef=null}});

onAuthStateChanged(auth,async user=>{
  me=user||null;profile=null;browserIdentity=null;stopLive();browserSessionStop?.();browserSessionStop=null;
  if(!user){authView.hidden=false;setupView.hidden=true;chatApp.hidden=true;return}
  authView.hidden=true;chatApp.hidden=true;setupView.hidden=true;$('qr-login-dialog').close();
  try{await registerBrowserSession(user);const snap=await getDoc(doc(db,'chat_profiles',user.uid));profile=snap.exists()?{uid:user.uid,...snap.data()}:null;
    if(!profile?.username){setupView.hidden=false;return}
    browserIdentity=await loadIdentity(user.uid);
    if(!browserIdentity){chatApp.hidden=false;$('pair-dialog').showModal();$('pair-start').disabled=false;setStatus('pair-status','Şifreli sohbetleri okuyup göndermek için bu tarayıcıyı telefonunla eşleştir.',false);return}
    startLive();
  }catch(error){authView.hidden=false;setStatus('auth-status',error.message||'Z Pass profili yüklenemedi.')}
});

function startLive(){if(!me||!browserIdentity)return;chatApp.hidden=false;subscribeChats();touchPresence();clearInterval(presenceTimer);presenceTimer=setInterval(touchPresence,30000);watchIncomingCalls();openRequestedProfile().catch(error=>toast(error.message||'Profil açılamadı.'));}
async function openRequestedProfile(){
  const params=new URLSearchParams(location.search),handle=(params.get('profile')||'').trim().replace(/^@/,'').toLowerCase();
  if(!handle||!me||!browserIdentity)return;
  params.delete('profile');const rest=params.toString();history.replaceState(null,'',`${location.pathname}${rest?`?${rest}`:''}${location.hash}`);
  const usernameSnap=await getDoc(doc(db,'chat_usernames',handle)),uid=usernameSnap.get('uid');
  if(!uid)throw Error(`@${handle} kullanıcı adı bulunamadı.`);
  if(uid===me.uid){toast('Bu senin profilin.');return;}
  await openConversation(uid);
}
function stopLive(){chatsStop?.();messagesStop?.();peerStop?.();typingStop?.();incomingCallStop?.();incomingCallStop=null;clearInterval(presenceTimer);presenceTimer=null;chatsStop=messagesStop=peerStop=typingStop=null;currentPeer=null;currentChatId=null;messages=[];}
async function touchPresence(){if(!me)return;setDoc(doc(db,'chat_profiles',me.uid),{lastSeen:Date.now()},{merge:true}).catch(()=>{})}
function subscribeChats(){chatsStop?.();chatsStop=onSnapshot(query(collection(db,'chats'),where('participants','array-contains',me.uid)),async snap=>{const rows=await Promise.all(snap.docs.map(async d=>{const data=d.data(),peerUid=(data.participants||[]).find(uid=>uid!==me.uid);if(!peerUid)return null;const peer=await getProfile(peerUid);const last=await unseal(peerUid,d.id,data.lastMessage||'');return{chatId:d.id,peerUid,peer,lastMessage:last,lastAt:data.lastAt||0}}));renderChatList(rows.filter(Boolean).sort((a,b)=>b.lastAt-a.lastAt))},e=>toast(e.message||'Could not load chats.'))}
async function getProfile(uid){if(profileCache.has(uid))return profileCache.get(uid);const snap=await getDoc(doc(db,'chat_profiles',uid));if(!snap.exists())return null;const p={uid,...snap.data()};profileCache.set(uid,p);return p}
async function canSeeProfileField(p,key){const rule=p.privacy?.[key]||'everybody';if(rule==='everybody'||p.uid===me.uid)return true;if(rule==='nobody')return false;if(rule==='contacts'){const contact=await getDoc(doc(db,'chat_contacts',p.uid,'members',me.uid));return contact.exists()}return false}
function renderChatList(rows){const host=$('chat-list');host.replaceChildren();if(!rows.length){const p=document.createElement('p');p.className='muted';p.textContent='Henüz sohbet yok. Özel sohbet başlatmak için kullanıcı adı ara.';host.append(p);return}for(const row of rows){const b=document.createElement('button');b.className='chat-row'+(row.chatId===currentChatId?' active':'');b.onclick=()=>openConversation(row.peerUid);const av=document.createElement('span');av.className='avatar';av.textContent=initial(row.peer);const copy=document.createElement('span');copy.className='chat-copy';const name=document.createElement('b');name.textContent=displayName(row.peer);const last=document.createElement('small');last.textContent=row.lastMessage||'Özel sohbet başlat';copy.append(name,last);const time=document.createElement('time');time.className='chat-time';time.textContent=shortTime(row.lastAt);b.append(av,copy,time);host.append(b)}}

function renderSearch(rows){const host=$('search-results');host.replaceChildren();host.hidden=!rows.length;if(!rows.length)return;for(const p of rows){const b=document.createElement('button');b.className='result-row';b.onclick=()=>{host.hidden=true;$('search').value='';openConversation(p.uid)};const av=document.createElement('span');av.className='avatar';av.textContent=initial(p);const cp=document.createElement('span');cp.className='chat-copy';const name=document.createElement('b');name.textContent=displayName(p);const handle=document.createElement('small');handle.textContent='@'+p.username;cp.append(name,handle);b.append(av,cp);host.append(b)}}
$('search').addEventListener('input',()=>{clearTimeout(searchTimer);const q=$('search').value.trim().toLowerCase().replace(/^@/,'');$('search-results').hidden=true;if(q.length<2)return;searchTimer=setTimeout(async()=>{try{const snap=await getDocs(query(collection(db,'chat_profiles'),orderBy('username'),where('username','>=',q),where('username','<=',q+'\uf8ff'),limit(15)));renderSearch(snap.docs.map(d=>({uid:d.id,...d.data()})).filter(p=>p.uid!==me.uid&&p.username))}catch(e){toast(e.message||'Search failed.')}} ,250)});
$('clear-search').onclick=()=>{$('search').value='';$('search-results').hidden=true};

async function openConversation(peerUid){
  if(!browserIdentity){$('pair-dialog').showModal();return}
  const peer=await getProfile(peerUid);if(!peer)return toast('Sohbet profiline ulaşılamadı.');
  if(!peer.pubKey)return toast('Uçtan uca şifreleme için bu kişi telefonunda Z Pass Sohbet’i bir kez açmalı.');
  currentPeer=peer;currentChatId=sortedChatId(me.uid,peerUid);$('chat-app').classList.add('has-chat');$('empty-state').hidden=true;$('conversation').hidden=false;
  $('peer-name').textContent=displayName(peer);$('peer-avatar').textContent=initial(peer);$('peer-status').textContent=peer.username?'@'+peer.username:'Uçtan uca şifreli';
  const chatRef=doc(db,'chats',currentChatId);await setDoc(chatRef,{participants:[me.uid,peerUid]},{merge:true});
  messagesStop?.();messagesStop=onSnapshot(query(collection(db,'chats',currentChatId,'messages'),orderBy('createdAt'),limitToLast(200)),async snap=>{const docs=snap.docs;messages=await Promise.all(docs.map(async d=>{const x=d.data();return{id:d.id,sender:x.sender,text:await unseal(peerUid,currentChatId,x.text||''),createdAt:x.createdAt||0,read:x.read===true}}));renderMessages();for(const d of docs){const x=d.data();if(x.sender!==me.uid&&!x.read)updateDoc(d.ref,{read:true}).catch(()=>{})}},e=>toast(e.message||'Message stream failed.'));
  peerStop?.();peerStop=onSnapshot(doc(db,'chat_profiles',peerUid),async s=>{if(!s.exists())return;currentPeer={uid:peerUid,...s.data()};$('peer-name').textContent=displayName(currentPeer);$('peer-avatar').textContent=initial(currentPeer);const allowed=await canSeeProfileField(currentPeer,'lastSeen'),seen=s.get('lastSeen')||0;$('peer-status').textContent=allowed&&seen>Date.now()-60000?'online':allowed&&seen?`last seen ${shortTime(seen)}`:'End-to-end encrypted'});
  typingStop?.();typingStop=onSnapshot(doc(db,'chats',currentChatId,'presence',peerUid),async s=>{const t=s.get('lastInputAt')||0;if(t>Date.now()-5000)$('peer-status').textContent='typing…';else if(currentPeer){const allowed=await canSeeProfileField(currentPeer,'lastSeen'),seen=currentPeer.lastSeen||0;$('peer-status').textContent=allowed&&seen>Date.now()-60000?'online':allowed&&seen?`last seen ${shortTime(seen)}`:'End-to-end encrypted'}});
}
function renderMessages(){const host=$('messages');host.replaceChildren();for(const m of messages){const b=document.createElement('article');b.className='message'+(m.sender===me.uid?' mine':'');b.textContent=m.text;const time=document.createElement('small');time.className='message-time';time.textContent=shortTime(m.createdAt)+(m.sender===me.uid?(m.read?' · Okundu':' · Gönderildi'):'');b.append(time);host.append(b)}host.scrollTop=host.scrollHeight}
$('back-list').onclick=()=>{$('chat-app').classList.remove('has-chat');$('conversation').hidden=true;$('empty-state').hidden=false;messagesStop?.();peerStop?.();typingStop?.()};
$('message-input').addEventListener('input',()=>{if(!currentChatId)return;const ref=doc(db,'chats',currentChatId,'presence',me.uid);setDoc(ref,{lastInputAt:Date.now(),updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});clearTimeout(typingTimer);typingTimer=setTimeout(()=>setDoc(ref,{lastInputAt:0,updatedAt:serverTimestamp()},{merge:true}).catch(()=>{}),5200)});
$('composer').onsubmit=async e=>{e.preventDefault();const input=$('message-input'),text=input.value.trim();if(!text||!currentPeer||!currentChatId)return;input.disabled=true;try{const sealed=await seal(currentPeer.uid,currentChatId,text),preview=await seal(currentPeer.uid,currentChatId,text.slice(0,120)),now=Date.now();await setDoc(doc(db,'chats',currentChatId),{participants:[me.uid,currentPeer.uid],lastMessage:preview,lastAt:now},{merge:true});await addDoc(collection(db,'chats',currentChatId,'messages'),{sender:me.uid,text:sealed,createdAt:now,read:false,e2e:true});input.value='';await setDoc(doc(db,'chats',currentChatId,'presence',me.uid),{lastInputAt:0,updatedAt:serverTimestamp()},{merge:true})}catch(error){toast(error.message||'Message could not be sent.')}finally{input.disabled=false;input.focus()}};

// WebRTC calls use DTLS-SRTP media encryption and Firestore only for signaling.
let activeCall=null,incomingCallStop=null;
function watchIncomingCalls(){incomingCallStop?.();incomingCallStop=onSnapshot(query(collection(db,'chat_calls'),where('parties','array-contains',me.uid)),snap=>{for(const d of snap.docs){const c=d.data();if(activeCall?.id===d.id&&['ended','declined','missed'].includes(c.state)){finishCall(c.state==='missed'?'Call timed out':'Call ended',false);continue}if(c.callee===me.uid&&c.state==='ringing'&&Date.now()-(c.createdAt||0)<45000&&!activeCall){getProfile(c.caller).then(p=>{if(activeCall)return;activeCall={id:d.id,peer:c.caller,peerName:displayName(p),video:!!c.video,incoming:true,doc:d.ref};showIncomingCall()})}}})}
function showIncomingCall(){if(!activeCall)return;$('call-peer').textContent=activeCall.peerName;$('call-state').textContent=activeCall.video?'Görüntülü arama geliyor':'Sesli arama geliyor';$('accept-call').hidden=false;$('call-videos').classList.toggle('active',activeCall.video);$('audio-call-art').hidden=activeCall.video;$('call-dialog').showModal()}
async function iceServers(){const out=[{urls:'stun:stun.l.google.com:19302'}];try{const s=await getDoc(doc(db,'app_config','turn'));const urls=s.get('urls');if(Array.isArray(urls)&&urls.length)out.push({urls,username:s.get('username')||'',credential:s.get('credential')||''})}catch{}return out}
async function makePeer(call){const pc=new RTCPeerConnection({iceServers:await iceServers()});call.pc=pc;call.remoteStream=new MediaStream();call.remoteReady=false;call.pendingIce=[];pc.ontrack=e=>{for(const t of e.streams[0]?.getTracks()||[e.track])call.remoteStream.addTrack(t);$('remote-video').srcObject=call.remoteStream;$('remote-audio').srcObject=call.video?null:call.remoteStream};pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')$('call-state').textContent='Connected · peer-to-peer';if(['failed','closed'].includes(pc.connectionState)&&activeCall?.id===call.id)finishCall('Call connection ended')};pc.onicecandidate=e=>{if(!e.candidate)return;const item={from:me.uid,mid:e.candidate.sdpMid||'',idx:e.candidate.sdpMLineIndex||0,sdp:e.candidate.candidate};if(!call.iceReady){call.pendingIce.push(item);return}addDoc(collection(db,'chat_calls',call.id,'ice'),item).catch(()=>{})};call.iceStop=onSnapshot(collection(db,'chat_calls',call.id,'ice'),snap=>snap.docChanges().forEach(change=>{const x=change.doc.data();if(x.from===me.uid)return;const candidate=new RTCIceCandidate({candidate:x.sdp,sdpMid:x.mid,sdpMLineIndex:x.idx});if(call.remoteReady)pc.addIceCandidate(candidate).catch(()=>{});else call.pendingRemoteIce=(call.pendingRemoteIce||[]).concat(candidate)}));return pc}
async function flushLocalIce(call){call.iceReady=true;const pending=call.pendingIce.splice(0);for(const item of pending)await addDoc(collection(db,'chat_calls',call.id,'ice'),item)}
async function flushRemoteIce(call){call.remoteReady=true;const pending=call.pendingRemoteIce||[];call.pendingRemoteIce=[];for(const item of pending)await call.pc.addIceCandidate(item).catch(()=>{})}
async function localMedia(call){const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:call.video?{facingMode:'user'}:false});call.localStream=stream;for(const track of stream.getTracks())call.pc.addTrack(track,stream);$('local-video').srcObject=stream}
function watchCall(call){call.callStop=onSnapshot(call.doc,s=>{if(!s.exists()){finishCall('Call ended',false);return}const state=s.get('state');if(['ended','declined','missed'].includes(state)){finishCall(state==='missed'?'Call timed out':'Call ended',false);return}if(!call.incoming&&s.get('answer')&&call.pc.signalingState==='have-local-offer')call.pc.setRemoteDescription({type:'answer',sdp:s.get('answer')}).then(()=>flushRemoteIce(call)).then(()=>$('call-state').textContent='Connected · peer-to-peer').catch(()=>{});if(state==='active')$('call-state').textContent='Connected · peer-to-peer'})}
async function startCall(video){if(!currentPeer||activeCall)return;try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Mikrofon ve kamera için HTTPS bağlantısı gerekli.');const docRef=doc(collection(db,'chat_calls'));const call={id:docRef.id,doc:docRef,peer:currentPeer.uid,peerName:displayName(currentPeer),video,incoming:false,iceReady:false};activeCall=call;$('call-peer').textContent=call.peerName;$('call-state').textContent='Aranıyor…';$('accept-call').hidden=true;$('call-videos').classList.toggle('active',video);$('audio-call-art').hidden=video;$('call-dialog').showModal();const pc=await makePeer(call);await localMedia(call);const offer=await pc.createOffer();await pc.setLocalDescription(offer);await setDoc(docRef,{caller:me.uid,callee:call.peer,parties:[me.uid,call.peer],state:'ringing',createdAt:Date.now(),offer:offer.sdp,video});await flushLocalIce(call);watchCall(call);setTimeout(()=>{if(activeCall?.id===call.id&&call.pc.connectionState!=='connected')updateDoc(docRef,{state:'missed'}).catch(()=>{})},45000)}catch(error){toast(error.message||'Arama başlatılamadı.');finishCall()}}
async function acceptCall(){const call=activeCall;if(!call?.incoming)return;try{const pc=await makePeer(call);await localMedia(call);const snap=await getDoc(call.doc);await pc.setRemoteDescription({type:'offer',sdp:snap.get('offer')});await flushRemoteIce(call);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await updateDoc(call.doc,{answer:answer.sdp,state:'active'});await flushLocalIce(call);call.incoming=false;$('accept-call').hidden=true;$('call-state').textContent='Bağlanıyor…';watchCall(call)}catch(error){toast(error.message||'Arama yanıtlanamadı.');finishCall()}}
function finishCall(label='Call ended',updateServer=true){const c=activeCall;if(!c)return;c.callStop?.();c.iceStop?.();c.localStream?.getTracks().forEach(t=>t.stop());c.remoteStream?.getTracks().forEach(t=>t.stop());if(c.pc)c.pc.close();if(updateServer&&c.doc)updateDoc(c.doc,{state:c.incoming?'declined':'ended'}).catch(()=>{});activeCall=null;if($('call-dialog').open)$('call-dialog').close();$('call-state').textContent=label;$('remote-video').srcObject=null;$('remote-audio').srcObject=null;$('local-video').srcObject=null}
$('audio-call').onclick=()=>startCall(false);$('video-call').onclick=()=>startCall(true);$('accept-call').onclick=acceptCall;$('hangup').onclick=()=>finishCall();$('toggle-mic').onclick=()=>{const t=activeCall?.localStream?.getAudioTracks()[0];if(t){t.enabled=!t.enabled;$('toggle-mic').textContent=t.enabled?'Mikrofon':'Sessiz'}};$('toggle-camera').onclick=()=>{const t=activeCall?.localStream?.getVideoTracks()[0];if(t){t.enabled=!t.enabled;$('toggle-camera').textContent=t.enabled?'Kamera':'Kamera kapalı'}};
$('call-dialog').addEventListener('cancel',event=>{event.preventDefault();finishCall()});
