(function(){
function conv(root){
  (root.querySelectorAll?root.querySelectorAll('a[href]'):[]).forEach(function(a){
    if(a.hasAttribute('download'))return;
    var h=a.getAttribute('href');
    if(!h||/^javascript:/i.test(h))return;
    a.setAttribute('data-href',h);
    if(a.target)a.setAttribute('data-target',a.target);
    a.removeAttribute('href');
    a.setAttribute('role','link');
    a.tabIndex=0;
    a.style.cursor='pointer';
  });
}
function go(a){
  var h=a.getAttribute('data-href');
  if(h.charAt(0)==='#'){
    var el=h.length>1&&document.querySelector(h);
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});else scrollTo({top:0,behavior:'smooth'});
    return;
  }
  if(a.getAttribute('data-target')==='_blank'||/^https?:\/\//i.test(h)&&new URL(h,location.href).origin!==location.origin)window.open(h,'_blank','noopener');
  else location.href=h;
}
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[data-href]');
  if(!a||e.defaultPrevented)return;
  e.preventDefault();go(a);
});
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter')return;
  var a=e.target.closest&&e.target.closest('a[data-href]');
  if(a){e.preventDefault();go(a)}
});
conv(document);
new MutationObserver(function(m){
  m.forEach(function(r){r.addedNodes.forEach(function(n){
    if(n.nodeType!==1)return;
    if(n.matches&&n.matches('a[href]'))conv({querySelectorAll:function(){return[n]}});
    conv(n);
  })});
}).observe(document.documentElement,{childList:true,subtree:true});
})();
