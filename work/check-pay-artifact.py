from pathlib import Path
import json,re
root=Path('out-pay');allowed={'index.html','resources/css/pay-checkout.css','resources/js/pay-checkout.mjs','resources/data/pay-backend.json','resources/data/checkout-plans.json','resources/assets/app-logo/zpass.png'}
assert {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}==allowed
for p in root.rglob('*'):
 if p.is_file():assert not re.search(rb'(?:sk_live_|whsec_)[A-Za-z0-9]{10,}',p.read_bytes()),p
assert 'Payment successful!' not in (root/'index.html').read_text(encoding='utf-8')
assert 'pay.zpas.org' in Path('out/resources/js/pricing-page.mjs').read_text(encoding='utf-8')
assert 'https://pay.zpas.org' in Path('out/subscription.html').read_text(encoding='utf-8')
print('Artifact PASS: payment-only allowlist; no private Stripe keys; pricing and subscription links target pay.zpas.org; no fake success flow.')
