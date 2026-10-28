const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('C:/Users/rezan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../public');
const fixture='<!doctype html><html><body><div data-language-picker></div><p>Sign in</p><script src="/js/desktop-i18n.js"></script></body></html>';
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+pathname);
  if(pathname.startsWith('/js/') || pathname.startsWith('/resources/')){
    if(!file.startsWith(root+path.sep) || !fs.existsSync(file)){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',file.endsWith('.json')?'application/json':file.endsWith('.js')?'text/javascript':'image/png');
    return res.end(fs.readFileSync(file));
  }
  res.setHeader('Content-Type','text/html');res.end(fixture);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    for(const [route,code,dir] of [['en','en-US','ltr'],['tr','tr-TR','ltr'],['ar','ar-AR','rtl'],['ku','ku-KU','ltr']]){
      await page.goto(origin+'/'+route+'/');await page.evaluate(()=>ZPassI18n.ready);
      assert.equal(await page.evaluate(()=>ZPassI18n.getLanguage()),code);
      assert.equal(await page.locator('html').getAttribute('dir'),dir);
      assert.equal(await page.evaluate(()=>localStorage.getItem('zpassLanguage')),code);
    }
    await page.evaluate(()=>ZPassI18n.setLanguage('tr-TR'));
    assert.equal(new URL(page.url()).pathname,'/tr/');
    await page.goto(origin+'/checkout.html');await page.evaluate(()=>ZPassI18n.ready);
    assert.equal(await page.evaluate(()=>ZPassI18n.getLanguage()),'tr-TR');
    const tr=JSON.parse(fs.readFileSync(path.join(root,'resources/assets/lang/json/tr-TR.json'),'utf8'));
    assert.equal(await page.locator('p').textContent(),tr['Sign in']);
    console.log('PASS: language paths override stored language; Arabic RTL; picker updates path; checkout preserves language.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
