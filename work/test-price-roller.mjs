import assert from 'node:assert/strict';
import {rollPrice} from '../public/resources/js/price-roller.mjs';
const animations=[];
class Element{constructor(){this.dataset={};this.children=[];this.attributes={};}setAttribute(k,v){this.attributes[k]=v}append(node){this.children.push(node)}replaceChildren(...nodes){this.children=nodes}animate(frames,options){animations.push({frames,options});return{finished:Promise.resolve()}}remove(){}}
globalThis.document={createElement:()=>new Element()};
const price=new Element(),format=n=>'$'+n.toFixed(2);
rollPrice(price,9,format);assert.equal(price.textContent,'$9.00');assert.equal(animations.length,0);
rollPrice(price,7.5,format);assert(animations.some(a=>a.frames[0].transform==='translateY(-110%)'));assert.equal(price.attributes['aria-label'],'$7.50');
animations.length=0;rollPrice(price,9,format);assert(animations.some(a=>a.frames[0].transform==='translateY(110%)'));
animations.length=0;rollPrice(price,9,format);assert.equal(animations.length,0);
globalThis.matchMedia=()=>({matches:true});rollPrice(price,7.5,format);assert.equal(price.textContent,'$7.50');assert.equal(animations.length,0);
console.log('PASS: prices roll down/up, unchanged values stay still, reduced motion skips animation, accessible amount stays correct.');
