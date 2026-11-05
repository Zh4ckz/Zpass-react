from pathlib import Path
import re,json,functools,http.server,threading,urllib.request
root=Path('out'); missing={}; count=0
for p in root.rglob('*'):
 if not p.is_file() or p.suffix not in {'.html','.css','.js','.mjs'}:continue
 try:text=p.read_text(encoding='utf-8')
 except UnicodeError:continue
 for url in set(re.findall(r'/resources/[A-Za-z0-9_./%+@ -]+\.[A-Za-z0-9]+',text)):
  count+=1
  if not (root/url.lstrip('/')).is_file():missing.setdefault(url,[]).append(str(p))
print('Resource references checked:',count,'Missing:',len(missing))
Path('work/resource-path-audit.json').write_text(json.dumps(missing,indent=2))
print(json.dumps(missing)[:1000])
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory='out'));threading.Thread(target=server.serve_forever,daemon=True).start()
for path in ['/premium/','/about/pricing.html','/subdomain/web/','/subdomain/api/','/subdomain/docs/','/subdomain/bots/','/subdomain/core/','/subdomain/pay/','/resources/assets/ui/svg/cloud-fill-18.svg']:
 print(urllib.request.urlopen('http://127.0.0.1:'+str(server.server_port)+path).status,path)
server.shutdown()
