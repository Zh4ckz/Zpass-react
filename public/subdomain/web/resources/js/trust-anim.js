(function(){var s=document.getElementById('trust');if(!s)return;var n=s.querySelector('[data-count]');
function count(){var t=+n.dataset.count,st=performance.now();(function f(now){var p=Math.min(1,(now-st)/1800),e=1-Math.pow(1-p,3);n.textContent=Math.round(t*e).toLocaleString('en-US')+(p<1?'':'+');if(p<1)requestAnimationFrame(f)})(st)}
function go(){s.classList.add('in');if(n)count()}
if(!('IntersectionObserver'in window))return go();
var o=new IntersectionObserver(function(e){if(e[0].isIntersecting){go();o.disconnect()}},{threshold:.25});o.observe(s)})();