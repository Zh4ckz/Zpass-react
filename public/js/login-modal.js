(() => {
  const modal=document.createElement('dialog');
  modal.className='login-modal';modal.setAttribute('aria-label','Z Pass sign in');
  const back=document.createElement('button');back.type='button';back.className='login-modal-back';
  back.setAttribute('aria-label','Back');back.innerHTML='<span aria-hidden="true">←</span><span>Back</span>';
  const frame=document.createElement('iframe');frame.title='Z Pass sign in';
  modal.append(back,frame);document.body.append(modal);
  let trigger;
  const close=()=>{modal.close();frame.removeAttribute('src');document.body.classList.remove('login-modal-open');
    if(location.hash==='#login')history.replaceState(null,'',location.pathname+location.search);
    trigger?.focus();};
  const open=()=>{if(modal.open)return;trigger=document.activeElement;frame.src='/dashboard.html?embedded=login&v=20261017#login';modal.showModal();document.body.classList.add('login-modal-open');back.focus();};
  back.addEventListener('click',close);
  modal.addEventListener('cancel',event=>{event.preventDefault();close();});
  document.addEventListener('click',event=>{const link=event.target.closest('a[href="/dashboard.html#login"]');if(!link)return;event.preventDefault();if(matchMedia('(max-width:700px)').matches){location.href='/dashboard.html';return;}history.pushState(null,'','#login');open();});
  addEventListener('hashchange',()=>location.hash==='#login'?open():modal.open&&close());
  if(location.hash==='#login')open();
})();
