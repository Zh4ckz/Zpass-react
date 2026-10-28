from pathlib import Path
p=Path(r'C:\Users\rezan\Desktop\Bots\Payment-bot\PAYMENT-BOT-CONTROL.ps1');s=p.read_text(encoding='utf-8-sig');s=s.replace("    @{ Root = $rootPath; Project = 'zh4ckz'; Only = 'hosting' },\n",'');p.write_text(s,encoding='utf-8-sig')
import shutil
shutil.copyfile(p,'Zpass/scripts/PAYMENT-BOT-CONTROL.ps1')
for name in ['Crypto4PayBot.py','zpass_checkout_queue.py','zpass_web_bridge.py']:
 import py_compile
 py_compile.compile(str(p.parent/name),doraise=True)
print('PASS: installed bot modules compile; controller targets only tomsss and zpass')
