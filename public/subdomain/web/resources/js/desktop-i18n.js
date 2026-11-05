(() => {
  let code='en-US', catalog={}, aliases={}, languages=[], generation=0;
  const sources=new WeakMap(), attributes=new WeakMap();
  const normalize=value=>aliases[value] || value;
  const pathLanguage=()=>{
    const segment=location.pathname.split('/').filter(Boolean)[0];
    return languages.find(item=>item.code.toLowerCase()===segment?.toLowerCase() || item.code.split('-')[0]===segment?.toLowerCase())?.code;
  };
  const get=value=>catalog[normalize(value)] || normalize(value);
  function translate(root=document.body) {
    if(!root) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const node=walker.currentNode;
      if(node.parentElement?.closest('script,style,[data-private],[data-no-translate],[data-m],input,textarea')) continue;
      const current=node.nodeValue.trim(); if(!current) continue;
      let entry=sources.get(node);
      if(!entry || current!==entry.rendered) entry={source:normalize(current)};
      entry.rendered=get(entry.source);sources.set(node,entry);
      if(current!==entry.rendered) node.nodeValue=node.nodeValue.replace(current,entry.rendered);
    }
    root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach(element=>{
      let entries=attributes.get(element) || {};
      for(const name of ['placeholder','aria-label','title']) {
        const current=element.getAttribute(name);if(!current)continue;
        let entry=entries[name];if(!entry || current!==entry.rendered)entry={source:normalize(current)};
        entry.rendered=get(entry.source);entries[name]=entry;if(current!==entry.rendered)element.setAttribute(name,entry.rendered);
      }
      attributes.set(element,entries);
    });
  }
  function buildPickers() {
    document.querySelectorAll('[data-language-picker]').forEach(root=>{
      root.replaceChildren();
      const button=document.createElement('button');button.type='button';button.className='language-trigger';button.setAttribute('aria-expanded','false');
      const selected=languages.find(item=>item.code===code);

      const name=document.createElement('span');name.textContent=selected?.name || 'English';name.dataset.noTranslate='';
      const globe=document.createElementNS('http://www.w3.org/2000/svg','svg');globe.setAttribute('viewBox','0 0 24 24');globe.setAttribute('class','icon-language');globe.setAttribute('aria-hidden','true');globe.innerHTML='<path fill="currentColor" d="M12 22q-2.05 0-3.875-.788-1.825-.787-3.187-2.15-1.363-1.362-2.15-3.187Q2 14.05 2 12q0-2.075.788-3.887.787-1.813 2.15-3.175Q6.3 3.575 8.125 2.787 9.95 2 12 2q2.075 0 3.887.787 1.813.788 3.175 2.151 1.363 1.362 2.15 3.175Q22 9.925 22 12q0 2.05-.788 3.875-.787 1.825-2.15 3.187-1.362 1.363-3.175 2.15Q14.075 22 12 22Zm0-2.05q.65-.9 1.125-1.875T13.9 16h-3.8q.3 1.1.775 2.075.475.975 1.125 1.875Zm-2.6-.4q-.45-.825-.787-1.713Q8.275 16.95 8.05 16H5.1q.725 1.25 1.812 2.175Q8 19.1 9.4 19.55Zm5.2 0q1.4-.45 2.487-1.375Q18.175 17.25 18.9 16h-2.95q-.225.95-.562 1.837-.338.888-.788 1.713ZM4.25 14h3.4q-.075-.5-.113-.988Q7.5 12.525 7.5 12t.037-1.012q.038-.488.113-.988h-3.4q-.125.5-.188.988Q4 11.475 4 12t.062 1.012q.063.488.188.988Zm5.4 0h4.7q.075-.5.113-.988.037-.487.037-1.012t-.037-1.012q-.038-.488-.113-.988h-4.7q-.075.5-.112.988Q9.5 11.475 9.5 12t.038 1.012q.037.488.112.988Zm6.7 0h3.4q.125-.5.188-.988Q20 12.525 20 12t-.062-1.012q-.063-.488-.188-.988h-3.4q.075.5.112.988.038.487.038 1.012t-.038 1.012q-.037.488-.112.988Zm-.4-6h2.95q-.725-1.25-1.813-2.175Q16 4.9 14.6 4.45q.45.825.788 1.712.337.888.562 1.838ZM10.1 8h3.8q-.3-1.1-.775-2.075Q12.65 4.95 12 4.05q-.65.9-1.125 1.875T10.1 8Zm-5 0h2.95q.225-.95.563-1.838.337-.887.787-1.712Q8 4.9 6.912 5.825 5.825 6.75 5.1 8Z"/>';
      const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('class','icon-arrow');arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<path fill="currentColor" d="m12 15-5-5h10Z"/>';button.setAttribute('aria-label','Language: '+(selected?.name || 'English'));button.append(globe,name,arrow);
      const list=document.createElement('div');list.className='language-options';list.hidden=true;
      for(const language of languages) {
        const option=document.createElement('button');option.type='button';option.dataset.noTranslate='';option.setAttribute('aria-pressed',String(language.code===code));

        option.append(document.createTextNode(language.name));option.addEventListener('click',()=>setLanguage(language.code));list.append(option);
      }
      button.addEventListener('click',()=>{list.hidden=!list.hidden;button.setAttribute('aria-expanded',String(!list.hidden));});
      root.append(button,list);
    });
  }
  const extraCatalog=fetch('/resources/assets/lang/extra.json?v=2').then(r=>r.ok?r.json():{}).catch(()=>({}));
  async function setLanguage(value,persist=true) {
    const selected=languages.find(item=>item.code===value || item.code.split('-')[0]===value) || {code:'en-US'};
    const request=++generation;
    const next=await fetch(`/resources/assets/lang/json/${selected.code}.json`).then(response=>{if(!response.ok)throw Error('Language could not be loaded');return response.json();});
    if(request!==generation)return;
    const extra=await extraCatalog;
    catalog=Object.assign({},extra[selected.code]||{},next);code=selected.code;
    if(persist){
      localStorage.setItem('zpassLanguage',code);
      if(pathLanguage()){
        const parts=location.pathname.split('/').filter(Boolean);parts[0]=code.split('-')[0];
        history.replaceState(null,'','/'+parts.join('/')+'/'+location.search+location.hash);
      }
    }
    document.documentElement.lang=next.$culture || code;
    document.documentElement.dir=next.$direction || (['ar','fa','he','ur'].includes(code.split('-')[0]) ? 'rtl' : 'ltr');
    const legacy=document.getElementById('webLanguage');if(legacy)legacy.value=code;
    buildPickers();translate();window.dispatchEvent(new CustomEvent('zpass:languagechange'));
  }
  const ready=Promise.all([fetch('/resources/assets/lang/languages.json').then(r=>r.json()),fetch('/resources/assets/lang/web-aliases.json').then(r=>r.json())]).then(async([options,map])=>{languages=options;aliases=map;const routed=pathLanguage();await setLanguage(routed || localStorage.getItem('zpassLanguage') || 'en-US',Boolean(routed));});
  window.ZPassI18n={ready,setLanguage,getLanguage:()=>code,getSavedLanguage:()=>localStorage.getItem('zpassLanguage') || 'en-US',get,t:(_tr,en)=>get(en),translate};
  let scheduled=false;
  new MutationObserver(changes=>{
    if(scheduled || !changes.some(change=>change.type==='characterData' || change.addedNodes.length))return;
    scheduled=true;requestAnimationFrame(()=>{scheduled=false;translate();});
  }).observe(document.body,{childList:true,characterData:true,subtree:true});
  document.addEventListener('click',event=>{document.querySelectorAll('[data-language-picker]').forEach(root=>{if(!root.contains(event.target)){const list=root.querySelector('.language-options');if(list)list.hidden=true;root.querySelector('button')?.setAttribute('aria-expanded','false');}});});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.language-options').forEach(list=>list.hidden=true);});
})();
