const BASE='/resources/wallpapers/';
let catalogPromise,selected=null;
export function loadCatalog(){return catalogPromise??=fetch(BASE+'catalog.json').then(r=>{if(!r.ok)throw Error('Arka plan kataloğu açılamadı.');return r.json()})}
function choice(){try{return JSON.parse(localStorage.getItem('zpass-wallpaper-v1')||'null')}catch{return null}}
export function applyWallpaper(item=choice()){
 const hosts=document.querySelectorAll('#app-messages,.zp-shared-preview');
 hosts.forEach(host=>{host.classList.add('zp-wallpaper-host');host.classList.toggle('zp-pattern',item?.kind==='pattern');if(item?.file&&/^[\w .()-]+\.(svg|png|jpe?g|webp|avif)$/i.test(item.file))host.style.setProperty('--zp-wallpaper','url("'+BASE+encodeURIComponent(item.file)+'")');else host.style.removeProperty('--zp-wallpaper')});
}
export async function openWallpapers(){
 let catalog;try{catalog=await loadCatalog()}catch(e){window.alert(e.message);return}
 const previous=document.getElementById('zp-wallpaper-dialog');previous?.remove();
 const dialog=document.createElement('dialog');dialog.id='zp-wallpaper-dialog';dialog.className='zp-wallpaper-dialog';dialog.setAttribute('aria-labelledby','zp-wallpaper-title');
 dialog.innerHTML='<div class="zp-picker-head"><h2 id="zp-wallpaper-title">Sohbetinin havasını değiştir.</h2><button type="button" aria-label="Kapat">×</button></div><p class="zp-picker-note">APK ile aynı 59 arka plan. Seçimin bu tarayıcıda kalır.</p><div class="zp-picker-preview zp-wallpaper-host"><span>Yeni bir başlangıç ✨</span></div><div class="zp-picker-tabs"><button data-kind="all" aria-pressed="true">Tümü</button><button data-kind="pattern" aria-pressed="false">Desenler</button><button data-kind="image" aria-pressed="false">Görseller</button></div><div class="zp-wallpaper-grid"></div><div class="zp-picker-actions"><button data-action="reset">Varsayılan</button><button data-action="apply" class="primary" disabled>Uygula</button></div><p class="zp-picker-note" role="status"></p>';
 document.body.append(dialog);selected=catalog.items.find(i=>i.id===choice()?.id)||null;
 const grid=dialog.querySelector('.zp-wallpaper-grid'),preview=dialog.querySelector('.zp-picker-preview'),status=dialog.querySelector('[role=status]'),apply=dialog.querySelector('[data-action=apply]');
 const paint=kind=>{grid.replaceChildren();for(const item of catalog.items.filter(i=>kind==='all'||i.kind===kind)){
  const button=document.createElement('button');button.type='button';button.className='zp-wallpaper-item';button.setAttribute('aria-pressed',String(selected?.id===item.id));button.setAttribute('aria-label',item.title);
  const img=document.createElement('img');img.src=BASE+item.thumbnail;img.alt=item.title;img.loading='lazy';img.decoding='async';const label=document.createElement('small');label.textContent=item.title+' · '+item.format;button.append(img,label);
  button.onclick=()=>{selected=item;apply.disabled=false;grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));preview.style.setProperty('--zp-wallpaper','url("'+BASE+encodeURIComponent(item.file)+'")');preview.classList.toggle('zp-pattern',item.kind==='pattern');status.textContent=item.title};grid.append(button)
 }};
 dialog.querySelector('.zp-picker-head button').onclick=()=>dialog.close();dialog.querySelectorAll('[data-kind]').forEach(button=>button.onclick=()=>{dialog.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));paint(button.dataset.kind)});
 apply.onclick=()=>{if(!selected)return;try{localStorage.setItem('zpass-wallpaper-v1',JSON.stringify({id:selected.id,file:selected.file,kind:selected.kind}));applyWallpaper(selected);dialog.close()}catch{status.textContent='Tarayıcı seçimini kaydedemedi.'}};
 dialog.querySelector('[data-action=reset]').onclick=()=>{try{localStorage.removeItem('zpass-wallpaper-v1');applyWallpaper(null);dialog.close()}catch{status.textContent='Seçim temizlenemedi.'}};
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});dialog.addEventListener('close',()=>dialog.remove());paint('all');dialog.showModal();
}
function mount(){
 applyWallpaper();
 const host=document.querySelector('#view-settings')||document.querySelector('[data-settings-view="general"]');
 if(host&&!host.querySelector('[data-wallpaper-launch]')){const card=document.createElement('article');card.className='settings-box';const h=document.createElement('h3');h.textContent='Sohbet arka planları';const p=document.createElement('p');p.className='zp-picker-note';p.textContent='APK ve webde aynı katalog. SVG, PNG ve AVIF seçenekleri; 59 özgün görsel.';const preview=document.createElement('div');preview.className='zp-shared-preview';const button=document.createElement('button');button.type='button';button.className='zp-wallpaper-launch';button.dataset.wallpaperLaunch='';button.textContent='Arka plan seç';button.onclick=openWallpapers;card.append(h,p,preview,button);host.prepend(card);applyWallpaper()}
 const top=document.querySelector('.nav-actions');if(top&&!document.querySelector('[data-zpass-web-link]')){const a=document.createElement('a');a.href='/web.html';a.textContent='Web tasarımı';a.dataset.zpassWebLink='';a.className='nav-signin';top.append(a)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();window.ZPassWallpapers={open:openWallpapers,apply:applyWallpaper};window.addEventListener('storage',e=>{if(e.key==='zpass-wallpaper-v1')applyWallpaper()});
