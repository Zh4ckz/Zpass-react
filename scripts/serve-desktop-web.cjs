const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.wasm':'application/wasm'};
http.createServer((req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=path.resolve(root,'.'+pathname);
    if(file!==root && !file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    if(fs.existsSync(file) && fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file) && !path.extname(file) && fs.existsSync(file+'.html'))file+='.html';
    if(!fs.existsSync(file)){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin'});
    fs.createReadStream(file).pipe(res);
  }catch {res.writeHead(400).end();}
}).listen(4178,'127.0.0.1',()=>process.stdout.write('Z Pass preview: http://localhost:4178\n'));
