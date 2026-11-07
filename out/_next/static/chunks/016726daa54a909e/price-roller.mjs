// Animate only changed price digits; expose the complete amount to screen readers.
export function rollPrice(element,amount,format){
 const text=format(amount),previous=element.dataset.priceText,oldAmount=Number(element.dataset.priceAmount);
 if(previous===text)return;
 element.dataset.priceText=text;element.dataset.priceAmount=String(amount);
 element.setAttribute('aria-label',text);
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(previous===undefined||reduced){element.textContent=text;return;}
 const length=Math.max(previous.length,text.length),before=previous.padStart(length,' '),after=text.padStart(length,' '),direction=amount>=oldAmount?1:-1;
 const nodes=[];
 for(let index=0;index<length;index++){
  const cell=document.createElement('span');cell.className='pp-price-digit';cell.setAttribute('aria-hidden','true');
  const next=document.createElement('span');next.textContent=after[index]===' '?'\u00a0':after[index];cell.append(next);
  if(before[index]!==after[index]&&typeof next.animate==='function'){
   const old=document.createElement('span');old.textContent=before[index]===' '?'\u00a0':before[index];old.className='pp-price-old';cell.append(old);
   const timing={duration:380,delay:index*22,easing:'cubic-bezier(.2,.75,.25,1)',fill:'both'};
   next.animate([{transform:`translateY(${direction*110}%)`,opacity:0},{transform:'translateY(0)',opacity:1}],timing);
   old.animate([{transform:'translateY(0)',opacity:1},{transform:`translateY(${-direction*110}%)`,opacity:0}],timing).finished.then(()=>old.remove(),()=>old.remove());
  }
  nodes.push(cell);
 }
 element.replaceChildren(...nodes);
}
