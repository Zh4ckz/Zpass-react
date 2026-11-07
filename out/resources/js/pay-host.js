// All owned subdomains share canonical website and service navigation.
(() => {
 const host=location.hostname.toLowerCase(),path=location.pathname;
 const services=['api','docs','core','bots','web','pay','developers','login','cdn'];
 const serviceHosts=services.map(name=>name+'.zpas.org');
 if(!(['web.zpas.org','login.zpas.org'].includes(host)&&/^\/premium(?:\.html)?\/?$/.test(path))&&serviceHosts.includes(host)&&/^\/(?:apps|faq|legal|privacy|security|terms|support|about|premium|subscription)(?:\/|\.html|$)/.test(path)){
  let target=path.replace(/\.html$/,'');if(/^\/(privacy|security|terms)$/.test(target))target='/legal'+target;
  location.replace('https://zpas.org'+target+location.search+location.hash);return;
 }
 if(host!=='pay.zpas.org')return;
 document.title='Checkout — PassGram';
 if(['/','/index.html','/_next/static/chunks/e6dd7c91fbc053a6','/_next/static/chunks/e6dd7c91fbc053a6'].includes(path))return;
 const incoming=new URLSearchParams(location.search),query=new URLSearchParams(),plan=incoming.get('plan')?.toUpperCase(),billing=incoming.get('billing')?.toUpperCase();
 query.set('plan',['PLUS','PRO'].includes(plan)?plan:'PLUS');query.set('billing',['MONTHLY','YEARLY'].includes(billing)?billing:'MONTHLY');location.replace('https://pay.zpas.org/?'+query);
})();
