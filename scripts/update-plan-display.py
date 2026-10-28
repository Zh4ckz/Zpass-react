from pathlib import Path
import json,re
root=Path('Zpass/public')
for p in [root/'index.html',root/'dashboard.html',root/'checkout.html',root/'subscription.html',root/'js/landing.mjs',root/'js/payment-plans.mjs',root/'js/app.js']:
 s=p.read_text(encoding='utf-8').replace('Z Pass Pro','Z Pass Plus').replace('Upgrade to Pro','Upgrade to Plus')
 if p.name=='dashboard.html':
  s=re.sub(r'      <div class="plan-audience-toggle.*?</div>\s*','',s,count=1,flags=re.S)
  s=re.sub(r'      <div id="businessPlans".*?(?=      <p class="pricing-disclaimer">)','',s,count=1,flags=re.S)
 p.write_text(s,encoding='utf-8')
texts={
'en-US':('Choose Plus','Plus features for every member','Planned: optional sharing, family admin panel, member management and permissions'),
'tr-TR':('Plus seç','Her üyeye Plus özellikleri','Planlanan: isteğe bağlı paylaşım, aile yönetici paneli, üye yönetimi ve yetkilendirme'),
'de-DE':('Plus wählen','Plus-Funktionen für jedes Mitglied','Geplant: optionales Teilen, Familienverwaltung, Mitgliederverwaltung und Berechtigungen'),
'fr-FR':('Choisir Plus','Les fonctions Plus pour chaque membre','Prévu : partage facultatif, administration familiale, gestion des membres et autorisations'),
'es-ES':('Elegir Plus','Funciones Plus para cada miembro','Previsto: uso compartido opcional, panel familiar, gestión de miembros y permisos'),
'es-419':('Elegir Plus','Funciones Plus para cada miembro','Previsto: uso compartido opcional, panel familiar, gestión de miembros y permisos'),
'pt-BR':('Escolher Plus','Recursos Plus para cada membro','Planejado: compartilhamento opcional, painel familiar, gestão de membros e permissões'),
'it-IT':('Scegli Plus','Funzioni Plus per ogni membro','In programma: condivisione facoltativa, pannello famiglia, gestione membri e autorizzazioni'),
'ar-AR':('اختيار Plus','مزايا Plus لكل عضو','مخطط: مشاركة اختيارية ولوحة إدارة العائلة وإدارة الأعضاء والصلاحيات'),
'hi-IN':('Plus चुनें','हर सदस्य के लिए Plus सुविधाएँ','नियोजित: वैकल्पिक साझाकरण, परिवार व्यवस्थापक पैनल, सदस्य प्रबंधन और अनुमतियाँ'),
'id-ID':('Pilih Plus','Fitur Plus untuk setiap anggota','Direncanakan: berbagi opsional, panel admin keluarga, pengelolaan anggota dan izin'),
'ja-JP':('Plusを選択','各メンバーにPlusの機能','予定：任意の共有、家族管理パネル、メンバー管理と権限設定'),
'ko-KR':('Plus 선택','모든 구성원을 위한 Plus 기능','예정: 선택적 공유, 가족 관리자 패널, 구성원 관리 및 권한 설정'),
'ku-KU':('Plus hilbijêre','Taybetmendiyên Plus ji bo her endamî','Plankirî: parvekirina bijartî, panela rêveberiya malbatê, rêveberiya endaman û destûr')}
for p in (root/'resources/assets/lang/marketing').glob('*.json'):
 d=json.loads(p.read_text(encoding='utf-8')); a,b,c=texts[p.stem]
 d['choosePro']=a;d['proFeatures']=b;d['familyAccess']=c
 d['six']=d.get('six','').replace('6','5').replace('٦','٥')
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=root/'index.html';s=p.read_text(encoding='utf-8').replace('Choose Pro','Choose Plus').replace('Pro features for every member','Plus features for every member').replace('One family subscription','Planned: optional sharing, family admin panel, member management and permissions');p.write_text(s,encoding='utf-8')
print('Free / Plus / Family only; backend PRO identifiers retained for subscription compatibility.')
