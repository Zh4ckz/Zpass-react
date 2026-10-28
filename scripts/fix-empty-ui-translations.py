from pathlib import Path
import json
roots=[Path('C:/Users/rezan/Desktop/Web-Sites/Zpass/public/resources/assets/lang/json'),Path('C:/Users/rezan/source/repos/ZPassManager/ZPassManager/resources/assets/lang/json')]
fixes={'ja-JP':{'Open the':'次を開く：','The':'該当の'},'tr-TR':{'The':'İlgili'}}
for root in roots:
    for code, entries in fixes.items():
        p=root/(code+'.json'); data=json.loads(p.read_text('utf-8')); data.update(entries)
        p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf-8')
cache=Path(__file__).with_name('ui-translation-cache.json')
data=json.loads(cache.read_text('utf-8'))
for code,entries in fixes.items():
    for k,v in entries.items(): data[code.split('-')[0]+'\n'+k]=v
cache.write_text(json.dumps(data,ensure_ascii=False,indent=2),'utf-8')
print('Empty article translations corrected in Japanese and Turkish.')
