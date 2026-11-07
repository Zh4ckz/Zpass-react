// Firestore REST client for Workers (service-account OAuth through WebCrypto).
// Interface (also implemented by the in-memory test database):
//   get(path) · update(path, partial) · query(collection, {where, orderBy, limit}) · count(collection, where)
//   transaction(async tx => { tx.get · tx.create · tx.set · tx.update · tx.delete }) · deleteTree(docPath)
const utf8 = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const encodeJson = (value) => b64url(utf8.encode(JSON.stringify(value)));

let tokenCache;
export async function accessToken(env, fetcher = (...a) => globalThis.fetch(...a)) {
  if (tokenCache?.source === env.FIREBASE_SERVICE_ACCOUNT_JSON && tokenCache.expires > Date.now() + 60000) return tokenCache.token;
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  if (account.project_id !== env.FIREBASE_PROJECT_ID || !account.client_email || !account.private_key) throw Error('Firebase credentials unavailable');
  const pem = account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = encodeJson({ alg: 'RS256', typ: 'JWT', kid: account.private_key_id }) + '.' + encodeJson({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8.encode(unsigned)));
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + b64url(signature) }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw Error('Firebase authentication unavailable');
  tokenCache = { source: env.FIREBASE_SERVICE_ACCOUNT_JSON, token: result.access_token, expires: Date.now() + (result.expires_in || 3600) * 1000 };
  return result.access_token;
}

export function decodeValue(v) {
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return undefined;
}
export const decodeFields = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
export function encodeValue(v) {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw Error('Invalid number'); return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }; }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } };
  throw Error('Invalid Firestore value');
}
export const encodeFields = (v) => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, encodeValue(x)]));

const OPS = { '==': 'EQUAL', '>=': 'GREATER_THAN_OR_EQUAL', '<=': 'LESS_THAN_OR_EQUAL', '>': 'GREATER_THAN', '<': 'LESS_THAN' };
const SEGMENT = /^[A-Za-z0-9_-]{1,200}$/;

export class Firestore {
  constructor(env, { fetcher = (...a) => globalThis.fetch(...a), token = () => accessToken(env, fetcher) } = {}) {
    this.fetcher = fetcher;
    this.token = token;
    this.database = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)`;
    this.base = `https://firestore.googleapis.com/v1/${this.database}/documents`;
  }

  async request(method, url, body) {
    const response = await this.fetcher(url, {
      method,
      headers: { Authorization: 'Bearer ' + await this.token(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404 && method === 'GET') return null;
    const value = await response.json();
    if (!response.ok) {
      const e = Error('Database request failed');
      e.retryable = value.error?.status === 'ABORTED';
      e.conflict = value.error?.status === 'ALREADY_EXISTS';
      throw e;
    }
    return value;
  }

  check(path, kind) {
    const parts = String(path).split('/');
    if (!parts.every((p) => SEGMENT.test(p)) || parts.length % 2 !== (kind === 'doc' ? 0 : 1)) throw Error('Invalid path ' + path);
    return parts;
  }
  name(path) { this.check(path, 'doc'); return `${this.database}/documents/${path}`; }

  async get(path, transaction) {
    this.check(path, 'doc');
    const doc = await this.request('GET', `${this.base}/${path}${transaction ? '?transaction=' + encodeURIComponent(transaction) : ''}`);
    return doc ? decodeFields(doc.fields || {}) : null;
  }

  async update(path, data) {
    const mask = Object.keys(data).map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    await this.request('PATCH', `${this.base}/${path}?${mask}&currentDocument.exists=true`, { fields: encodeFields(data) });
  }

  structured(collection, { where = [], orderBy, limit } = {}) {
    const parts = this.check(collection, 'collection');
    const parent = parts.length > 1 ? `${this.base}/${parts.slice(0, -1).join('/')}` : this.base;
    const filters = where.map(([field, op, value]) => ({ fieldFilter: { field: { fieldPath: field }, op: OPS[op], value: encodeValue(value) } }));
    const query = { from: [{ collectionId: parts.at(-1) }] };
    if (filters.length === 1) query.where = filters[0];
    if (filters.length > 1) query.where = { compositeFilter: { op: 'AND', filters } };
    if (orderBy) query.orderBy = [{ field: { fieldPath: orderBy[0] }, direction: orderBy[1] === 'desc' ? 'DESCENDING' : 'ASCENDING' }];
    if (limit) query.limit = limit;
    return { parent, query };
  }

  async query(collection, options) {
    const { parent, query } = this.structured(collection, options);
    const rows = await this.request('POST', `${parent}:runQuery`, { structuredQuery: query });
    return (rows || []).filter((r) => r.document).map((r) => {
      const path = r.document.name.split('/documents/')[1];
      return { id: path.split('/').at(-1), path, data: decodeFields(r.document.fields || {}) };
    });
  }

  async count(collection, where = []) {
    const { parent, query } = this.structured(collection, { where });
    const rows = await this.request('POST', `${parent}:runAggregationQuery`, { structuredAggregationQuery: { structuredQuery: query, aggregations: [{ alias: 'n', count: {} }] } });
    return Number(rows?.[0]?.result?.aggregateFields?.n?.integerValue || 0);
  }

  async transaction(fn) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { transaction } = await this.request('POST', `${this.base}:beginTransaction`, { options: { readWrite: {} } });
      const writes = [];
      const tx = {
        get: (path) => { if (writes.length) throw Error('Read after write'); return this.get(path, transaction); },
        create: (path, data) => writes.push({ update: { name: this.name(path), fields: encodeFields(data) }, currentDocument: { exists: false } }),
        set: (path, data) => writes.push({ update: { name: this.name(path), fields: encodeFields(data) } }),
        update: (path, data) => writes.push({ update: { name: this.name(path), fields: encodeFields(data) }, updateMask: { fieldPaths: Object.keys(data) }, currentDocument: { exists: true } }),
        delete: (path) => writes.push({ delete: this.name(path) }),
      };
      try {
        const result = await fn(tx);
        await this.request('POST', `${this.base}:commit`, { transaction, writes });
        return result;
      } catch (e) {
        try { await this.request('POST', `${this.base}:rollback`, { transaction }); } catch {}
        if ((e.retryable || e.conflict) && attempt < 3) continue;
        throw e;
      }
    }
    throw Error('Database busy');
  }

  // Deletes a document and the documents of its subcollections (one level: bot data has no deeper nesting).
  // Batches of 300 keep the number of requests low.
  async deleteTree(path) {
    const children = await this.request('POST', `${this.base}/${path}:listCollectionIds`, { pageSize: 50 });
    for (const id of children?.collectionIds || []) {
      for (let round = 0; round < 20; round++) {
        const docs = await this.query(`${path}/${id}`, { limit: 300 });
        if (!docs.length) break;
        await this.request('POST', `${this.base}:commit`, { writes: docs.map((d) => ({ delete: this.name(d.path) })) });
        if (docs.length < 300) break;
      }
    }
    await this.request('POST', `${this.base}:commit`, { writes: [{ delete: this.name(path) }] });
  }
}
