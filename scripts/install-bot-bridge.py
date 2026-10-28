from pathlib import Path
p=Path(r'C:\Users\rezan\Desktop\Bots\Payment-bot')
s=(p/'Crypto4PayBot.py').read_text(encoding='utf-8')
s=s.replace('import shop\n','import shop\nimport zpass_web_bridge\n')
s=s.replace('return await asyncio.to_thread(firebase_auth.verify_id_token, token)','return await asyncio.to_thread(firebase_auth.verify_id_token, token, check_revoked=True)')
s=s.replace('if not STRIPE_SECRET_KEY:\n            return web.json_response({"error": "Stripe is not configured"}', 'if not STRIPE_SECRET_KEY or not STRIPE_WEBHOOK_SECRET:\n            return web.json_response({"error": "Stripe webhook verification is not configured"}')
s=s.replace('if not expected or not hmac.compare_digest(expected, signature):','if not timestamp.isdigit() or abs(time.time() - int(timestamp)) > 300 or not expected or not hmac.compare_digest(expected, signature):')
needle='async def start_ipn_server():'
s=s.replace(needle,'zpass_web_bridge.install(globals())\n\n'+needle)
s=s.replace('    asyncio.create_task(shop_watcher())','    asyncio.create_task(zpass_web_bridge.watch_new_users(globals()))\n    asyncio.create_task(shop_watcher())')
s=s.replace('allowed = {"https://zh4ckz.web.app", "https://zpass.web.app"}','allowed = {"https://zh4ckz.web.app", "https://zpass.web.app", "http://localhost:4178", "http://127.0.0.1:4178"}')
compile(s,str(p/'Crypto4PayBot.py'),'exec')
backup=p/'Crypto4PayBot.before-zpass-web.py.bak'
if not backup.exists(): backup.write_bytes((p/'Crypto4PayBot.py').read_bytes())
(p/'Crypto4PayBot.py').write_text(s,encoding='utf-8')
(p/'zpass_web_bridge.py').write_bytes(Path('Zpass/scripts/zpass_web_bridge.py').read_bytes())
control=p/'PAYMENT-BOT-CONTROL.ps1'
c=control.read_text(encoding='utf-8-sig')
c=c.replace("@{ Root = (Join-Path (Split-Path -Parent $rootPath) 'Zpass');", "@{ Root = 'C:\\Users\\rezan\\Desktop\\Web-Sites\\Zpass';")
if not (p/'PAYMENT-BOT-CONTROL.before-zpass-web.ps1.bak').exists(): (p/'PAYMENT-BOT-CONTROL.before-zpass-web.ps1.bak').write_bytes(control.read_bytes())
control.write_text(c,encoding='utf-8-sig')
print('Bot integration installed; original files backed up; credentials unchanged.')
