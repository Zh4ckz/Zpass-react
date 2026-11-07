// Local design preview with sample data. Loaded only on localhost with ?preview (never in production).
const ts = (daysAgo) => ({ toDate: () => new Date(Date.now() - daysAgo * 864e5) })
const DATA = {
  crypto_payment_requests: [
    { id: 'c1', uid: 'u1', zPassId: 'ZP-7QK2M9XA1B', plan: 'Yearly', amountUsd: 90, network: 'Tron', symbol: 'USDT', txId: '9f3a1c77be20d4a5e8f0a6c2d1', status: 'PENDING', createdAt: ts(0.1) },
    { id: 'c2', uid: 'u2', zPassId: 'ZP-H4D8R2LP0C', plan: 'Monthly', amountUsd: 9, network: 'Bitcoin', symbol: 'BTC', txId: 'a7e0b9c3d2f1', status: 'PENDING', createdAt: ts(0.6) },
  ],
  paypal_payment_requests: [],
  subscription_change_requests: [{ id: 's1', ownerUid: 'u3', ownerZpId: 'ZP-PL3X8W2M7Q', type: 'CHANGE_PLAN', plan: 'PRO', billing: 'Yearly', status: 'PENDING', createdAt: ts(1) }],
  subscriptions: [
    { id: 'u4', zPassId: 'ZP-A1B2C3D4E5', plan: 'PRO', status: 'ACTIVE', expiresAt: ts(-320) },
    { id: 'u5', zPassId: 'ZP-K9L8M7N6P5', plan: 'PLUS', status: 'ACTIVE', expiresAt: ts(-21) },
  ],
  users: [
    { id: 'u4abcdef1234', zPassId: 'ZP-A1B2C3D4E5', displayName: 'Ada Lovelace', email: 'ada@example.com', createdAt: ts(40) },
    { id: 'u5abcdef5678', zPassId: 'ZP-K9L8M7N6P5', displayName: 'Alan Turing', email: 'alan@example.com', createdAt: ts(12) },
    { id: 'u6abcdef9012', displayName: 'Grace Hopper', email: 'grace@example.com', createdAt: ts(3) },
  ],
  payment_records: [{ id: 'p1', zPassId: 'ZP-A1B2C3D4E5', email: 'ada@example.com', plan: 'PRO', billing: 'YEARLY', amountUsd: 90, provider: 'crypto', createdAt: ts(2) }],
  error_reports: [{ id: 'e1', platform: 'android', version: '4.11', code: 'VAULT_SYNC_TIMEOUT', operation: 'vault.sync', createdAt: ts(0.3) }],
  app_config: [{ id: 'public', latestVersionName: '4.16', latestVersionCode: 47, minimumSupportedVersionCode: 41, windowsVersion: '1.1.0', forceUpdate: false, maintenanceMode: false, announcement: 'Z Pass 4.16 is here.' }],
}
export function previewFirebase() {
  const user = { email: 'admin@zpas.org', emailVerified: true, getIdTokenResult: async () => ({ claims: { admin: true } }) }
  const wait = (v) => new Promise((r) => setTimeout(() => r(v), 250))
  const fs = {
    collection: (_db, name) => ({ name }),
    doc: (_db, name, id) => ({ name, id }),
    where: (field, _op, value) => ({ field, value }),
    orderBy: () => null, limit: () => null,
    query: (col, ...parts) => ({ name: col.name, filters: parts.filter((p) => p && p.field) }),
    getDocs: async (q) => {
      const rows = (DATA[q.name] || []).filter((r) => q.filters.every((f) => r[f.field] === f.value))
      return wait({ empty: !rows.length, docs: rows.map((r) => ({ id: r.id, data: () => r })) })
    },
    getDoc: async (ref) => { const r = (DATA[ref.name] || []).find((x) => x.id === ref.id); return wait({ exists: () => !!r, data: () => r }) },
    getCountFromServer: async (q) => { const count = (await fs.getDocs(q)).docs.length; return { data: () => ({ count }) } },
    setDoc: async () => wait(), updateDoc: async () => wait(),
    serverTimestamp: () => null, Timestamp: { now: () => ts(0), fromDate: (d) => ({ toDate: () => d }) },
  }
  const authSdk = { onAuthStateChanged: (_a, cb) => { cb(location.search.includes('signin') ? null : user); return () => {} }, signOut: () => location.reload() }
  return { auth: { currentUser: user }, authSdk, db: {}, fs }
}
