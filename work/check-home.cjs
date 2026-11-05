const fs = require('node:fs');
(async()=>{
 const pages=await (await fetch('http://127.0.0.1:9224/json')).json();
 const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let n=0;const pending=new Map();const errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 await call('Page.enable');await call('Runtime.enable');
 const evaluate=async(expression)=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 for(const width of [1440,390,768]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
  await call('Page.navigate',{url:'http://127.0.0.1:8765/'});
  await new Promise(r=>setTimeout(r,2300));
  const metrics=await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,ids:[...document.querySelectorAll('[id]')].map(e=>e.id),badImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),header:!!document.querySelector('.pg-glass-header')})`);
  if(metrics.scroll>width||metrics.badImages.length||!metrics.header||new Set(metrics.ids).size!==metrics.ids.length)throw Error(JSON.stringify(metrics));
  const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(`work/home-${width}.png`,Buffer.from(image.data,'base64'));
  await evaluate(`document.querySelector('.pg-glass-menu summary').click()`);
  if(!await evaluate(`document.querySelector('.pg-glass-menu').open`))throw Error('Menu did not open');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  if(await evaluate(`document.querySelector('.pg-glass-menu').open`))throw Error('Escape did not close menu');
  console.log(JSON.stringify({width,overflow:false,images:'loaded',menu:'passed'}));
 }
 await evaluate('window.scrollTo(0,1000)');await new Promise(r=>setTimeout(r,100));
 if(!await evaluate(`document.querySelector('.pg-glass-header').classList.contains('is-scrolled')`))throw Error('Header scroll state missing');
 if(errors.length)throw Error(JSON.stringify(errors));
 console.log('No runtime exceptions. Scroll header passed.');
 await call('Browser.close');
})().catch(e=>{console.error(e);process.exit(1)});

