from pathlib import Path
import ast
root=Path(r'C:\Users\rezan\Desktop\Bots\Payment-bot')
p=root/'Crypto4PayBot.py';s=p.read_text(encoding='utf-8')
if 'import zpass_support\n' not in s:s=s.replace('import zpass_web_bridge\n','import zpass_web_bridge\nimport zpass_support\n')
if 'support_handler = zpass_support.install(globals())' not in s:s=s.replace('zpass_web_bridge.install(globals())','zpass_web_bridge.install(globals())\nsupport_handler = zpass_support.install(globals())')
if 'server.router.add_post("/support/session"' not in s:
 s=s.replace('    server.router.add_post("/nowpayments-ipn", nowpayments_ipn_handler)','    for support_action in ("session", "message", "poll", "close"):\n        server.router.add_post("/support/" + support_action, support_handler)\n    server.router.add_post("/nowpayments-ipn", nowpayments_ipn_handler)')
ast.parse(s)
backup=p.with_name('Crypto4PayBot.before-support.py.bak')
if not backup.exists():backup.write_bytes(p.read_bytes())
module=Path('Zpass/scripts/zpass_support.py').read_text(encoding='utf-8');ast.parse(module)
(root/'zpass_support.py').write_text(module,encoding='utf-8')
p.write_text(s,encoding='utf-8')
print('Support routes and admin Telegram handlers installed. Credentials unchanged; bot not started.')
