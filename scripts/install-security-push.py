from pathlib import Path
import shutil
r=Path(r'C:\Users\rezan\Desktop\Bots\Payment-bot')
shutil.copyfile('Zpass/scripts/zpass_security_push.py',r/'zpass_security_push.py')
p=r/'Crypto4PayBot.py';s=p.read_text(encoding='utf-8')
if 'import zpass_security_push' not in s:s=s.replace('import zpass_support','import zpass_support\nimport zpass_security_push')
if 'create_task(zpass_security_push' not in s:s=s.replace('    asyncio.create_task(zpass_web_bridge.watch_new_users(globals()))','    asyncio.create_task(zpass_web_bridge.watch_new_users(globals()))\n    asyncio.create_task(zpass_security_push.watch_security_requests(globals()))')
p.write_text(s,encoding='utf-8')
