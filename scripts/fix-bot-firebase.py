from pathlib import Path
import json
p=Path(r'C:\Users\rezan\Desktop\Bots\Payment-bot')
key=p/'web'/'firebase-service-account-tomsss.json'
data=json.loads(key.read_text())
assert data.get('type')=='service_account' and data.get('project_id')=='tomsss'
s=(p/'Crypto4PayBot.py').read_text(encoding='utf-8')
s=s.replace('_local_service_account = os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase-service-account.json")','_local_service_account = os.path.join(BASE_DIR, "web", "firebase-service-account-tomsss.json")')
compile(s,'Crypto4PayBot.py','exec')
(p/'Crypto4PayBot.py').write_text(s,encoding='utf-8')
print('Firebase fallback now uses existing tomsss Admin key in web subdirectory; no key copied or printed.')
