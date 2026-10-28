import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addRange,HOLD_MS,installHoldSelection} from '../public/js/hold-selection.mjs';
test('long press requires 1.8 seconds',()=>assert.equal(HOLD_MS,1800));
test('fast drag fills skipped rows and retains earlier selection on reverse',()=>{
  const ids=['a','b','c','d','e','f']; const selected=new Set(['f']);
  addRange(selected,ids,0,4); assert.deepEqual([...selected].sort(),ids);
  addRange(selected,ids,4,2); assert.equal(selected.size,6);
});
test('invalid hit does not alter selection',()=>{
  const selected=new Set(['a']); addRange(selected,['a','b'],-1,1); assert.deepEqual([...selected],['a']);
});
test('controller starts on hold, fills skipped rows, retains after release and cancels',t=>{
  const handlers = new Map(), globalHandlers = new Map();
  let pending, duration, hit;
  const classes=()=>({toggle(){},add(){},remove(){}});
  const rows=Array.from({length:6},(_,i)=>({dataset:{recordId:String(i)},classList:classes(),setAttribute(){},closest(){return this;}}));
  const list={querySelectorAll:()=>rows,classList:classes(),addEventListener:(name,fn)=>handlers.set(name,fn),contains:row=>rows.includes(row),getBoundingClientRect:()=>({left:0,right:300,top:0,bottom:600}),setPointerCapture(){},hasPointerCapture:()=>false};
  const previous={window:globalThis.window,document:globalThis.document,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
  Object.assign(globalThis,{window:{addEventListener:(name,fn)=>globalHandlers.set(name,fn)},document:{addEventListener(){},elementFromPoint:()=>hit},innerWidth:800,innerHeight:600,requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
  t.after(()=>Object.assign(globalThis,previous));
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{pending=fn;duration=ms;return 1;});
  t.mock.method(globalThis,'clearTimeout',()=>{});
  const controller=installHoldSelection(list);
  const event={button:0,pointerId:1,clientX:40,clientY:40,target:{closest:selector=>selector==='[data-record-id]'?rows[0]:null},preventDefault(){}};
  handlers.get('pointerdown')(event);
  assert.equal(duration,1800); assert.equal(controller.selected.size,0);
  pending(); assert.deepEqual([...controller.selected],['0']);
  hit=rows[5]; handlers.get('pointermove')({...event,clientY:550});
  assert.equal(controller.selected.size,6);
  globalHandlers.get('pointerup')(); assert.equal(controller.selected.size,6);
  controller.clear(); assert.equal(controller.selected.size,0);
});
