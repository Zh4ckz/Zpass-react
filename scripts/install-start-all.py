from pathlib import Path
import shutil
r=Path(r'C:\Users\rezan\Desktop\Bots')
p=r/'START-ALL-BOTS.bat'
backup=r/'START-ALL-BOTS.before-firebase.bat'
if p.exists() and not backup.exists():shutil.copyfile(p,backup)
for name in ['START-ALL-BOTS.ps1','START-ALL-BOTS.bat']:shutil.copyfile(Path('Zpass/scripts')/name,r/name)
