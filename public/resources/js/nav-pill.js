(function(){var n=document.querySelector('.landing-nav nav');if(!n)return;var p=document.createElement('i');p.className='zp-pill';n.prepend(p);
var links=[].slice.call(n.querySelectorAll('a')),lock=0,tm,cur=links[0];
function to(a){if(!a)return;cur=a;links.forEach(function(x){x.classList.toggle('on',x===a)});p.style.width=a.offsetWidth+'px';p.style.transform='translateX('+a.offsetLeft+'px)';p.style.opacity=1}
links.forEach(function(a){a.addEventListener('click',function(){to(a);lock=Date.now()+60000;clearTimeout(tm);tm=setTimeout(unlock,1000)})});
var secs=links.map(function(a){return document.querySelector(a.getAttribute('href'))});
function unlock(){lock=0}
function spy(){if(Date.now()<lock){clearTimeout(tm);tm=setTimeout(unlock,200);return}var y=innerHeight*.4,f=links[0],b=-1e9;secs.forEach(function(s,i){if(!s)return;var t=s.getBoundingClientRect().top;if(t<y&&t>b){b=t;f=links[i]}});if(f!==cur)to(f)}
addEventListener('scroll',spy,{passive:true});addEventListener('resize',function(){to(cur)});
to(links[0]);addEventListener('load',function(){to(cur)});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){to(cur)})})();