from pathlib import Path
import json
root=Path('Zpass/public')
for p in [root/'index.html',root/'dashboard.html',root/'checkout.html']:
 s=p.read_text(encoding='utf-8')
 for a,b in [('Up to 6 family members','5 people total: 1 paying admin + 4 members'),('6 independent users','5 people: 1 paying admin + 4 members'),('6 Users','5 Users'),('6 users','5 users'),('<strong>6</strong>','<strong>5</strong>')]: s=s.replace(a,b)
 p.write_text(s,encoding='utf-8')
for folder in [root/'resources/assets/lang/marketing',root/'resources/assets/lang/json',Path('ZPass-Modern/resources/assets/lang/json')]:
 for p in folder.glob('*.json'):
  d=json.loads(p.read_text(encoding='utf-8'))
  if 'six' in d:
   d['six']=d['six'].replace('6','5').replace('٦','٥')
   if p.stem=='en-US': d['six']='5 people: 1 paying admin + 4 members'
   if p.stem=='tr-TR': d['six']='5 kişi: ödemeyi yapan 1 yönetici + 4 üye'
  if 'Family · share with 10' in d: d['Family · share with 10']=d['Family · share with 10'].replace('6','5').replace('٦','٥')
  p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=Path('Zpass/scripts/update-plan-display.py')
if p.exists():
 s=p.read_text(encoding='utf-8');s=s.replace("d['familyAccess']=c","d['familyAccess']=c\n d['six']=d.get('six','').replace('6','5').replace('٦','٥')")
 p.write_text(s,encoding='utf-8')
p=Path('Zh4ckz/functions/index.js');s=p.read_text(encoding='utf-8');s=s.replace('if (owner.status !== "ACTIVE" || owner.plan !== "FAMILY"', 'if (owner.familyOwnerUid || owner.status !== "ACTIVE" || owner.plan !== "FAMILY"')
s=s.replace('members.size >= 5','members.size >= 4').replace('Family is full (6 people including owner)','Family is full (5 people: 1 paying owner + 4 members)')
p.write_text(s,encoding='utf-8')
print('Web, native translations and server limit updated to 5 total / 4 invited members.')

