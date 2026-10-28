import sys, types, importlib.util, sqlite3, re, datetime
from pathlib import Path
sys.modules['firebase_admin']=types.SimpleNamespace(messaging=types.SimpleNamespace())
spec=importlib.util.spec_from_file_location('push','Zpass/scripts/zpass_security_push.py');push=importlib.util.module_from_spec(spec);spec.loader.exec_module(push)
now=2000000000
base={'uid':'fixture-user','status':'pending','purpose':'CARD_VIEW','displayCode':'42','candidateCodes':'42,27,81','createdAt':datetime.datetime.fromtimestamp(now-1,datetime.timezone.utc)}
assert push.valid_request(base,now)
for changes in [{'createdAt':datetime.datetime.fromtimestamp(now-61,datetime.timezone.utc),'expiresAt':datetime.datetime.fromtimestamp(now+600,datetime.timezone.utc)},{'status':'approved'},{'status':'denied'},{'purpose':'OTHER'},{'displayCode':'99'},{'candidateCodes':'42,42,81'},{'uid':''},{'createdAt':datetime.datetime.fromtimestamp(now-61,datetime.timezone.utc)},{'expiresAt':datetime.datetime.fromtimestamp(now-1,datetime.timezone.utc)}]:
 assert not push.valid_request(dict(base,**changes),now),changes
assert push.valid_request(dict(base,purpose='LOGIN'),now)
print('PASS: request expiry, invalid codes, purpose validation and completed requests rejected')
root=Path(r'C:\Users\rezan\AndroidStudioProjects\ZPassManager\app\src\main\java\com\zpass')
s=(root/'data/AppDatabase.kt').read_text();block=s.split('private val MIGRATION_17_18',1)[1].split('fun getDatabase',1)[0]
statements=re.findall(r'db.execSQL\("([^"\n]+)"\)',block)
with sqlite3.connect(':memory:') as db:
 db.execute('CREATE TABLE payment_cards(id INTEGER PRIMARY KEY,userId INTEGER,encryptedNumber TEXT)')
 db.execute('CREATE TABLE personal_info(userId INTEGER PRIMARY KEY,encryptedFirstName TEXT)')
 db.execute("INSERT INTO payment_cards VALUES(1,1,'fixture-cipher')")
 db.execute("INSERT INTO personal_info VALUES(1,'fixture-name-cipher')")
 for sql in statements:db.execute(sql)
 assert db.execute('SELECT encryptedNumber,cloudDirty,cloudDeleted FROM payment_cards').fetchone()==('fixture-cipher',1,0)
 assert db.execute('SELECT encryptedFirstName,cloudDirty FROM personal_info').fetchone()==('fixture-name-cipher',1)
 db.execute('UPDATE payment_cards SET cloudModifiedAt=20 WHERE id=1')
 db.execute('UPDATE payment_cards SET cloudDirty=0 WHERE id=1 AND cloudModifiedAt=10')
 assert db.execute('SELECT cloudDirty FROM payment_cards').fetchone()[0]==1
 db.execute('UPDATE payment_cards SET cloudDirty=0 WHERE id=1 AND cloudModifiedAt=20')
 assert db.execute('SELECT cloudDirty FROM payment_cards').fetchone()[0]==0
print('PASS: schema 17 to 18 preserves encrypted data; stale cloud acknowledgement cannot clear a newer local edit')

# Test the actual FCM payload without network or user notifications.
import tempfile
sent=[]
class Message:
 def __init__(self,**kw):self.__dict__.update(kw)
push.messaging=types.SimpleNamespace(MulticastMessage=Message,AndroidConfig=Message,send_each_for_multicast=lambda message:(sent.append(message) or types.SimpleNamespace(success_count=1)))
sys.modules['google.cloud.firestore_v1.base_query']=types.SimpleNamespace(FieldFilter=lambda *a:a)
class Document:
 id='fixture-request'
 def to_dict(self):return dict(base)
class Profile:
 def to_dict(self):return {'fcmTokens':['fixture-token']}
class Collection:
 def __init__(self,name):self.name=name
 def where(self,**kw):return self
 def limit(self,n):return self
 def stream(self):return [Document()]
 def document(self,uid):return self
 def get(self):return Profile()
class Database:
 def collection(self,name):return Collection(name)
push.time=types.SimpleNamespace(time=lambda:now)
with tempfile.TemporaryDirectory() as directory:
 state=Path(directory)/'state.db'
 push.deliver(Database(),state);push.deliver(Database(),state)
assert len(sent)==1,'Duplicate notification'
assert 'displayCode' not in sent[0].data and 'candidateCodes' not in sent[0].data
assert sent[0].data['expiresAtMillis']==str((now+59)*1000)
assert sent[0].android.ttl.total_seconds()==59
print('PASS: FCM sends no code, uses remaining lifetime and deduplicates notifications')
