"""Copy owned desktop assets and complete language catalogs to the existing website."""
from pathlib import Path
import json, shutil
root = Path(__file__).resolve().parents[2]
source = root/'ZPass-Modern/resources/assets'
target = root/'Zpass/public/resources/assets'
for folder in ('app-logo', 'lang/json', 'lang/flag', 'icons/ui', 'icons/brands'):
    shutil.copytree(source/folder, target/folder, dirs_exist_ok=True)
catalogs = source/'lang/json'
baseline=json.loads((catalogs/'en-US.json').read_text(encoding='utf-8-sig'))
languages=[]
for path in sorted(catalogs.glob('*.json'),key=lambda p:(p.stem!='en-US',p.stem)):
    data=json.loads(path.read_text(encoding='utf-8-sig'))
    assert baseline.keys() <= data.keys(), f'Incomplete language: {path.stem}'
    assert (source/'lang/flag'/f'{path.stem}.png').is_file(), f'Missing flag: {path.stem}'
    languages.append({'code':path.stem,'name':data.get('$name',path.stem)})
(target/'lang/languages.json').write_text(json.dumps(languages,ensure_ascii=False,indent=2),encoding='utf-8')
icons={path.stem.lower():path.name for path in (target/'icons/brands').iterdir() if path.suffix.lower() in ('.png','.svg','.webp')}
(target/'icons/brands/index.json').write_text(json.dumps(icons,ensure_ascii=False),encoding='utf-8')
print(f'{len(languages)} complete languages, flags, application branding and icons synchronized.')
