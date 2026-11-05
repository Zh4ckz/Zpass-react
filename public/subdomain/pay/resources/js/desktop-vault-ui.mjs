import {scope,setScope} from './vault-state.mjs';
const $=id=>document.getElementById(id);
const text=value=>window.ZPassI18n?.get(value) || value;
const icon=name=>`/resources/assets/icons/modern/${({"safe-lock":"shield","arrow-door-in-fill-18":"login","bank-card":"card","LOCK-OTP":"shield"})[name] || "shield"}.svg`;
function button(label,action) {const node=document.createElement('button');node.type='button';node.textContent=text(label);node.addEventListener('click',()=>Promise.resolve(action()).catch(showError));return node;}
export function showError(error) {const target=$('dashboardMessage');if(target)target.textContent=error?.code==='permission-denied' ? text('Sign in required') : text('An unexpected error occurred. Please try again.');}
export function inputDialog(title,fields,submitLabel='Save') {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='desktop-dialog';
    const form=document.createElement('form');const heading=document.createElement('h2');heading.textContent=text(title);form.append(heading);
    for(const field of fields) {
      const label=document.createElement('label');label.append(document.createTextNode(text(field.label)));
      const input=document.createElement(field.options?'select':'input');input.name=field.name;input.required=Boolean(field.required);
      if(field.options)for(const option of field.options){const element=document.createElement('option');element.value=option.value;element.textContent=option.label;input.append(element);}
      else {input.type=field.type || 'text';input.value=field.value || '';}
      label.append(input);form.append(label);
    }
    const footer=document.createElement('footer');const cancel=button('Cancel',()=>dialog.close());const submit=document.createElement('button');submit.type='submit';submit.className='primary';submit.textContent=text(submitLabel);footer.append(cancel,submit);form.append(footer);dialog.append(form);
    let value=null;
    form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity()){value=Object.fromEntries(new FormData(form));dialog.close();}});
    dialog.addEventListener('close',()=>{dialog.remove();resolve(value);},{once:true});document.body.append(dialog);dialog.showModal();
  });
}
let actions={},selected=null;
export function showLoginDetails(item) {
  selected=item;
  const root=$('loginDetails');if(!root)return;
  root.replaceChildren();
  if(!item){root.className='empty-state';root.textContent=text('Select an item');return;}
  root.className='';
  const head=document.createElement('div');head.className='detail-heading';const image=document.createElement('img');image.src=icon('safe-lock');image.alt='';
  const heading=document.createElement('h3');heading.textContent=item.platform || 'PassGram';heading.dataset.private='';head.append(image,heading);root.append(head);
  const fields=document.createElement('div');fields.className='detail-fields';
  for(const [name,value] of [['Username',item.username],['Password','••••••••'],['Website',item.domain],['Category',item.category || text('All vaults')],['Notes',item.notes]]){
    const label=document.createElement('label');label.append(document.createTextNode(text(name)));const strong=document.createElement('strong');strong.dataset.private='';strong.textContent=value || '—';label.append(strong);
    if(name==='Password')label.append(button('Show password',()=>{strong.textContent=strong.textContent==='••••••••'?item.password:'••••••••';}));fields.append(label);
  }
  root.append(fields);
  const controls=document.createElement('div');controls.className='detail-actions';
  controls.append(button('Edit',()=>actions.edit(item)),button('Move to category',()=>actions.move(item)),button(item.archived || item.isArchived || ['archive','archived','arşiv'].includes((item.category||'').toLowerCase())?'Unarchive':'Archive',()=>actions.archive(item)));
  root.append(controls);
}
export function refreshDetails(items) {if(selected)showLoginDetails(items.find(item=>item.id===selected.id));}
export function installDesktopUi(api) {
  actions=api;
  const updateShell=()=>document.body.classList.toggle('vault-open',!$('dashboardView')?.classList.contains('hidden'));
  new MutationObserver(updateShell).observe($('dashboardView'),{attributes:true,attributeFilter:['class']});updateShell();
  document.querySelector('[data-panel="overview"]')?.addEventListener('click',()=>setScope('all'));
  $('archiveNav')?.addEventListener('click',()=>{api.panel('overview');setScope('archive');});
  $('vaultNav')?.addEventListener('click',()=>{api.panel('overview');setScope('all');});
  const trigger=$('createItemTop');const menu=document.createElement('div');menu.className='desktop-menu';menu.hidden=true;menu.id='desktopNewItemMenu';
  for(const [label,name,kind] of [['Login','arrow-door-in-fill-18','login'],['Payment card','bank-card','card'],['Authenticator account','LOCK-OTP','authenticator']]) {
    const node=button(label,()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');api.create(kind);});
    const image=document.createElement('img');image.src=icon(name);image.alt='';node.prepend(image);menu.append(node);
  }
  trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',menu.id);trigger.parentElement.append(menu);
  // Replace the old direct-create listener without changing the authentication gate.
  trigger.addEventListener('click',event=>{event.stopImmediatePropagation();menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));},{capture:true});
  document.addEventListener('click',event=>{if(!menu.contains(event.target) && event.target!==trigger){menu.hidden=true;trigger.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.hidden=true;if($('itemDrawer')?.classList.contains('open'))api.close();}});
  document.querySelectorAll('[data-panel-view]').forEach(panel=>panel.querySelectorAll('input,textarea').forEach(input=>input.setAttribute('data-no-translate','')));
  window.addEventListener('zpass:scopechange',()=>{
    const title=$('vaultPageTitle');if(title){title.toggleAttribute('data-private',scope.view==='folder');title.textContent=scope.view==='archive'?text('Archived'):scope.view==='folder'?scope.folder:text('All vaults');}
    selected=null;showLoginDetails(null);api.render();
  });
  window.addEventListener('zpass:languagechange',()=>{showLoginDetails(selected);api.render();});
  showLoginDetails(null);
}
