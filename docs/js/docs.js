document.querySelectorAll('.tabs').forEach(t=>{const b=[...t.querySelectorAll('.tabbar button:not(.copy)')],p=[...t.querySelectorAll('pre')];
 b.forEach((x,i)=>x.onclick=()=>{b.forEach(y=>y.classList.remove('on'));p.forEach(y=>y.classList.remove('on'));x.classList.add('on');p[i].classList.add('on')});
 const c=t.querySelector('.copy');c&&(c.onclick=()=>{navigator.clipboard.writeText(t.querySelector('pre.on').innerText);c.textContent='Copied';setTimeout(()=>c.textContent='Copy',1200)})});
const links=[...document.querySelectorAll('.side a')],secs=links.map(a=>document.querySelector(a.getAttribute('href')));
const io=new IntersectionObserver(e=>e.forEach(en=>{if(en.isIntersecting){links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='#'+en.target.id))}}),{rootMargin:'-20% 0px -70% 0px'});
secs.forEach(s=>s&&io.observe(s));
links.forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('open')));
