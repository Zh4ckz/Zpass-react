from pathlib import Path
import re,json
worker=Path('cloudflare/payment-worker')
for p in (worker/'src').rglob('*.js'):
 text=p.read_text(encoding='utf-8');assert not re.search(r'(?:sk_live_|whsec_)[A-Za-z0-9]{16,}',text),p
for p in Path('out-pay').rglob('*'):
 if p.is_file():assert not re.search(rb'(?:sk_live_|whsec_)[A-Za-z0-9]{16,}',p.read_bytes()),p
routing=json.loads(Path('out/resources/data/pay-backend.json').read_text())
assert routing['runtime']=='cloudflare-worker'
assert routing['url']=='https://passgram-pay-api.rezanhassoun.workers.dev'
assert json.loads(Path('out-pay/resources/data/pay-backend.json').read_text())==routing
print('Production artifacts verified: permanent Cloudflare routing in both sites; no private Stripe keys embedded in Worker source or browser assets.')
