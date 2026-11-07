import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Firestore } from '../src/firestore.js';

function fake(responses) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    const next = responses.shift() ?? {};
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status ?? 200 });
  };
  return { calls, db: new Firestore({ FIREBASE_PROJECT_ID: 'passgram-org' }, { fetcher, token: async () => 't' }) };
}
const BASE = 'https://firestore.googleapis.com/v1/projects/passgram-org/databases/(default)/documents';

test('get decodes fields and returns null for 404', async () => {
  const { db, calls } = fake([{ body: { fields: { name: { stringValue: 'A' }, n: { integerValue: '3' }, at: { timestampValue: '2026-01-01T00:00:00Z' } } } }, { status: 404, body: {} }]);
  const doc = await db.get('zp_bots/abc');
  assert.equal(doc.name, 'A'); assert.equal(doc.n, 3); assert.ok(doc.at instanceof Date);
  assert.equal(await db.get('zp_bots/missing'), null);
  assert.equal(calls[0].url, `${BASE}/zp_bots/abc`);
  await assert.rejects(() => db.get('zp_bots'), /Invalid path/);
  await assert.rejects(() => db.get('zp_bots/../x'), /Invalid path/);
});

test('subcollection query uses the parent document and builds filters', async () => {
  const { db, calls } = fake([{ body: [{ document: { name: 'projects/passgram-org/databases/(default)/documents/zp_bots/b1/updates/0001', fields: { update_id: { integerValue: '1' } } } }, { readTime: 'x' }] }]);
  const rows = await db.query('zp_bots/b1/updates', { where: [['update_id', '>=', 1]], orderBy: ['update_id', 'asc'], limit: 5 });
  assert.equal(calls[0].url, `${BASE}/zp_bots/b1:runQuery`);
  assert.equal(calls[0].body.structuredQuery.from[0].collectionId, 'updates');
  assert.equal(calls[0].body.structuredQuery.where.fieldFilter.op, 'GREATER_THAN_OR_EQUAL');
  assert.deepEqual(rows[0], { id: '0001', path: 'zp_bots/b1/updates/0001', data: { update_id: 1 } });
});

test('transaction commits create / update / delete with the right preconditions', async () => {
  const { db, calls } = fake([{ body: { transaction: 'T1' } }, { body: { fields: { count: { integerValue: '1' } } } }, { body: {} }]);
  await db.transaction(async (tx) => {
    await tx.get('zp_bot_owners/u1');
    tx.create('zp_bots/b1', { owner: 'u1' });
    tx.update('zp_bots/b2', { name: 'x' });
    tx.delete('chat_usernames/old');
  });
  assert.equal(calls[1].url, `${BASE}/zp_bot_owners/u1?transaction=T1`);
  const commit = calls[2];
  assert.equal(commit.url, `${BASE}:commit`);
  assert.equal(commit.body.transaction, 'T1');
  const [create, update, del] = commit.body.writes;
  assert.deepEqual(create.currentDocument, { exists: false });
  assert.deepEqual(update.updateMask, { fieldPaths: ['name'] });
  assert.equal(del.delete, 'projects/passgram-org/databases/(default)/documents/chat_usernames/old');
});

test('count reads the aggregation result', async () => {
  const { db, calls } = fake([{ body: [{ result: { aggregateFields: { n: { integerValue: '42' } } } }] }]);
  assert.equal(await db.count('zp_bots', [['disabled', '==', true]]), 42);
  assert.equal(calls[0].url, `${BASE}:runAggregationQuery`);
});
