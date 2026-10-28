from pathlib import Path
import colorsys,re
root=Path('Zpass/public')
paths=[root/'css/landing.css',root/'css/auth.css',root/'css/login-modal.css',root/'css/desktop-vault.css',root/'checkout.html',root/'subscription.html']+list((root/'resources/assets/icons/modern').glob('*.svg'))
pattern=re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b')
for p in paths:
 s=p.read_text(encoding='utf-8');count=[0]
 def blue(m):
  raw=m.group()[1:];raw=''.join(c*2 for c in raw) if len(raw) in (3,4) else raw
  rgb=tuple(int(raw[i:i+2],16)/255 for i in (0,2,4));h,l,sat=colorsys.rgb_to_hls(*rgb)
  if 240<=h*360<=325 and sat>.07:
   values=colorsys.hls_to_rgb(217/360,l,sat)
   count[0]+=1
   return '#'+''.join(f'{round(v*255):02x}' for v in values)+raw[6:]
  return m.group()
 s=pattern.sub(blue,s).replace('--purple','--brand')
 if p.name=='checkout.html':s=s.replace('#0088CC','#2878E8')
 p.write_text(s,encoding='utf-8');print(p.name, count[0])
# Force fresh styles in browsers with existing cached auth/landing pages.
for p in [root/'index.html',root/'apps.html',root/'dashboard.html']:
 s=p.read_text(encoding='utf-8')
 for name in ['landing.css','auth.css','login-modal.css']:
  s=re.sub(re.escape(name)+r'\?v=\d+',name+'?v=3',s)
 p.write_text(s,encoding='utf-8')
