'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './admin.css'

const FIREBASE = {
  apiKey: 'AIzaSyBvnc-swQuAx_Fe67TUY7TGoM4VdG89cI4',
  authDomain: 'passgram-org.firebaseapp.com',
  projectId: 'passgram-org',
  storageBucket: 'passgram-org.firebasestorage.app',
  messagingSenderId: '157086803240',
  appId: '1:157086803240:web:152ae9d14c582db8c91c1d',
}

// Firebase is loaded only in the browser (the page is a static export).
let fbPromise
function firebase() {
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]preview/.test(location.search)) return import('./preview').then((m) => m.previewFirebase())
  fbPromise ||= (async () => {
    const [{ initializeApp, getApps }, authSdk, fs] = await Promise.all([
      import('firebase/app'), import('firebase/auth'), import('firebase/firestore'),
    ])
    const app = getApps()[0] || initializeApp(FIREBASE)
    return { auth: authSdk.getAuth(app), authSdk, db: fs.getFirestore(app), fs }
  })()
  return fbPromise
}

// Admin access comes only from the private `admin` custom claim; no addresses are shipped in public code.
const isAdminUser = (user, claims) => !!user && claims?.admin === true
const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleString() : '—')
const money = (v) => (Number.isFinite(Number(v)) ? `$${Number(v).toFixed(2)}` : '—')
const short = (s, n = 18) => (s && s.length > n ? s.slice(0, n) + '…' : s || '—')
const tone = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'warn'
  if (s === 'approved' || s === 'active') return 'good'
  if (['rejected', 'revoked', 'cancelled'].includes(s)) return 'bad'
  return 'muted'
}
function monthsFromNow(fs, months) {
  const d = new Date(); d.setMonth(d.getMonth() + Number(months)); return fs.Timestamp.fromDate(d)
}
function errorText(error) {
  const code = error?.code || ''
  if (code.includes('permission-denied')) return 'No access. Firestore rules do not allow admins to read this collection.'
  if (code.includes('failed-precondition')) return 'This list needs a Firestore index. Open the browser console for the link that creates it.'
  return error?.message || String(error)
}

/* ---------------- icons ---------------- */
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  users: 'M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 10a3 3 0 100-6 3 3 0 000 6zM22 19v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8',
  card: 'M2 6h20v12H2zM2 10h20M6 15h4',
  rocket: 'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 13l2 2M14 4c3-1 6-1 6-1s0 3-1 6l-6 6-5-5z',
  bug: 'M8 9h8v7a4 4 0 01-8 0zM12 9V5M8 5l2 2M16 5l-2 2M4 13h4M16 13h4M5 19l3-2M19 19l-3-2',
  bot: 'M5 8h14v11H5zM12 4v4M9 13h.01M15 13h.01M2 13h3M19 13h3',
  core: 'M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7',
  api: 'M8 6l-6 6 6 6M16 6l6 6-6 6',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  out: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  refresh: 'M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  menu: 'M3 6h18M3 12h18M3 18h18',
  shield: 'M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z',
}
const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name]} /></svg>
)

/* ---------------- data hook ---------------- */
function useLoader(load, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const seq = useRef(0)
  const reload = useCallback(async () => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const data = await load()
      if (id === seq.current) setState({ loading: false, data, error: '' })
    } catch (error) {
      if (id === seq.current) setState({ loading: false, data: null, error: errorText(error) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}

/* ---------------- shared UI ---------------- */
const Pill = ({ children }) => <span className={`zpa-pill ${tone(children)}`}>{children || '—'}</span>

function Card({ title, hint, actions, children, className = '' }) {
  return (
    <section className={`zpa-card ${className}`}>
      {(title || actions) && (
        <div className="zpa-card-head">
          <div>{title && <h2>{title}</h2>}{hint && <p>{hint}</p>}</div>
          {actions && <div className="zpa-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

function Table({ columns, rows, loading, error, empty }) {
  if (error) return <div className="zpa-state bad">{error}</div>
  if (loading && !rows) return <div className="zpa-state"><span className="zpa-spin" />Loading…</div>
  if (!rows?.length) return <div className="zpa-state">{empty}</div>
  return (
    <div className="zpa-table-wrap">
      <table className="zpa-table">
        <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => <td key={c.label} data-label={c.label} className={c.mono ? 'mono' : ''}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="zpa-seg" role="tablist">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o.charAt(0) + o.slice(1).toLowerCase() : o.label
        return <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>
      })}
    </div>
  )
}

function Dialog({ spec, onClose }) {
  const [values, setValues] = useState(() => Object.fromEntries((spec.fields || []).map((f) => [f.name, f.value ?? ''])))
  const first = useRef(null)
  useEffect(() => { first.current?.focus() }, [])
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(null) }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [onClose])
  const submit = (e) => { e.preventDefault(); onClose(values) }
  return (
    <div className="zpa-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(null) }}>
      <form className="zpa-dialog" onSubmit={submit}>
        <h3>{spec.title}</h3>
        {spec.message && <p>{spec.message}</p>}
        {(spec.fields || []).map((f, i) => (
          <label key={f.name} className="zpa-field">
            <span>{f.label}</span>
            {f.options ? (
              <select ref={i === 0 ? first : null} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input ref={i === 0 ? first : null} type={f.type || 'text'} min={f.min} value={values[f.name]} placeholder={f.placeholder} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
            )}
          </label>
        ))}
        <div className="zpa-dialog-actions">
          <button type="button" className="zpa-btn ghost" onClick={() => onClose(null)}>Cancel</button>
          <button type="submit" className={`zpa-btn ${spec.danger ? 'danger' : 'primary'}`}>{spec.confirm || 'Confirm'}</button>
        </div>
      </form>
    </div>
  )
}

/* ---------------- sections ---------------- */
const NAV = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'requests', label: 'Payment requests', icon: 'inbox' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'crown' },
  { id: 'users', label: 'Users', icon: 'users' },
  { id: 'payments', label: 'Payment history', icon: 'card' },
  { id: 'releases', label: 'Updates & releases', icon: 'rocket' },
  { id: 'errors', label: 'Error reports', icon: 'bug' },
]
const EXTERNAL = [
  { href: 'https://bots.zpas.org/#signin', label: 'Bots panel', icon: 'bot' },
  { href: 'https://core.zpas.org/#signin', label: 'Core overview', icon: 'core' },
  { href: 'https://api.zpas.org/#signin', label: 'API & config', icon: 'api' },
]

function Overview({ fb, go }) {
  const { fs, db } = fb
  const count = async (name, ...where) => {
    try { return (await fs.getCountFromServer(fs.query(fs.collection(db, name), ...where))).data().count } catch { return null }
  }
  const stats = useLoader(async () => {
    const [crypto, changes, active, users, cfg] = await Promise.all([
      count('crypto_payment_requests', fs.where('status', '==', 'PENDING')),
      count('subscription_change_requests', fs.where('status', '==', 'PENDING')),
      count('subscriptions', fs.where('status', '==', 'ACTIVE')),
      count('users'),
      fs.getDoc(fs.doc(db, 'app_config', 'public')).then((s) => s.data() || {}).catch(() => ({})),
    ])
    return { crypto, changes, active, users, cfg }
  }, [])
  const d = stats.data || {}
  const tiles = [
    { label: 'Pending crypto', value: d.crypto, icon: 'inbox', to: 'requests', accent: d.crypto > 0 },
    { label: 'Pending plan changes', value: d.changes, icon: 'inbox', to: 'requests', accent: d.changes > 0 },
    { label: 'Active subscriptions', value: d.active, icon: 'crown', to: 'subscriptions' },
    { label: 'Users', value: d.users, icon: 'users', to: 'users' },
  ]
  const cfg = d.cfg || {}
  return (
    <>
      <div className="zpa-stats">
        {tiles.map((t) => (
          <button key={t.label} type="button" className={`zpa-stat ${t.accent ? 'accent' : ''}`} onClick={() => go(t.to)}>
            <span className="zpa-stat-icon"><Icon name={t.icon} /></span>
            <strong>{stats.loading ? '…' : t.value ?? '—'}</strong>
            <small>{t.label}</small>
          </button>
        ))}
      </div>
      <div className="zpa-grid2">
        <Card title="Live app status" hint="Read from app_config/public." actions={<button className="zpa-btn ghost sm" onClick={() => go('releases')}>Edit</button>}>
          <dl className="zpa-dl">
            <div><dt>Android</dt><dd>{cfg.latestVersionName || '—'} <span className="zpa-dim">({cfg.latestVersionCode || '—'})</span></dd></div>
            <div><dt>Minimum code</dt><dd>{cfg.minimumSupportedVersionCode || '—'}</dd></div>
            <div><dt>Windows</dt><dd>{cfg.windowsVersion || '—'}</dd></div>
            <div><dt>Force update</dt><dd><Pill>{cfg.forceUpdate ? 'ON' : 'OFF'}</Pill></dd></div>
            <div><dt>Maintenance</dt><dd><span className={`zpa-pill ${cfg.maintenanceMode ? 'bad' : 'good'}`}>{cfg.maintenanceMode ? 'ON' : 'OFF'}</span></dd></div>
          </dl>
        </Card>
        <Card title="Other admin panels" hint="Same admin account, separate subdomains.">
          <div className="zpa-links">
            {EXTERNAL.map((l) => (
              <a key={l.href} href={l.href} className="zpa-link"><span className="zpa-stat-icon"><Icon name={l.icon} /></span><span>{l.label}</span><small>{new URL(l.href).host}</small></a>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

function Requests({ fb, ask, toast }) {
  const { fs, db, auth } = fb
  const [kind, setKind] = useState('crypto')
  const [status, setStatus] = useState('PENDING')
  const collection = { crypto: 'crypto_payment_requests', paypal: 'paypal_payment_requests', changes: 'subscription_change_requests' }[kind]
  const list = useLoader(async () => {
    const snap = await fs.getDocs(fs.query(fs.collection(db, collection), fs.where('status', '==', status), fs.orderBy('createdAt', 'desc'), fs.limit(25)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }, [collection, status])

  const markApproved = (id) => fs.updateDoc(fs.doc(db, collection, id), { status: 'APPROVED', approvedAt: fs.serverTimestamp(), approvedBy: auth.currentUser.email })
  const grant = (uid, zPassId, tier, months, requestId) => fs.setDoc(fs.doc(db, 'subscriptions', uid), {
    zPassId, plan: tier, planId: `zpass_${tier.toLowerCase()}_manual`, status: 'ACTIVE',
    expiresAt: monthsFromNow(fs, months), lastPaymentRequestId: requestId, updatedAt: fs.serverTimestamp(),
  }, { merge: true })

  const approve = async (row) => {
    try {
      if (kind === 'changes') {
        if (row.type === 'CHANGE_PLAN') {
          const tier = row.plan === 'FAMILY' ? 'PRO' : row.plan === 'INDIVIDUAL' ? 'PLUS' : String(row.plan).toUpperCase()
          if (!['PLUS', 'PRO'].includes(tier)) return toast('This request has an unknown plan.', 'bad')
          const ok = await ask({ title: 'Approve plan change', message: `${row.ownerZpId} → ${tier} (${row.billing || 'Monthly'})`, confirm: 'Approve' })
          if (!ok) return
          await grant(row.ownerUid, row.ownerZpId, tier, row.billing === 'Yearly' ? 12 : 1, row.id)
        } else if (row.type === 'CANCEL') {
          const ok = await ask({ title: 'Cancel subscription', message: `Ends ${row.ownerZpId}'s subscription now.`, confirm: 'Cancel subscription', danger: true })
          if (!ok) return
          await fs.setDoc(fs.doc(db, 'subscriptions', row.ownerUid), { status: 'CANCELLED', expiresAt: fs.Timestamp.now(), updatedAt: fs.serverTimestamp() }, { merge: true })
        }
      } else {
        const yearly = kind === 'crypto' ? row.plan === 'Yearly' : row.billing === 'YEARLY'
        const v = await ask({
          title: 'Approve payment', message: `${row.zPassId} · ${money(row.amountUsd)}`, confirm: 'Activate',
          fields: [
            { name: 'tier', label: 'Plan', options: ['PRO', 'PLUS'], value: kind === 'paypal' && row.tier === 'PLUS' ? 'PLUS' : 'PRO' },
            { name: 'months', label: 'Months', type: 'number', min: 1, value: String(yearly ? 12 : 1) },
          ],
        })
        if (!v) return
        const months = parseInt(v.months, 10)
        if (!months || months < 1) return toast('Months must be 1 or more.', 'bad')
        await grant(row.uid, row.zPassId, v.tier, months, row.id)
      }
      await markApproved(row.id)
      toast('Approved.')
      list.reload()
    } catch (error) { toast(errorText(error), 'bad') }
  }
  const reject = async (row) => {
    const v = await ask({ title: 'Reject request', confirm: 'Reject', danger: true, fields: [{ name: 'reason', label: 'Reason (optional)', placeholder: 'Shown to the customer' }] })
    if (!v) return
    try {
      await fs.updateDoc(fs.doc(db, collection, row.id), { status: 'REJECTED', rejectedAt: fs.serverTimestamp(), rejectedBy: auth.currentUser.email, rejectionReason: v.reason.trim() })
      toast('Rejected.'); list.reload()
    } catch (error) { toast(errorText(error), 'bad') }
  }
  const actions = {
    label: '', render: (r) => status === 'PENDING' && (
      <div className="zpa-row-actions">
        <button className="zpa-btn good sm" onClick={() => approve(r)}><Icon name="check" size={15} />Approve</button>
        <button className="zpa-btn ghost sm" onClick={() => reject(r)}><Icon name="x" size={15} />Reject</button>
      </div>
    ),
  }
  const columns = {
    crypto: [
      { label: 'PassGram ID', key: 'zPassId', mono: true }, { label: 'Plan', key: 'plan' },
      { label: 'Amount', render: (r) => money(r.amountUsd) }, { label: 'Network', render: (r) => `${r.network || '—'} ${r.symbol ? `(${r.symbol})` : ''}` },
      { label: 'TxID', mono: true, render: (r) => <span title={r.txId}>{short(r.txId)}</span> },
      { label: 'Created', render: (r) => fmtDate(r.createdAt) }, actions,
    ],
    paypal: [
      { label: 'PassGram ID', key: 'zPassId', mono: true }, { label: 'Tier', key: 'tier' }, { label: 'Billing', key: 'billing' },
      { label: 'Amount', render: (r) => money(r.amountUsd) }, { label: 'Method', key: 'method' },
      { label: 'Order ID', mono: true, render: (r) => <span title={r.orderId}>{short(r.orderId)}</span> }, actions,
    ],
    changes: [
      { label: 'PassGram ID', key: 'ownerZpId', mono: true }, { label: 'Type', key: 'type' },
      { label: 'Plan / target', render: (r) => (r.type === 'CHANGE_PLAN' ? `${r.plan || ''} (${r.billing || ''})` : r.target || '—') },
      { label: 'Created', render: (r) => fmtDate(r.createdAt) }, actions,
    ],
  }[kind]
  const hints = {
    crypto: 'Check the transaction on the blockchain explorer, then approve to activate the plan.',
    paypal: 'PayPal has already captured these. Match the Order ID in your PayPal dashboard before approving.',
    changes: 'Plan changes and cancellations requested from the website.',
  }
  return (
    <Card title="Payment requests" hint={hints[kind]} actions={<button className="zpa-btn ghost sm" onClick={list.reload}><Icon name="refresh" size={15} />Refresh</button>}>
      <div className="zpa-toolbar">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'crypto', label: 'Crypto' }, { value: 'paypal', label: 'Card / PayPal' }, { value: 'changes', label: 'Plan changes' }]} />
        <Segmented value={status} onChange={setStatus} options={['PENDING', 'APPROVED', 'REJECTED']} />
      </div>
      <Table columns={columns} rows={list.data} loading={list.loading} error={list.error} empty={`No ${status.toLowerCase()} requests.`} />
    </Card>
  )
}

function Subscriptions({ fb, ask, toast }) {
  const { fs, db, auth } = fb
  const [zpId, setZpId] = useState('')
  const [tier, setTier] = useState('PRO')
  const [months, setMonths] = useState('1')
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const active = useLoader(async () => {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'subscriptions'), fs.where('status', '==', 'ACTIVE'), fs.orderBy('updatedAt', 'desc'), fs.limit(50)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }, [])
  const findUid = async () => {
    const id = zpId.trim().toUpperCase()
    if (!/^ZP-[A-Z0-9]{4,}$/.test(id)) throw new Error('Enter a PassGram ID like ZP-ABC123DEF4.')
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'users'), fs.where('zPassId', '==', id), fs.limit(1)))
    if (snap.empty) throw new Error('No user has that PassGram ID.')
    return { uid: snap.docs[0].id, id }
  }
  const run = async (fn) => { setBusy(true); try { await fn() } catch (error) { toast(errorText(error), 'bad') } finally { setBusy(false) } }
  const lookup = () => run(async () => {
    const { uid, id } = await findUid()
    const sub = (await fs.getDoc(fs.doc(db, 'subscriptions', uid))).data()
    setFound({ id, uid, plan: sub?.plan || 'FREE', status: sub?.status || 'FREE', expires: fmtDate(sub?.expiresAt) })
  })
  const grantNow = () => run(async () => {
    const n = parseInt(months, 10)
    if (!n || n < 1) throw new Error('Months must be 1 or more.')
    const { uid, id } = await findUid()
    if (!(await ask({ title: 'Grant subscription', message: `Give ${id} ${tier} for ${n} month(s)?`, confirm: 'Grant' }))) return
    await fs.setDoc(fs.doc(db, 'subscriptions', uid), { zPassId: id, plan: tier, status: 'ACTIVE', expiresAt: monthsFromNow(fs, n), updatedAt: fs.serverTimestamp(), grantedManuallyBy: auth.currentUser.email }, { merge: true })
    toast(`${tier} granted to ${id}.`); setFound(null); active.reload()
  })
  const revoke = () => run(async () => {
    const { uid, id } = await findUid()
    const v = await ask({ title: 'Revoke subscription', message: `Type ${id} to end this subscription now.`, confirm: 'Revoke', danger: true, fields: [{ name: 'confirm', label: 'PassGram ID', placeholder: id }] })
    if (!v) return
    if (v.confirm.trim().toUpperCase() !== id) throw new Error('The ID did not match. Nothing changed.')
    await fs.setDoc(fs.doc(db, 'subscriptions', uid), { status: 'REVOKED', expiresAt: fs.Timestamp.now(), updatedAt: fs.serverTimestamp(), revokedBy: auth.currentUser.email }, { merge: true })
    toast(`Revoked ${id}.`); setFound(null); active.reload()
  })
  return (
    <>
      <Card title="Manage a subscription" hint="Grant, extend or revoke a plan by PassGram ID, for bank transfers, promotions or support cases.">
        <div className="zpa-form-row">
          <label className="zpa-field grow"><span>PassGram ID</span><input value={zpId} onChange={(e) => { setZpId(e.target.value); setFound(null) }} placeholder="ZP-ABC123DEF4" onKeyDown={(e) => e.key === 'Enter' && lookup()} /></label>
          <button className="zpa-btn ghost" disabled={busy} onClick={lookup}><Icon name="search" size={15} />Look up</button>
        </div>
        {found && (
          <div className="zpa-found">
            <span className="mono">{found.id}</span><Pill>{found.status}</Pill><span>{found.plan}</span><span className="zpa-dim">expires {found.expires}</span>
          </div>
        )}
        <div className="zpa-form-row">
          <label className="zpa-field"><span>Plan</span><select value={tier} onChange={(e) => setTier(e.target.value)}><option>PRO</option><option>PLUS</option></select></label>
          <label className="zpa-field"><span>Months</span><input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} style={{ width: 96 }} /></label>
          <button className="zpa-btn primary" disabled={busy} onClick={grantNow}>Grant / extend</button>
          <button className="zpa-btn danger" disabled={busy} onClick={revoke}>Revoke</button>
        </div>
      </Card>
      <Card title="Active subscriptions" hint="Most recently updated first." actions={<button className="zpa-btn ghost sm" onClick={active.reload}><Icon name="refresh" size={15} />Refresh</button>}>
        <Table rows={active.data} loading={active.loading} error={active.error} empty="No active subscriptions."
          columns={[{ label: 'PassGram ID', mono: true, render: (r) => r.zPassId || r.id }, { label: 'Plan', key: 'plan' }, { label: 'Status', render: (r) => <Pill>{r.status}</Pill> }, { label: 'Expires', render: (r) => fmtDate(r.expiresAt) }]} />
      </Card>
    </>
  )
}

function Users({ fb }) {
  const { fs, db } = fb
  const [search, setSearch] = useState('')
  const users = useLoader(async () => {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'users'), fs.limit(200)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }, [])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (users.data || []).filter((u) => !q || [u.zPassId, u.displayName, u.name, u.email, u.id].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [users.data, search])
  return (
    <Card title="Users" hint="Latest 200 account records." actions={<button className="zpa-btn ghost sm" onClick={users.reload}><Icon name="refresh" size={15} />Refresh</button>}>
      <label className="zpa-search"><Icon name="search" size={16} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email, name or PassGram ID" /></label>
      <Table rows={users.data ? rows : null} loading={users.loading} error={users.error} empty="No matching users."
        columns={[
          { label: 'PassGram ID', mono: true, render: (u) => u.zPassId || `ZP-${u.id.slice(0, 6).toUpperCase()}${u.id.slice(-4).toUpperCase()}` },
          { label: 'Name', render: (u) => u.displayName || u.name || '—' }, { label: 'Email', key: 'email' }, { label: 'Created', render: (u) => fmtDate(u.createdAt) },
        ]} />
    </Card>
  )
}

function Payments({ fb }) {
  const { fs, db } = fb
  const list = useLoader(async () => {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'payment_records'), fs.orderBy('createdAt', 'desc'), fs.limit(50)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }, [])
  return (
    <Card title="Payment history" hint="Latest completed card and crypto payments." actions={<button className="zpa-btn ghost sm" onClick={list.reload}><Icon name="refresh" size={15} />Refresh</button>}>
      <Table rows={list.data} loading={list.loading} error={list.error} empty="No completed payments."
        columns={[
          { label: 'PassGram ID', key: 'zPassId', mono: true }, { label: 'Email', key: 'email' }, { label: 'Plan', key: 'plan' }, { label: 'Billing', key: 'billing' },
          { label: 'Amount', render: (r) => money(r.amountUsd) }, { label: 'Provider', key: 'provider' }, { label: 'Paid', render: (r) => fmtDate(r.createdAt) },
        ]} />
    </Card>
  )
}

const EMPTY_CFG = { latestVersionName: '', latestVersionCode: '', minimumSupportedVersionCode: '', updateUrl: '', windowsVersion: '', windowsUrl: '', windowsNotes: '', announcement: '', maintenanceMessage: '', forceUpdate: false, maintenanceMode: false }
function Releases({ fb, ask, toast }) {
  const { fs, db } = fb
  const ref = fs.doc(db, 'app_config', 'public')
  const [form, setForm] = useState(EMPTY_CFG)
  const [saving, setSaving] = useState(false)
  const cfg = useLoader(async () => (await fs.getDoc(ref)).data() || {}, [])
  useEffect(() => { if (cfg.data) setForm({ ...EMPTY_CFG, ...Object.fromEntries(Object.keys(EMPTY_CFG).map((k) => [k, cfg.data[k] ?? EMPTY_CFG[k]])) }) }, [cfg.data])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async () => {
    const code = Number(form.latestVersionCode) || 1
    const min = Number(form.minimumSupportedVersionCode) || 1
    if (min > code) return toast('Minimum code cannot be higher than the latest code.', 'bad')
    for (const k of ['updateUrl', 'windowsUrl']) if (form[k] && !/^https:\/\//i.test(form[k].trim())) return toast('Download links must start with https://', 'bad')
    if ((form.forceUpdate || form.maintenanceMode) && !(await ask({ title: 'Publish to every app?', message: `${form.forceUpdate ? 'Force update is ON. ' : ''}${form.maintenanceMode ? 'Maintenance mode is ON: users cannot open their vault. ' : ''}Apps pick this up right away.`, confirm: 'Publish', danger: true }))) return
    const announcement = form.announcement.trim()
    setSaving(true)
    try {
      await fs.setDoc(ref, {
        latestVersionName: form.latestVersionName.trim(), latestVersionCode: code, minimumSupportedVersionCode: min,
        updateUrl: form.updateUrl.trim(), forceUpdate: !!form.forceUpdate, maintenanceMode: !!form.maintenanceMode,
        maintenanceMessage: form.maintenanceMessage.trim() || 'PassGram is temporarily under maintenance.',
        announcement, announcementId: announcement === (cfg.data?.announcement || '').trim() ? cfg.data?.announcementId || '' : announcement ? 'a' + Date.now() : '',
        windowsVersion: form.windowsVersion.trim(), windowsUrl: form.windowsUrl.trim(), windowsNotes: form.windowsNotes.trim(),
        updatedAt: fs.serverTimestamp(),
      }, { merge: true })
      toast('Published. Apps pick this up live.'); cfg.reload()
    } catch (error) { toast(errorText(error), 'bad') } finally { setSaving(false) }
  }
  if (cfg.error) return <Card title="Updates & releases"><div className="zpa-state bad">{cfg.error}</div></Card>
  return (
    <Card title="Updates & releases" hint="Controls the Android app live and records the Windows release. Raise the minimum code or turn on force update to require an update."
      actions={<button className="zpa-btn ghost sm" onClick={cfg.reload}><Icon name="refresh" size={15} />Reload</button>}>
      <div className="zpa-grid3">
        <div className="zpa-tile">
          <h4>Android (APK)</h4>
          <label className="zpa-field"><span>Latest version name</span><input value={form.latestVersionName} onChange={set('latestVersionName')} placeholder="4.16" /></label>
          <label className="zpa-field"><span>Latest version code</span><input type="number" min="1" value={form.latestVersionCode} onChange={set('latestVersionCode')} /></label>
          <label className="zpa-field"><span>Minimum supported code</span><input type="number" min="1" value={form.minimumSupportedVersionCode} onChange={set('minimumSupportedVersionCode')} /></label>
          <label className="zpa-field"><span>Signed download URL</span><input value={form.updateUrl} onChange={set('updateUrl')} placeholder="https://…" /></label>
        </div>
        <div className="zpa-tile">
          <h4>Windows (EXE)</h4>
          <label className="zpa-field"><span>Latest version</span><input value={form.windowsVersion} onChange={set('windowsVersion')} placeholder="1.1.0" /></label>
          <label className="zpa-field"><span>Download URL</span><input value={form.windowsUrl} onChange={set('windowsUrl')} placeholder="https://…" /></label>
          <label className="zpa-field"><span>Release notes</span><textarea rows={4} value={form.windowsNotes} onChange={set('windowsNotes')} placeholder="What's new" /></label>
        </div>
        <div className="zpa-tile">
          <h4>Announcement & status</h4>
          <label className="zpa-field"><span>Announcement in the app</span><textarea rows={3} value={form.announcement} onChange={set('announcement')} placeholder="What's new in this version" /></label>
          <label className="zpa-field"><span>Maintenance message</span><input value={form.maintenanceMessage} onChange={set('maintenanceMessage')} placeholder="PassGram is temporarily under maintenance." /></label>
          <label className="zpa-switch"><input type="checkbox" checked={!!form.forceUpdate} onChange={set('forceUpdate')} /><span />Force update</label>
          <label className="zpa-switch"><input type="checkbox" checked={!!form.maintenanceMode} onChange={set('maintenanceMode')} /><span />Maintenance mode</label>
        </div>
      </div>
      <div className="zpa-form-row end">
        <button className="zpa-btn primary" disabled={saving || cfg.loading} onClick={save}><Icon name="rocket" size={15} />{saving ? 'Publishing…' : 'Publish changes'}</button>
      </div>
    </Card>
  )
}

function Errors({ fb }) {
  const { fs, db } = fb
  const list = useLoader(async () => {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'error_reports'), fs.orderBy('createdAt', 'desc'), fs.limit(100)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }, [])
  return (
    <Card title="Error reports" hint="Crash and error codes sent by the apps (no personal data)." actions={<button className="zpa-btn ghost sm" onClick={list.reload}><Icon name="refresh" size={15} />Refresh</button>}>
      <Table rows={list.data} loading={list.loading} error={list.error} empty="No error reports."
        columns={[{ label: 'Platform', key: 'platform' }, { label: 'Version', key: 'version' }, { label: 'Code', key: 'code', mono: true }, { label: 'Operation', key: 'operation', mono: true }, { label: 'When', render: (r) => fmtDate(r.createdAt) }]} />
    </Card>
  )
}

/* ---------------- sign-in ---------------- */
function SignIn({ fb, denied, user }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { auth, authSdk } = fb || {}
  const submit = async (e) => {
    e.preventDefault(); if (!fb) return
    setBusy(true); setMessage('')
    try { await authSdk.signInWithEmailAndPassword(auth, email.trim(), password) } catch (error) { setMessage(error.code === 'auth/invalid-credential' ? 'Wrong email or password.' : error.message) } finally { setBusy(false) }
  }
  const google = async () => {
    if (!fb) return
    try { await authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider()) } catch (error) { if (error.code !== 'auth/popup-closed-by-user') setMessage(error.message) }
  }
  return (
    <div className="zpa-auth">
      <div className="zpa-auth-card">
        <div className="zpa-logo"><img src="/resources/assets/app-logo/zpass.png" alt="" width="40" height="40" /></div>
        <h1>PassGram Admin</h1>
        {denied ? (
          <>
            <p className="zpa-auth-sub">You are not authorized to view this page.</p>
            <div className="zpa-denied"><Icon name="shield" size={16} />Signed in as {user?.email || 'this account'}</div>
            <button className="zpa-btn ghost wide" onClick={() => authSdk.signOut(auth)}><Icon name="out" size={15} />Sign out</button>
          </>
        ) : (
          <>
            <p className="zpa-auth-sub">Restricted to administrators.</p>
            <form onSubmit={submit}>
              <label className="zpa-field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="zpa-field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
              <button className="zpa-btn primary wide" type="submit" disabled={busy || !fb}>{busy ? 'Signing in…' : 'Sign in'}</button>
            </form>
            <div className="zpa-or"><span>or</span></div>
            <button className="zpa-btn ghost wide" type="button" onClick={google} disabled={!fb}><img src="/resources/images/google-mark.svg" alt="" width="18" height="18" />Continue with Google</button>
            {message && <p className="zpa-auth-msg" role="alert">{message}</p>}
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------- root ---------------- */
export default function AdminClient() {
  const [fb, setFb] = useState(null)
  const [session, setSession] = useState({ state: 'loading', user: null })
  const [view, setView] = useState('overview')
  const [theme, setTheme] = useState('dark')
  const [navOpen, setNavOpen] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    try { const t = localStorage.getItem('zp-admin-theme'); if (t === 'light' || t === 'dark') setTheme(t) } catch {}
    const hash = location.hash.slice(1); if (NAV.some((n) => n.id === hash)) setView(hash)
    let unsub
    firebase().then((f) => {
      setFb(f)
      unsub = f.authSdk.onAuthStateChanged(f.auth, async (user) => {
        if (!user) return setSession({ state: 'signin', user: null })
        const claims = (await user.getIdTokenResult().catch(() => null))?.claims
        setSession({ state: isAdminUser(user, claims) ? 'admin' : 'denied', user })
      })
    }).catch(() => setSession({ state: 'signin', user: null }))
    return () => unsub?.()
  }, [])

  const go = (id) => { setView(id); setNavOpen(false); history.replaceState(null, '', '#' + id); window.scrollTo({ top: 0 }) }
  const toggleTheme = () => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); try { localStorage.setItem('zp-admin-theme', t) } catch {} }
  const toast = useCallback((text, kind = 'good') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])
  const ask = useCallback((spec) => new Promise((resolve) => setDialog({ spec, resolve })), [])
  const closeDialog = useCallback((value) => { setDialog((d) => { d?.resolve(value && (d.spec.fields ? value : true)); return null }) }, [])

  const current = NAV.find((n) => n.id === view) || NAV[0]
  const props = { fb, ask, toast, go }

  return (
    <div className="zpa" data-theme={theme}>
      {session.state === 'loading' && <div className="zpa-auth"><span className="zpa-spin big" /></div>}
      {(session.state === 'signin' || session.state === 'denied') && <SignIn fb={fb} denied={session.state === 'denied'} user={session.user} />}
      {session.state === 'admin' && fb && (
        <div className={`zpa-shell ${navOpen ? 'nav-open' : ''}`}>
          <aside className="zpa-side">
            <div className="zpa-brand"><img src="/resources/assets/app-logo/zpass.png" alt="" width="30" height="30" /><div><strong>PassGram</strong><small>Admin</small></div></div>
            <nav>
              {NAV.map((n) => (
                <button key={n.id} type="button" className={view === n.id ? 'on' : ''} onClick={() => go(n.id)}><Icon name={n.icon} />{n.label}</button>
              ))}
              <div className="zpa-side-label">Other panels</div>
              {EXTERNAL.map((l) => <a key={l.href} href={l.href}><Icon name={l.icon} />{l.label}</a>)}
            </nav>
            <div className="zpa-side-foot">
              <div className="zpa-me"><span>{(session.user.email || '?').charAt(0).toUpperCase()}</span><small title={session.user.email}>{session.user.email}</small></div>
              <button type="button" className="zpa-icon-btn" onClick={() => fb.authSdk.signOut(fb.auth)} aria-label="Sign out" title="Sign out"><Icon name="out" /></button>
            </div>
          </aside>
          <div className="zpa-scrim" onClick={() => setNavOpen(false)} />
          <div className="zpa-main">
            <div className="zpa-top">
              <button type="button" className="zpa-icon-btn zpa-menu" onClick={() => setNavOpen(true)} aria-label="Menu"><Icon name="menu" /></button>
              <div><h1>{current.label}</h1><small>passgram-org · Firestore</small></div>
              <button type="button" className="zpa-icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
            </div>
            <div className="zpa-content" key={view}>
              {view === 'overview' && <Overview {...props} />}
              {view === 'requests' && <Requests {...props} />}
              {view === 'subscriptions' && <Subscriptions {...props} />}
              {view === 'users' && <Users {...props} />}
              {view === 'payments' && <Payments {...props} />}
              {view === 'releases' && <Releases {...props} />}
              {view === 'errors' && <Errors {...props} />}
            </div>
          </div>
        </div>
      )}
      {dialog && <Dialog spec={dialog.spec} onClose={closeDialog} />}
      <div className="zpa-toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`zpa-toast ${t.kind}`}>{t.text}</div>)}</div>
    </div>
  )
}
