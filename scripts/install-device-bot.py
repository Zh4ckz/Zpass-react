from pathlib import Path
import ast, shutil
source = Path(__file__).parent / 'zpass_device_context.py'
root = Path('C:/Users/rezan/Desktop/Bots/Payment-bot')
main = root / 'Crypto4PayBot.py'
text = main.read_text('utf-8-sig')
if 'zpass_device_context.install(globals())' not in text:
    anchor = 'zpass_web_bridge.install(globals())'
    if anchor not in text: raise RuntimeError('Bot installation anchor missing')
    text = text.replace(anchor, 'import zpass_device_context\nzpass_device_context.install(globals())\n'+anchor,1)
ast.parse(text); ast.parse(source.read_text('utf-8'))
shutil.copyfile(source,root / source.name)
main.write_text(text,'utf-8')
print('Private admin-only /devices command installed; bot not started and no messages sent.')
