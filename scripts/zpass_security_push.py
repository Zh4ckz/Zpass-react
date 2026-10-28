"""Local Firebase security notification worker. Never includes vault secrets."""
import asyncio
import sqlite3
from contextlib import closing
import time
from pathlib import Path
from firebase_admin import messaging


def valid_request(data, now):
    if data.get('status') != 'pending' or data.get('purpose', 'LOGIN') not in ('LOGIN', 'CARD_VIEW'):
        return False
    code = data.get('displayCode', '')
    codes = str(data.get('candidateCodes', '')).split(',')
    created = data.get('createdAt')
    if not created or not hasattr(created, 'timestamp'):
        return False
    expires = data.get('expiresAt')
    deadline = min(expires.timestamp(),created.timestamp()+60) if expires and hasattr(expires, 'timestamp') else created.timestamp() + 60
    return isinstance(code, str) and len(code) == 2 and code.isascii() and code.isdigit() and code in codes and len(set(codes)) == 3 and all(len(c)==2 and c.isascii() and c.isdigit() for c in codes) and deadline > now and created.timestamp() <= now + 5 and bool(data.get('uid'))


def deliver(db, state_path):
    now = time.time()
    with closing(sqlite3.connect(state_path)) as state, state:
        state.execute('CREATE TABLE IF NOT EXISTS sent (id TEXT PRIMARY KEY, created REAL NOT NULL)')
        state.execute('DELETE FROM sent WHERE created < ?', (now - 86400,))
        # A short, bounded query avoids repeatedly scanning historical requests.
        from google.cloud.firestore_v1.base_query import FieldFilter
        docs = db.collection('loginRequests').where(filter=FieldFilter('status', '==', 'pending')).limit(100).stream()
        for doc in docs:
            data = doc.to_dict() or {}
            if not valid_request(data, now) or state.execute('SELECT 1 FROM sent WHERE id=?', (doc.id,)).fetchone():
                continue
            profile = db.collection('users').document(data['uid']).get().to_dict() or {}
            tokens = profile.get('fcmTokens') or []
            if not isinstance(tokens, list):
                continue
            tokens = list(dict.fromkeys(t for t in tokens if isinstance(t, str) and 0 < len(t) < 4096))[:500]
            if not tokens:
                continue
            device = str(data.get('deviceLabel', 'Unknown device'))[:100]
            location = str(data.get('locationLabel', 'Location unavailable'))[:120]
            title = 'Z Pass · Card access' if data.get('purpose') == 'CARD_VIEW' else 'Z Pass · Sign-in request'
            body = 'Tap to review this request in Z Pass.'
            created = data['createdAt'].timestamp()
            expires = data.get('expiresAt')
            deadline = min(expires.timestamp(),created+60) if expires and hasattr(expires,'timestamp') else created+60
            remaining = max(1,int(deadline-time.time()))
            if deadline <= time.time():
                continue
            result = messaging.send_each_for_multicast(messaging.MulticastMessage(tokens=tokens, data={
                'title': title, 'body': body, 'requestId': doc.id, 'uid': data['uid'],
                'expiresAtMillis':str(int(deadline*1000)), 'purpose': data.get('purpose', 'LOGIN')}, android=messaging.AndroidConfig(priority='high', ttl=__import__('datetime').timedelta(seconds=remaining))))
            if result.success_count:
                state.execute('INSERT OR IGNORE INTO sent VALUES (?,?)', (doc.id, now))


async def watch_security_requests(g):
    path = Path(__file__).resolve().parent / 'data' / 'security-notifications.db'
    path.parent.mkdir(exist_ok=True)
    while True:
        try:
            if g.get('firestore_db'):
                await asyncio.to_thread(deliver, g['firestore_db'], path)
        except Exception:
            # Keep credentials and notification payloads out of logs.
            print('Security notification delivery unavailable; retrying.')
        await asyncio.sleep(3)
