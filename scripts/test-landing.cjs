const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {pathToFileURL}=require('url');
const {chromium}=require('C:/Users/rezan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../public'),output=path.resolve(__dirname,'../verification');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
  const tools=await import(pathToFileURL(path.join(root,'js/password-tools.mjs'))),nav=await import(pathToFileURL(path.join(root,'js/navigation.mjs')));
  assert.equal(tools.assessPassword('Ahmet1990!','Ahmet Ali').level,1);assert.equal(tools.assessPassword('123456789').level,1);
  const generated=new Set();for(let i=0;i<300;i++){const value=tools.generatePassword(24);assert.equal(value.length,24);assert(/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/\d/.test(value)&&/[!@#$%&*+\-=?]/.test(value));generated.add(value);}assert.equal(generated.size,300);
  assert.equal(tools.generatePassword(20,'phrase').split('-').length,9);assert(tools.generatePassword(20,'personal','Ahmet Ali').startsWith('AhmetAli-'));
  assert.equal(nav.safeCheckout('https://evil.example/checkout.html','https://zpass.example'),null);assert.equal(nav.safeCheckout('/checkout.html?plan=INVALID','https://zpass.example'),null);
  const memory=new Map(),storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};nav.queueCheckout('FAMILY','YEARLY',storage);assert.equal(nav.takeCheckout(storage,'https://zpass.example'),'/checkout.html?product=zpass&plan=FAMILY&billing=YEARLY');assert.equal(memory.size,0);
  console.log('PASS: local password evaluation, secure generator, personal suffix and safe one-time payment intent');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push({url:request.url(),method:request.method(),post:request.postData()}));page.on('response',response=>{if(response.status()===404)missing.push(response.url());});
  await page.route('https://**',route=>route.abort());
  await page.route('**/js/landing-auth.mjs?*',route=>{
    const source=fs.readFileSync(path.join(root,'js/landing-auth.mjs'),'utf8').replace(/^import \{[^}]+\} from 'https:[^\n]+\n/gm,'');
    route.fulfill({contentType:'text/javascript',body:"const initializeApp=()=>({}),getAuth=()=>({}),onAuthStateChanged=(_,callback)=>{window.__authCallback=callback;callback(null)};\n"+source});
  });
  await page.route('**/dashboard.html*',route=>route.fulfill({contentType:'text/html',body:'<h1>Test dashboard destination</h1>'}));
  await page.route('**/checkout.html*',route=>route.fulfill({contentType:'text/html',body:'<h1>Test checkout destination</h1>'}));
  await page.goto(base);await page.waitForFunction(()=>document.getElementById('generatedPassword').value.length>=20);
  await page.locator('#cookieAccept').click();assert.equal(await page.evaluate(()=>localStorage.getItem('zpassCookieChoice')),'accepted');
  await page.locator('#checkPassword').fill('Ahmet1990!');await page.locator('#personalHint').fill('Ahmet Ali');assert.equal(await page.locator('#strengthLabel').textContent(),'Weak');
  await page.locator('#generatorMode').selectOption('personal');await page.locator('#generatePassword').click();assert((await page.locator('#generatedPassword').inputValue()).startsWith('AhmetAli-'));
  assert(!requests.some(request=>request.method!=='GET' || (request.url+request.post).includes('Ahmet')),'Password input escaped browser');
  await page.locator('[data-billing=MONTHLY]').click();assert((await page.locator('[data-price=PRO]').textContent()).includes('$5.00'));
  await page.locator('[data-billing=YEARLY]').click();assert((await page.locator('[data-total=PRO]').textContent()).includes('$55.00'));
  const langs=JSON.parse(fs.readFileSync(path.join(root,'resources/assets/lang/languages.json'),'utf8'));const english=JSON.parse(fs.readFileSync(path.join(root,'resources/assets/lang/marketing/en-US.json'),'utf8'));
  for(const language of langs){
    const values=JSON.parse(fs.readFileSync(path.join(root,'resources/assets/lang/marketing',language.code+'.json'),'utf8'));assert.deepEqual(Object.keys(values).sort(),Object.keys(english).sort());assert(Object.values(values).every(value=>typeof value==='string'&&value.length));
    await page.evaluate(code=>window.ZPassI18n.setLanguage(code),language.code);await page.waitForFunction(expected=>document.querySelector('[data-m=hero1]').textContent===expected,values.hero1);
  }
  for(const [width,code] of [[1440,'en-US'],[390,'tr-TR'],[390,'ar-AR']]){
    await page.evaluate(code=>window.ZPassI18n.setLanguage(code),code);await page.waitForFunction(()=>document.querySelector('[data-m=hero1]').textContent!=='hero1');await page.setViewportSize({width,height:900});await page.waitForTimeout(150);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+width+' '+code);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,`landing-${width}-${code}.png`),fullPage:true});
  }
  await page.evaluate(()=>window.ZPassI18n.setLanguage('en-US'));await page.waitForFunction(()=>document.querySelector('[data-m=hero1]').textContent==='Your digital life.');
  console.log('PASS: all 13 full catalogs and PNG flags, local-only input, monthly/yearly checkout amounts, desktop/mobile/RTL layouts');
  await page.locator('[data-audience=family]').click();await page.locator('#subscribe').click();await page.waitForURL('**/dashboard.html#login');assert.equal(await page.evaluate(()=>sessionStorage.getItem('zpassAfterLogin')),'/checkout.html?product=zpass&plan=FAMILY&billing=YEARLY');
  await page.goto(base);await page.waitForFunction(()=>window.__authCallback);await page.evaluate(()=>window.__authCallback({uid:'test-user'}));await page.waitForURL('**/checkout.html?*');assert.equal(await page.evaluate(()=>sessionStorage.getItem('zpassAfterLogin')),null);
  await page.goto(base);await page.waitForFunction(()=>window.__authCallback);await page.evaluate(()=>window.__authCallback({uid:'test-user'}));await page.waitForURL('**/dashboard.html');
  await page.unroute('**/checkout.html*');
  await page.route('**/checkout.html?*',route=>{
    let source=fs.readFileSync(path.join(root,'checkout.html'),'utf8').replace(/^\s*import \{[^}]+\} from "https:[^\n]+\n/gm,'');
    source=source.replace('<script type="module">',`<script type="module">const initializeApp=()=>({}),getAuth=()=>({}),onAuthStateChanged=(_,callback)=>queueMicrotask(()=>callback({uid:'test-user',getIdToken:async()=>'fixture-token'}));`);
    route.fulfill({contentType:'text/html',body:source});
  });
  let paymentRequest=null;
  await page.route('**/api/checkout/create-stripe-session',route=>{paymentRequest=JSON.parse(route.request().postData());route.fulfill({contentType:'application/json',body:JSON.stringify({error:'Test response. No real payment.'})});});
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/checkout.html?plan=FAMILY&billing=YEARLY');await page.waitForFunction(()=>document.getElementById('summaryPrice').textContent==='$100.00');
  await page.locator('#checkoutBtn').click({timeout:5000});await page.waitForFunction(()=>document.getElementById('pmError').textContent.includes('No real payment'));assert.equal(paymentRequest.productId,'zpass_family_yearly');
  assert.equal(await page.locator('.cancel-link').getAttribute('href'),'/dashboard.html');
  await page.goto(base+'/apps.html');await page.waitForFunction(()=>document.querySelector('[data-m=everywhere]').textContent==='At home on every screen.');await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('PASS: selected plan survives login, single checkout redirect, returning authenticated visitor goes directly to dashboard; no errors or missing assets');
  console.log('PASS: actual checkout uses shared $100 Family yearly amount and correct authenticated payment product; cancel opens dashboard; modern apps page fits mobile');
  await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1);});
