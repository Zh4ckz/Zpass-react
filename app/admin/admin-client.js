'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './admin.css'
import { DEFAULT_TEXT, NAME, parseReserved } from './reserved-usernames'

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
  at: 'M16 12a4 4 0 10-8 0 4 4 0 008 0zM16 12v1.5a2.5 2.5 0 005 0V12a9 9 0 10-3.5 7.1',
  save: 'M5 3h11l5 5v13H3V3zM7 3v6h9V3M7 21v-7h10v7',
  braces: 'M8 3H7a2 2 0 00-2 2v5a2 2 0 01-2 2 2 2 0 012 2v5a2 2 0 002 2h1M16 3h1a2 2 0 012 2v5a2 2 0 002 2 2 2 0 00-2 2v5a2 2 0 01-2 2h-1',
}
const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name]} /></svg>
)

/* ---------------- animated icons (useAnimations, MIT — same set as the Android app) ---------------- */
let lottiePromise
function lottie() {
  if (typeof window === 'undefined') return Promise.reject(Error('ssr'))
  if (window.lottie) return Promise.resolve(window.lottie)
  lottiePromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/resources/admin/lottie_light.min.js'; s.async = true
    s.onload = () => (window.lottie ? resolve(window.lottie) : reject(Error('lottie')))
    s.onerror = () => reject(Error('lottie'))
    document.head.appendChild(s)
  })
  return lottiePromise
}
/** Animated line icon; plays once on hover, when `play` changes, and on first show. Falls back to the static icon. */
function Anim({ name, fallback, size = 20, play }) {
  const box = useRef(null)
  const anim = useRef(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    lottie().then((l) => {
      if (!alive || !box.current) return
      anim.current = l.loadAnimation({ container: box.current, renderer: 'svg', loop: false, autoplay: false, path: `/resources/admin/anim/${name}.json` })
      anim.current.addEventListener('DOMLoaded', () => { if (alive) { setReady(true); anim.current.goToAndPlay(0, true) } })
    }).catch(() => {})
    return () => { alive = false; anim.current?.destroy(); anim.current = null }
  }, [name])
  useEffect(() => { if (ready && play !== undefined) anim.current?.goToAndPlay(0, true) }, [play, ready])
  return (
    <span className="zpa-anim" style={{ width: size, height: size }} onMouseEnter={() => anim.current?.goToAndPlay(0, true)}>
      <span ref={box} className="zpa-anim-box" style={{ display: ready ? 'block' : 'none' }} />
      {!ready && fallback && <Icon name={fallback} size={size} />}
    </span>
  )
}

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
  { id: 'overview', label: 'Overview', icon: 'home', anim: 'home', group: 'General', hint: 'Today at a glance' },
  { id: 'requests', label: 'Payment requests', icon: 'inbox', anim: 'mail', group: 'Money', hint: 'Crypto, PayPal and plan changes' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'crown', anim: 'award', group: 'Money', hint: 'Grant, extend or revoke plans' },
  { id: 'payments', label: 'Payment history', icon: 'card', anim: 'credit-card', group: 'Money', hint: 'Completed card and crypto payments' },
  { id: 'paywall', label: 'Subscription pop-up', icon: 'crown', anim: 'star', group: 'Money', hint: 'X-style upgrade sheet in the app' },
  { id: 'users', label: 'Users', icon: 'users', anim: 'users', group: 'People', hint: 'Accounts and PassGram IDs' },
  { id: 'moderation', label: 'Moderation', icon: 'shield', anim: 'shield', group: 'People', hint: 'Ban people, close groups and channels' },
  { id: 'usernames', label: 'Usernames', icon: 'at', anim: 'link', group: 'People', hint: 'Reserved names, countries and deep links' },
  { id: 'verification', label: 'Verification', icon: 'check', anim: 'award', group: 'People', hint: 'Blue check requests from Verify Bot' },
  { id: 'releases', label: 'Updates & releases', icon: 'rocket', anim: 'upload-cloud', group: 'App', hint: 'Versions, maintenance, announcements' },
  { id: 'errors', label: 'Error reports', icon: 'bug', anim: 'alert-triangle', group: 'App', hint: 'Crash and error codes from the apps' },
]
const EXTERNAL = [
  { href: 'https://bots.zpas.org/#signin', label: 'Bots panel', icon: 'bot', anim: 'message-circle' },
  { href: 'https://core.zpas.org/#signin', label: 'Core overview', icon: 'core', anim: 'database' },
  { href: 'https://api.zpas.org/#signin', label: 'API & config', icon: 'api', anim: 'link' },
]
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
function lastDays(n) { const out = []; const t = new Date(); t.setHours(0, 0, 0, 0); for (let i = n - 1; i >= 0; i--) { const d = new Date(t); d.setDate(t.getDate() - i); out.push(d) } return out }

/** Small bar chart (no library): one bar per day. */
function Bars({ values, labels, format = (v) => v, tone = 'accent' }) {
  const max = Math.max(1, ...values)
  return (
    <div className={`zpa-bars ${tone}`}>
      {values.map((v, i) => (
        <div key={i} className="zpa-bar" title={`${labels[i]}: ${format(v)}`}>
          <span style={{ height: `${Math.max(4, (v / max) * 100)}%` }} className={v ? '' : 'zero'} />
        </div>
      ))}
    </div>
  )
}

/** Ctrl/Cmd+K quick jump between pages. */
function Palette({ onGo, onClose }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const items = NAV.filter((n) => !q || (n.label + ' ' + n.hint).toLowerCase().includes(q.toLowerCase()))
  useEffect(() => setI(0), [q])
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)) }
    else if (e.key === 'Enter' && items[i]) { onGo(items[i].id); onClose() }
    else if (e.key === 'Escape') onClose()
  }
  return (
    <div className="zpa-modal top" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="zpa-palette">
        <div className="zpa-palette-search"><Icon name="search" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Jump to…" /><kbd>Esc</kbd></div>
        <div className="zpa-palette-list">
          {items.map((n, k) => (
            <button key={n.id} type="button" className={k === i ? 'on' : ''} onMouseEnter={() => setI(k)} onClick={() => { onGo(n.id); onClose() }}>
              <span className="zpa-stat-icon"><Anim name={n.anim} fallback={n.icon} size={18} /></span>
              <span><strong>{n.label}</strong><small>{n.hint}</small></span>
            </button>
          ))}
          {!items.length && <div className="zpa-state">Nothing matches “{q}”.</div>}
        </div>
      </div>
    </div>
  )
}

function Overview({ fb, go, user }) {
  const { fs, db } = fb
  const count = async (name, ...where) => {
    try { return (await fs.getCountFromServer(fs.query(fs.collection(db, name), ...where))).data().count } catch { return null }
  }
  const recent = async (name, n = 300) => {
    try { return (await fs.getDocs(fs.query(fs.collection(db, name), fs.orderBy('createdAt', 'desc'), fs.limit(n)))).docs.map((d) => ({ id: d.id, ...d.data() })) } catch { return [] }
  }
  const stats = useLoader(async () => {
    const [crypto, changes, active, users, bans, cfg, pays, signups] = await Promise.all([
      count('crypto_payment_requests', fs.where('status', '==', 'PENDING')),
      count('subscription_change_requests', fs.where('status', '==', 'PENDING')),
      count('subscriptions', fs.where('status', '==', 'ACTIVE')),
      count('users'),
      count('chat_bans'),
      fs.getDoc(fs.doc(db, 'app_config', 'public')).then((s) => s.data() || {}).catch(() => ({})),
      recent('payment_records', 200),
      recent('users', 300),
    ])
    return { crypto, changes, active, users, bans, cfg, pays, signups }
  }, [])
  const d = stats.data || {}
  const days = lastDays(14)
  const labels = days.map((x) => x.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))
  const bucket = (rows, value) => {
    const m = new Map(days.map((x) => [dayKey(x), 0]))
    for (const r of rows || []) { const t = r.createdAt?.toDate?.(); if (t) { const k = dayKey(t); if (m.has(k)) m.set(k, m.get(k) + value(r)) } }
    return [...m.values()]
  }
  const revenue = bucket(d.pays, (r) => Number(r.amountUsd) || 0)
  const signups = bucket(d.signups, () => 1)
  const revenueTotal = revenue.reduce((x, y) => x + y, 0)
  const signupTotal = signups.reduce((x, y) => x + y, 0)
  const pending = (d.crypto || 0) + (d.changes || 0)
  const name = (user?.displayName || user?.email?.split('@')[0] || 'Admin').split(' ')[0]
  const tiles = [
    { label: 'Pending requests', value: stats.loading ? null : pending, anim: 'mail', icon: 'inbox', to: 'requests', accent: pending > 0 },
    { label: 'Active subscriptions', value: d.active, anim: 'award', icon: 'crown', to: 'subscriptions' },
    { label: 'Users', value: d.users, anim: 'users', icon: 'users', to: 'users' },
    { label: 'Active bans', value: d.bans, anim: 'shield', icon: 'shield', to: 'moderation' },
  ]
  const cfg = d.cfg || {}
  return (
    <>
      <div className="zpa-hero">
        <div className="zpa-hero-text">
          <small>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</small>
          <h2>{greeting()}, {name} 👋</h2>
          <p>{pending > 0 ? `${pending} payment request${pending === 1 ? '' : 's'} waiting for you.` : 'Everything is calm. No requests are waiting.'}</p>
          <div className="zpa-hero-actions">
            <button className="zpa-btn primary" onClick={() => go(pending > 0 ? 'requests' : 'subscriptions')}><Anim name={pending > 0 ? 'mail' : 'award'} fallback="inbox" size={17} />{pending > 0 ? 'Review requests' : 'Manage plans'}</button>
            <button className="zpa-btn glass" onClick={() => go('releases')}><Anim name="upload-cloud" fallback="rocket" size={17} />Publish update</button>
          </div>
        </div>
        <div className="zpa-hero-art" aria-hidden="true"><img src="/resources/assets/app-logo/zpass.png" alt="" /></div>
      </div>

      <div className="zpa-stats">
        {tiles.map((t) => (
          <button key={t.label} type="button" className={`zpa-stat ${t.accent ? 'accent' : ''}`} onClick={() => go(t.to)}>
            <span className="zpa-stat-icon"><Anim name={t.anim} fallback={t.icon} size={20} /></span>
            <strong>{stats.loading ? <span className="zpa-skel" /> : t.value ?? '—'}</strong>
            <small>{t.label}</small>
          </button>
        ))}
      </div>

      <div className="zpa-grid2">
        <Card title="Revenue" hint="Completed payments, last 14 days." actions={<button className="zpa-btn ghost sm" onClick={() => go('payments')}>History</button>}>
          <div className="zpa-metric"><strong>{money(revenueTotal)}</strong><small>{(d.pays || []).length ? `${(d.pays || []).filter((r) => r.createdAt?.toDate?.() >= days[0]).length} payments` : 'No payments yet'}</small></div>
          <Bars values={revenue} labels={labels} format={money} />
          <div className="zpa-bars-axis"><span>{labels[0]}</span><span>Today</span></div>
        </Card>
        <Card title="New accounts" hint="Sign-ups, last 14 days." actions={<button className="zpa-btn ghost sm" onClick={() => go('users')}>Users</button>}>
          <div className="zpa-metric"><strong>{signupTotal}</strong><small>new accounts</small></div>
          <Bars values={signups} labels={labels} tone="violet" />
          <div className="zpa-bars-axis"><span>{labels[0]}</span><span>Today</span></div>
        </Card>
      </div>

      <div className="zpa-grid2">
        <Card title="Live app status" hint="What every app reads right now." actions={<button className="zpa-btn ghost sm" onClick={() => go('releases')}>Edit</button>}>
          <dl className="zpa-dl">
            <div><dt>Android</dt><dd>{cfg.latestVersionName || '—'} <span className="zpa-dim">({cfg.latestVersionCode || '—'})</span></dd></div>
            <div><dt>Minimum code</dt><dd>{cfg.minimumSupportedVersionCode || '—'}</dd></div>
            <div><dt>Windows</dt><dd>{cfg.windowsVersion || '—'}</dd></div>
            <div><dt>Force update</dt><dd><span className={`zpa-pill ${cfg.forceUpdate ? 'warn' : 'muted'}`}>{cfg.forceUpdate ? 'ON' : 'OFF'}</span></dd></div>
            <div><dt>Maintenance</dt><dd><span className={`zpa-pill ${cfg.maintenanceMode ? 'bad' : 'good'}`}>{cfg.maintenanceMode ? 'ON' : 'OFF'}</span></dd></div>
            <div><dt>Subscription pop-up</dt><dd><span className={`zpa-pill ${cfg.paywallEnabled ? 'good' : 'muted'}`}>{cfg.paywallEnabled ? 'ON' : 'OFF'}</span></dd></div>
          </dl>
        </Card>
        <Card title="Other admin panels" hint="Same admin account, separate subdomains.">
          <div className="zpa-links">
            {EXTERNAL.map((l) => (
              <a key={l.href} href={l.href} className="zpa-link"><span className="zpa-stat-icon"><Anim name={l.anim} fallback={l.icon} size={18} /></span><span>{l.label}</span><small>{new URL(l.href).host}</small></a>
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

const PLATFORM = {
  ANDROID: { label: 'Android app', short: 'APK', anim: 'zap' },
  WEB: { label: 'Website', short: 'Web', anim: 'link' },
  WINDOWS: { label: 'Windows app', short: 'EXE', anim: 'database' },
}
const platformOf = (p) => PLATFORM[String(p || '').toUpperCase()] || { label: p || 'Unknown', short: p || '—', anim: 'activity' }
const tsMs = (ts) => (ts?.toMillis ? ts.toMillis() : ts?.toDate ? ts.toDate().getTime() : 0)
const ago = (ts) => {
  const ms = tsMs(ts); if (!ms) return '—'
  const m = Math.round((Date.now() - ms) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`
}
const planOf = (sub) => {
  const active = sub?.status === 'ACTIVE' && tsMs(sub?.expiresAt) > Date.now()
  if (!active) return 'FREE'
  return /pro/i.test(sub.planId || '') || sub.plan === 'PRO' || sub.plan === 'FAMILY' ? 'PRO' : 'PLUS'
}
const country = (code) => { try { return code ? new Intl.DisplayNames(undefined, { type: 'region' }).of(code) : '' } catch { return code } }

function Users({ fb, ask, toast }) {
  const { fs, db } = fb
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(null)
  const users = useLoader(async () => {
    const [snap, subs] = await Promise.all([
      fs.getDocs(fs.query(fs.collection(db, 'users'), fs.limit(300))),
      fs.getDocs(fs.query(fs.collection(db, 'subscriptions'), fs.limit(500))).catch(() => ({ docs: [] })),
    ])
    const plan = new Map(subs.docs.map((d) => [d.id, planOf(d.data())]))
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), _plan: plan.get(d.id) || 'FREE' }))
      .sort((x, y) => tsMs(y.lastSeenAt || y.createdAt) - tsMs(x.lastSeenAt || x.createdAt))
  }, [])
  const dupes = useMemo(() => {
    const m = new Map()
    for (const u of users.data || []) { const e = String(u.email || '').toLowerCase(); if (e) m.set(e, (m.get(e) || 0) + 1) }
    return m
  }, [users.data])
  const dupeCount = [...dupes.values()].filter((n) => n > 1).length
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (users.data || []).filter((u) => !q || [u.zPassId, u.displayName, u.name, u.email, u.id].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [users.data, search])
  return (
    <>
      <Card title="Users" hint="Tap a person to see devices, plan, payments and admin actions." actions={<button className="zpa-btn ghost sm" onClick={users.reload}><Icon name="refresh" size={15} />Refresh</button>}>
        {dupeCount > 0 && <div className="zpa-alert"><Anim name="alert-triangle" fallback="bug" size={18} /><span><b>{dupeCount} email address{dupeCount === 1 ? ' has' : 'es have'} more than one account.</b> Turn on “Link accounts that use the same email” in Firebase Authentication settings so every email gets exactly one PassGram ID.</span></div>}
        <label className="zpa-search"><Icon name="search" size={16} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email, name, PassGram ID or uid" /></label>
        {users.error ? <div className="zpa-state bad">{users.error}</div> : users.loading && !users.data ? <div className="zpa-state"><span className="zpa-spin" />Loading…</div> : !rows.length ? <div className="zpa-state">No matching users.</div> : (
          <div className="zpa-people">
            {rows.map((u) => (
              <button key={u.id} type="button" className="zpa-person" onClick={() => setOpen(u)}>
                {u.photoUrl ? <img src={u.photoUrl} alt="" referrerPolicy="no-referrer" /> : <span className="zpa-avatar">{(u.displayName || u.email || '?').charAt(0).toUpperCase()}</span>}
                <span className="zpa-person-main"><strong>{u.displayName || u.name || '—'}</strong><small>{u.email || u.id}</small></span>
                <span className="zpa-person-meta">
                  <span className={`zpa-pill ${u._plan === 'FREE' ? 'muted' : 'good'}`}>{u._plan}</span>
                  {u.platform && <span className="zpa-chip">{platformOf(u.platform).short}</span>}
                  {dupes.get(String(u.email || '').toLowerCase()) > 1 && <span className="zpa-pill warn">DUPLICATE</span>}
                  <small>{ago(u.lastSeenAt || u.lastLoginAt)}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
      {open && <UserDrawer fb={fb} ask={ask} toast={toast} user={open} onClose={() => setOpen(null)} onChanged={users.reload} />}
    </>
  )
}

function UserDrawer({ fb, ask, toast, user, onClose, onChanged }) {
  const { fs, db, auth, authSdk } = fb
  const uid = user.id
  const [busy, setBusy] = useState(false)
  const info = useLoader(async () => {
    const safe = (p) => p.catch(() => null)
    const [sub, profile, devices, pays, crypto, ban] = await Promise.all([
      safe(fs.getDoc(fs.doc(db, 'subscriptions', uid)).then((d) => d.data() || null)),
      safe(fs.getDoc(fs.doc(db, 'chat_profiles', uid)).then((d) => d.data() || null)),
      safe(fs.getDocs(fs.collection(db, 'users', uid, 'devices')).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      safe(fs.getDocs(fs.query(fs.collection(db, 'payment_records'), fs.where('uid', '==', uid), fs.limit(50))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      safe(fs.getDocs(fs.query(fs.collection(db, 'crypto_payment_requests'), fs.where('uid', '==', uid), fs.limit(50))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      safe(fs.getDoc(fs.doc(db, 'chat_bans', uid)).then((d) => (d.exists() ? d.data() : null))),
    ])
    return { sub, profile, devices: (devices || []).sort((a, b) => tsMs(b.lastSeenAt) - tsMs(a.lastSeenAt)), pays: pays || [], crypto: crypto || [], ban }
  }, [uid])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const d = info.data || {}
  const prof = d.profile || {}
  const plan = planOf(d.sub)
  const live = (d.devices || []).filter((x) => !x.revoked)
  const run = async (fn) => { setBusy(true); try { await fn(); info.reload(); onChanged?.() } catch (error) { toast(errorText(error), 'bad') } finally { setBusy(false) } }

  const grant = (tier) => run(async () => {
    const v = await ask({ title: `Give ${tier}`, message: `${user.email || uid} gets PassGram ${tier}.`, fields: [{ name: 'months', label: 'Months', type: 'number', min: 1, value: '1' }], confirm: 'Grant' })
    if (!v) return
    const n = Math.max(1, Math.min(60, Number(v.months) || 1))
    await fs.setDoc(fs.doc(db, 'subscriptions', uid), { zPassId: user.zPassId || '', plan: tier, planId: `zpass_${tier.toLowerCase()}_manual`, status: 'ACTIVE', expiresAt: monthsFromNow(fs, n), updatedAt: fs.serverTimestamp(), grantedManuallyBy: auth.currentUser.email }, { merge: true })
    toast(`${tier} for ${n} month(s) granted.`)
  })
  const revoke = () => run(async () => {
    if (!(await ask({ title: 'Remove the plan?', message: 'The account goes back to Free right away.', confirm: 'Remove', danger: true }))) return
    await fs.setDoc(fs.doc(db, 'subscriptions', uid), { status: 'REVOKED', expiresAt: fs.Timestamp.now(), updatedAt: fs.serverTimestamp(), revokedBy: auth.currentUser.email }, { merge: true })
    toast('Plan removed.')
  })
  const resetLink = () => run(async () => {
    if (!user.email) throw Error('This account has no email address.')
    if (!(await ask({ title: 'Send a password reset link?', message: `A reset link goes to ${user.email}. Their other devices are signed out after they reset.`, confirm: 'Send link' }))) return
    await authSdk.sendPasswordResetEmail(auth, user.email)
    toast(`Reset link sent to ${user.email}.`)
  })
  const setVerified = (on) => run(async () => {
    await fs.updateDoc(fs.doc(db, 'chat_profiles', uid), { verified: on })
    toast(on ? 'Verified badge added.' : 'Verified badge removed.')
  })
  const setCompany = () => run(async () => {
    const v = await ask({ title: 'Company or label', message: 'Shown next to the name, like "Google", "Android" or "X". Leave empty to remove.', fields: [{ name: 'label', label: 'Label', value: prof.companyLabel || '', placeholder: 'Google' }], confirm: 'Save' })
    if (!v) return
    await fs.updateDoc(fs.doc(db, 'chat_profiles', uid), { companyLabel: String(v.label || '').trim().slice(0, 32) })
    toast('Label saved.')
  })
  const setUsername = () => run(async () => {
    const v = await ask({ title: 'Set username', message: 'Admins may give short names (1–4 characters, e.g. "npm") to companies. Letters, digits and _ only.', fields: [{ name: 'name', label: 'Username', value: prof.username || '', placeholder: 'npm' }], confirm: 'Save' })
    if (!v) return
    const name = String(v.name || '').trim().toLowerCase().replace(/^@/, '')
    if (!/^[a-z0-9_]{1,32}$/.test(name)) throw Error('Use 1–32 letters, digits or _.')
    const taken = await fs.getDoc(fs.doc(db, 'chat_usernames', name))
    if (taken.exists() && taken.data().uid !== uid) throw Error(`@${name} is already used.`)
    const batch = fs.writeBatch(db)
    if (prof.username && prof.username !== name) batch.delete(fs.doc(db, 'chat_usernames', prof.username))
    batch.set(fs.doc(db, 'chat_usernames', name), { uid })
    batch.update(fs.doc(db, 'chat_profiles', uid), { username: name })
    await batch.commit()
    toast(`Username set to @${name}.`)
  })

  return (
    <div className="zpa-drawer-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="zpa-drawer">
        <div className="zpa-drawer-head">
          {user.photoUrl ? <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" /> : <span className="zpa-avatar big">{(user.displayName || user.email || '?').charAt(0).toUpperCase()}</span>}
          <div>
            <h3>{user.displayName || '—'} {prof.verified && <span className="zpa-verified" title="Verified">✓</span>} {prof.companyLabel && <span className="zpa-chip">{prof.companyLabel}</span>}</h3>
            <small>{prof.username ? `@${prof.username} · ` : ''}{user.email || 'no email'}</small>
            <div className="zpa-drawer-tags">
              <span className={`zpa-pill ${plan === 'FREE' ? 'muted' : 'good'}`}>{plan}</span>
              <span className={`zpa-pill ${d.ban ? 'bad' : 'good'}`}>{d.ban ? 'BANNED' : (user.accountStatus || 'ACTIVE')}</span>
              {user.emailVerified && <span className="zpa-pill good">Email verified</span>}
            </div>
          </div>
          <button className="zpa-icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>

        {info.loading && !info.data ? <div className="zpa-state"><span className="zpa-spin" />Loading…</div> : (
          <div className="zpa-drawer-body">
            <div className="zpa-actions-grid">
              <button className="zpa-btn" disabled={busy} onClick={() => grant('PLUS')}><Anim name="star" fallback="crown" size={16} />Give Plus</button>
              <button className="zpa-btn primary" disabled={busy} onClick={() => grant('PRO')}><Anim name="award" fallback="crown" size={16} />Give Pro</button>
              <button className="zpa-btn" disabled={busy} onClick={resetLink}><Anim name="mail" fallback="inbox" size={16} />Reset link</button>
              <button className="zpa-btn" disabled={busy} onClick={() => setVerified(!prof.verified)}><Anim name="shield" fallback="check" size={16} />{prof.verified ? 'Unverify' : 'Verify'}</button>
              <button className="zpa-btn" disabled={busy} onClick={setCompany}><Anim name="bookmark" fallback="check" size={16} />Label</button>
              <button className="zpa-btn" disabled={busy} onClick={setUsername}><Anim name="link" fallback="api" size={16} />Username</button>
              {plan !== 'FREE' && <button className="zpa-btn danger" disabled={busy} onClick={revoke}>Remove plan</button>}
            </div>

            <h4>Account</h4>
            <dl className="zpa-dl">
              <div><dt>PassGram ID</dt><dd className="mono">{user.zPassId || '—'}</dd></div>
              <div><dt>User id</dt><dd className="mono">{uid}</dd></div>
              <div><dt>Signed up</dt><dd>{fmtDate(user.createdAt)}</dd></div>
              <div><dt>Last seen</dt><dd>{ago(user.lastSeenAt || user.lastLoginAt)}</dd></div>
              <div><dt>Sign-in methods</dt><dd>{(user.providers || []).join(', ') || '—'}</dd></div>
              <div><dt>Last IP</dt><dd className="mono">{user.lastIp ? `${user.lastIp}${user.lastCity ? ' · ' + user.lastCity : ''}${user.lastCountry ? ' · ' + country(user.lastCountry) : ''}` : '—'}</dd></div>
              <div><dt>Plan expires</dt><dd>{plan === 'FREE' ? '—' : fmtDate(d.sub?.expiresAt)}</dd></div>
            </dl>

            <h4>Devices <span className="zpa-dim">· {live.length} active</span></h4>
            {!d.devices?.length ? <div className="zpa-state">No devices recorded.</div> : (
              <div className="zpa-devices">
                {d.devices.map((x) => {
                  const pf = platformOf(x.platform)
                  return (
                    <div key={x.id} className={`zpa-device ${x.revoked ? 'off' : ''}`}>
                      <span className="zpa-stat-icon"><Anim name={pf.anim} fallback="core" size={18} /></span>
                      <div><strong>{x.deviceName || pf.label}</strong><small>{pf.label}{x.appVersion ? ` · v${x.appVersion}` : ''}{x.lastCity ? ` · ${x.lastCity}` : ''}{x.countryCode ? ` · ${country(x.countryCode)}` : ''}</small>{x.lastIp && <small className="mono">IP {x.lastIp}</small>}</div>
                      <small>{x.revoked ? 'signed out' : ago(x.lastSeenAt)}</small>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="zpa-note">IP address, city and country are recorded by the server only when the person allowed optional data in the app.</p>

            <h4>Payments</h4>
            {!d.pays?.length && !d.crypto?.length ? <div className="zpa-state">No payments.</div> : (
              <div className="zpa-devices">
                {d.pays.map((r) => <div key={r.id} className="zpa-device"><span className="zpa-pill good">PAID</span><div><strong>{money(r.amountUsd)} · {r.plan || ''} {r.billing || ''}</strong><small>{r.provider || 'card'} · {fmtDate(r.createdAt)}</small></div></div>)}
                {d.crypto.map((r) => <div key={r.id} className="zpa-device"><Pill>{r.status}</Pill><div><strong>${r.amountUsd} · {r.plan}</strong><small>{r.network} · {fmtDate(r.createdAt)}</small></div></div>)}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
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
    if (form.forceUpdate && !(await ask({ title: 'Force every Android app to update?', message: 'Force update is ON: older Android versions must update before they can be used.', confirm: 'Publish', danger: true }))) return
    setSaving(true)
    try {
      await fs.setDoc(ref, {
        latestVersionName: form.latestVersionName.trim(), latestVersionCode: code, minimumSupportedVersionCode: min,
        updateUrl: form.updateUrl.trim(), forceUpdate: !!form.forceUpdate,
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
          <h4>Android update policy</h4>
          <label className="zpa-switch"><input type="checkbox" checked={!!form.forceUpdate} onChange={set('forceUpdate')} /><span />Force update</label>
          <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>Announcements and maintenance are now per platform, in the card below.</p>
        </div>
      </div>
      <div className="zpa-form-row end">
        <button className="zpa-btn primary" disabled={saving || cfg.loading} onClick={save}><Icon name="rocket" size={15} />{saving ? 'Publishing…' : 'Publish changes'}</button>
      </div>
    </Card>
  )
}

const PW_FIELDS = { Enabled: false, EveryHours: 72, MaxShows: 3, DelaySeconds: 20, DefaultTier: 'pro', Title: '', Offer: '', OfferBilling: 'monthly', Cta: '', CampaignId: '' }
// Android keeps the original field names (paywallEnabled…); website and Windows use their own (paywallWebEnabled…, paywallWinEnabled…).
const PW_PLATFORMS = [
  { value: 'android', label: 'Android app', prefix: 'paywall' },
  { value: 'web', label: 'Website', prefix: 'paywallWeb' },
  { value: 'win', label: 'Windows app', prefix: 'paywallWin' },
]
function Paywall({ fb, ask, toast }) {
  const { fs, db } = fb
  const ref = fs.doc(db, 'app_config', 'public')
  const [platform, setPlatform] = useState('android')
  const prefix = PW_PLATFORMS.find((x) => x.value === platform).prefix
  const [form, setForm] = useState(PW_FIELDS)
  const [saving, setSaving] = useState(false)
  const cfg = useLoader(async () => (await fs.getDoc(ref)).data() || {}, [])
  useEffect(() => {
    if (cfg.data) setForm(Object.fromEntries(Object.keys(PW_FIELDS).map((k) => [k, cfg.data[prefix + k] ?? PW_FIELDS[k]])))
  }, [cfg.data, prefix])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const label = PW_PLATFORMS.find((x) => x.value === platform).label
  const save = async (newCampaign) => {
    const every = Number(form.EveryHours), max = Number(form.MaxShows), delay = Number(form.DelaySeconds)
    if (!(every >= 0 && every <= 2160) || !(max >= 0 && max <= 1000) || !(delay >= 0 && delay <= 600)) return toast('Check the numbers: hours 0–2160, max 0–1000, delay 0–600 s.', 'bad')
    if (newCampaign && !(await ask({ title: `Show the pop-up again on ${label}?`, message: `Starts a new ${label} campaign: every signed-in free user sees it again.`, confirm: 'Start campaign' }))) return
    setSaving(true)
    try {
      const enabled = newCampaign ? true : !!form.Enabled
      const v = {
        Enabled: enabled, EveryHours: every, MaxShows: max, DelaySeconds: delay,
        DefaultTier: form.DefaultTier === 'plus' ? 'plus' : 'pro',
        Title: String(form.Title).trim().slice(0, 80), Offer: String(form.Offer).trim().slice(0, 80),
        OfferBilling: form.OfferBilling === 'yearly' ? 'yearly' : 'monthly', Cta: String(form.Cta).trim().slice(0, 40),
        CampaignId: newCampaign || (enabled && !form.CampaignId) ? 'c' + Date.now() : form.CampaignId || '',
      }
      await fs.setDoc(ref, { ...Object.fromEntries(Object.entries(v).map(([k, x]) => [prefix + k, x])), updatedAt: fs.serverTimestamp() }, { merge: true })
      toast(newCampaign ? `New ${label} campaign started.` : `${label} pop-up saved.`); cfg.reload()
    } catch (error) { toast(errorText(error), 'bad') } finally { setSaving(false) }
  }
  if (cfg.error) return <Card title="Subscription pop-up"><div className="zpa-state bad">{cfg.error}</div></Card>
  return (
    <Card title="Subscription pop-up" hint="X-style upgrade sheet. Each platform has its own settings, so the app, the website and the Windows app can run different offers."
      actions={<button className="zpa-btn ghost sm" onClick={cfg.reload}><Icon name="refresh" size={15} />Reload</button>}>
      <div className="zpa-toolbar"><Segmented value={platform} options={PW_PLATFORMS.map(({ value, label }) => ({ value, label }))} onChange={setPlatform} />
        <span className={`zpa-pill ${form.Enabled ? 'good' : 'muted'}`}>{form.Enabled ? 'ON' : 'OFF'} on {label}</span></div>
      <div className="zpa-grid3">
        <div className="zpa-tile">
          <h4>When</h4>
          <label className="zpa-switch"><input type="checkbox" checked={!!form.Enabled} onChange={set('Enabled')} /><span />Pop-up enabled</label>
          <label className="zpa-field"><span>Minimum hours between pop-ups</span><input type="number" min="0" value={form.EveryHours} onChange={set('EveryHours')} /></label>
          <label className="zpa-field"><span>Max per user per campaign (0 = no limit)</span><input type="number" min="0" value={form.MaxShows} onChange={set('MaxShows')} /></label>
          <label className="zpa-field"><span>Delay after opening (seconds)</span><input type="number" min="0" value={form.DelaySeconds} onChange={set('DelaySeconds')} /></label>
        </div>
        <div className="zpa-tile">
          <h4>Content</h4>
          <label className="zpa-field"><span>Headline (empty = default)</span><input value={form.Title} onChange={set('Title')} placeholder="One subscription. Everything protected." /></label>
          <label className="zpa-field"><span>Button text (empty = “Upgrade to …”)</span><input value={form.Cta} onChange={set('Cta')} placeholder="Claim limited-time offer" /></label>
          <label className="zpa-field"><span>Plan tab selected first</span><select value={form.DefaultTier} onChange={set('DefaultTier')}><option value="pro">Pro</option><option value="plus">Plus</option></select></label>
        </div>
        <div className="zpa-tile">
          <h4>Offer</h4>
          <label className="zpa-field"><span>Blue offer line (empty = none)</span><input value={form.Offer} onChange={set('Offer')} placeholder="50% off your first month" /></label>
          <label className="zpa-field"><span>Show the offer on</span><select value={form.OfferBilling} onChange={set('OfferBilling')}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
          <p style={{ fontSize: 12, opacity: 0.7, margin: '6px 0 0' }}>The offer line is display text only. Make sure the real discount exists in Stripe.</p>
        </div>
      </div>
      <div className="zpa-form-row end">
        <button className="zpa-btn ghost" disabled={saving || cfg.loading} onClick={() => save(true)}><Anim name="refresh" fallback="rocket" size={15} />Show again to everyone</button>
        <button className="zpa-btn primary" disabled={saving || cfg.loading} onClick={() => save(false)}>{saving ? 'Saving…' : `Save ${label}`}</button>
      </div>
    </Card>
  )
}

// Android keeps the original names (announcement, maintenanceMode…); the website and Windows app use their own.
const STATUS_PLATFORMS = [
  { value: 'android', label: 'Android app', prefix: '' },
  { value: 'web', label: 'Website', prefix: 'web' },
  { value: 'win', label: 'Windows app', prefix: 'win' },
]
const statusKey = (prefix, name) => (prefix ? prefix + name.charAt(0).toUpperCase() + name.slice(1) : name)
function PlatformStatus({ fb, ask, toast }) {
  const { fs, db } = fb
  const ref = fs.doc(db, 'app_config', 'public')
  const [target, setTarget] = useState('all')
  const [form, setForm] = useState({ announcement: '', maintenanceMode: false, maintenanceMessage: '' })
  const [saving, setSaving] = useState(false)
  const cfg = useLoader(async () => (await fs.getDoc(ref)).data() || {}, [])
  const read = (prefix, data) => ({
    announcement: data[statusKey(prefix, 'announcement')] || '',
    maintenanceMode: !!data[statusKey(prefix, 'maintenanceMode')],
    maintenanceMessage: data[statusKey(prefix, 'maintenanceMessage')] || '',
  })
  useEffect(() => { if (cfg.data) setForm(read(target === 'all' ? '' : STATUS_PLATFORMS.find((x) => x.value === target).prefix, cfg.data)) }, [cfg.data, target])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const targets = target === 'all' ? STATUS_PLATFORMS : STATUS_PLATFORMS.filter((x) => x.value === target)
  const names = targets.map((x) => x.label).join(', ')
  const save = async () => {
    if (form.maintenanceMode && !(await ask({ title: `Maintenance ON for ${names}?`, message: 'People on these platforms cannot use PassGram until you turn it off.', confirm: 'Turn on', danger: true }))) return
    setSaving(true)
    try {
      const text = form.announcement.trim()
      const update = { updatedAt: fs.serverTimestamp() }
      for (const t of targets) {
        const old = (cfg.data?.[statusKey(t.prefix, 'announcement')] || '').trim()
        update[statusKey(t.prefix, 'announcement')] = text
        update[statusKey(t.prefix, 'announcementId')] = text === old ? cfg.data?.[statusKey(t.prefix, 'announcementId')] || '' : text ? 'a' + Date.now() : ''
        update[statusKey(t.prefix, 'maintenanceMode')] = !!form.maintenanceMode
        update[statusKey(t.prefix, 'maintenanceMessage')] = form.maintenanceMessage.trim() || 'PassGram is temporarily under maintenance.'
      }
      await fs.setDoc(ref, update, { merge: true })
      toast(`Published to ${names}.`); cfg.reload()
    } catch (error) { toast(errorText(error), 'bad') } finally { setSaving(false) }
  }
  const live = (prefix) => cfg.data && !!cfg.data[statusKey(prefix, 'maintenanceMode')]
  return (
    <Card title="Announcements & maintenance" hint="Send a message or pause PassGram on one platform, or on all of them at once."
      actions={<button className="zpa-btn ghost sm" onClick={cfg.reload}><Icon name="refresh" size={15} />Reload</button>}>
      <div className="zpa-toolbar">
        <Segmented value={target} options={[{ value: 'all', label: 'All platforms' }, ...STATUS_PLATFORMS.map(({ value, label }) => ({ value, label }))]} onChange={setTarget} />
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{STATUS_PLATFORMS.map((x) => <span key={x.value} className={`zpa-pill ${live(x.prefix) ? 'bad' : 'good'}`}>{x.label}: {live(x.prefix) ? 'maintenance' : 'live'}</span>)}</span>
      </div>
      {target === 'all' && <p className="zpa-note" style={{ marginBottom: 10 }}>Shows the Android values. Saving writes the same announcement and status to all three platforms.</p>}
      <div className="zpa-grid2">
        <div className="zpa-tile">
          <h4>Announcement</h4>
          <label className="zpa-field"><span>Message shown once to everyone on {target === 'all' ? 'every platform' : names}</span><textarea rows={3} value={form.announcement} onChange={set('announcement')} placeholder="What's new" /></label>
        </div>
        <div className="zpa-tile">
          <h4>Status</h4>
          <label className="zpa-switch"><input type="checkbox" checked={!!form.maintenanceMode} onChange={set('maintenanceMode')} /><span />Maintenance mode</label>
          <label className="zpa-field"><span>Maintenance message</span><input value={form.maintenanceMessage} onChange={set('maintenanceMessage')} placeholder="PassGram is temporarily under maintenance." /></label>
        </div>
      </div>
      <div className="zpa-form-row end">
        <button className="zpa-btn primary" disabled={saving || cfg.loading} onClick={save}><Anim name="upload-cloud" fallback="rocket" size={15} />{saving ? 'Publishing…' : `Publish to ${target === 'all' ? 'all platforms' : names}`}</button>
      </div>
    </Card>
  )
}

// ---------------- Moderation (Telegram style bans) ----------------
// chat_bans/{uid} bans an account; chat_bans/group_{gid} closes a group or channel for everyone.
// Firestore rules make the collection admin-only and refuse messages from banned accounts / in closed groups.
function Moderation({ fb, ask, toast }) {
  const { fs, db } = fb
  const [kind, setKind] = useState('user')
  const [target, setTarget] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const bans = useLoader(async () => {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'chat_bans'), fs.orderBy('bannedAt', 'desc'), fs.limit(200)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }, [])

  // "@name", "zpas.org/name" or a raw id → { id, name } for a person or a group/channel
  const resolve = async (raw, wantGroup) => {
    const text = String(raw || '').trim().replace(/^https?:\/\/(www\.)?zpas\.org\//i, '').replace(/^zpas\.org\//i, '').replace(/^@/, '')
    if (!text) throw Error('Enter a @username or an id.')
    const handle = text.toLowerCase()
    if (/^[a-z0-9_]{4,32}$/.test(handle)) {
      const row = await fs.getDoc(fs.doc(db, 'chat_usernames', handle))
      if (row.exists()) {
        const d = row.data()
        if (wantGroup) { if (!d.gid) throw Error(`@${handle} is not a group or channel.`); return { id: d.gid, name: '@' + handle } }
        if (d.gid || d.botId) throw Error(`@${handle} is not a person. Use the Group / channel tab.`)
        return { id: d.uid, name: '@' + handle }
      }
    }
    if (/^[A-Za-z0-9_-]{6,128}$/.test(text)) return { id: text, name: text }
    throw Error('Not found: ' + raw)
  }

  const ban = async () => {
    setBusy(true)
    try {
      const wantGroup = kind === 'group'
      const { id, name } = await resolve(target, wantGroup)
      const ok = await ask({
        title: wantGroup ? `Close ${name}?` : `Ban ${name}?`,
        message: wantGroup ? 'Every member sees "This channel can\'t be displayed … violates the Z Pass Terms of Service" and nobody can post.'
          : 'The person sees "Your account was banned by Z Pass for violating the Z Pass Terms of Service" and can no longer send messages.',
        confirm: wantGroup ? 'Close' : 'Ban', danger: true,
      })
      if (!ok) return
      const docId = wantGroup ? 'group_' + id : id
      await fs.setDoc(fs.doc(db, 'chat_bans', docId), {
        banned: true, type: wantGroup ? 'group' : 'user', [wantGroup ? 'gid' : 'uid']: id, username: name,
        reason: reason.trim().slice(0, 200), bannedAt: fs.serverTimestamp(), by: fb.auth?.currentUser?.uid || '',
      })
      toast(wantGroup ? `${name} closed.` : `${name} banned.`); setTarget(''); setReason(''); bans.reload()
    } catch (error) { toast(errorText(error), 'bad') } finally { setBusy(false) }
  }

  const unban = async (row) => {
    if (!(await ask({ title: `Lift the ban on ${row.username || row.id}?`, message: 'They can use chats again right away.', confirm: 'Lift ban' }))) return
    try { await fs.deleteDoc(fs.doc(db, 'chat_bans', row.id)); toast('Ban lifted.'); bans.reload() } catch (error) { toast(errorText(error), 'bad') }
  }

  const deleteGroup = async (row) => {
    const gid = row.gid || row.id.replace(/^group_/, '')
    if (!(await ask({ title: `Delete ${row.username || gid} permanently?`, message: 'The group / channel is removed for every member. This cannot be undone.', confirm: 'Delete', danger: true }))) return
    try {
      await fs.deleteDoc(fs.doc(db, 'chat_groups', gid))
      const handle = String(row.username || '').replace(/^@/, '')
      if (handle) await fs.deleteDoc(fs.doc(db, 'chat_usernames', handle)).catch(() => {})
      toast('Deleted.'); bans.reload()
    } catch (error) { toast(errorText(error), 'bad') }
  }

  return (
    <>
      <Card title="Ban or close" hint="Bans apply instantly in the app. Banned people keep their account but cannot use chats; closed groups and channels disappear for every member.">
        <div className="zpa-form-row">
          <label className="zpa-field"><span>Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)}><option value="user">Person</option><option value="group">Group / channel</option></select></label>
          <label className="zpa-field" style={{ flex: 2 }}><span>{kind === 'user' ? '@username or user id' : '@username, zpas.org/link or group id'}</span>
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={kind === 'user' ? '@username' : '@channel'} /></label>
          <label className="zpa-field" style={{ flex: 2 }}><span>Reason (shown to them, optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Spam, scam, abuse…" maxLength={200} /></label>
        </div>
        <div className="zpa-form-row end">
          <button className="zpa-btn primary" disabled={busy || !target.trim()} onClick={ban}><Icon name="shield" size={15} />{busy ? 'Working…' : kind === 'user' ? 'Ban person' : 'Close group / channel'}</button>
        </div>
      </Card>
      <Card title="Active bans" hint="Lift a ban, or delete a closed group / channel for good." actions={<button className="zpa-btn ghost sm" onClick={bans.reload}><Icon name="refresh" size={15} />Refresh</button>}>
        <Table rows={bans.data} loading={bans.loading} error={bans.error} empty="Nobody is banned."
          columns={[
            { label: 'Type', render: (r) => (r.type === 'group' ? 'Group / channel' : 'Person') },
            { label: 'Who', render: (r) => r.username || r.uid || r.gid || r.id },
            { label: 'Id', mono: true, render: (r) => r.uid || r.gid || r.id },
            { label: 'Reason', render: (r) => r.reason || '—' },
            { label: 'When', render: (r) => fmtDate(r.bannedAt) },
            { label: '', render: (r) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button className="zpa-btn ghost sm" onClick={() => unban(r)}>Lift</button>
                {r.type === 'group' && <button className="zpa-btn ghost sm" onClick={() => deleteGroup(r)}>Delete</button>}
              </span>
            ) },
          ]} />
      </Card>
    </>
  )
}

// ---------------- Verification (blue check requests from Zbot /verify) ----------------
// People apply in the app (Verify Bot, zpas.org/verifybot). The bot server checks they own the account or bot.
// Approving sets chat_profiles/{id}.verified = true, which shows the blue check everywhere.
const linkHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
function Verification({ fb, ask, toast }) {
  const { fs, db, auth } = fb
  const [status, setStatus] = useState('pending')
  const [busy, setBusy] = useState('')
  const list = useLoader(async () => {
    const q = fs.query(fs.collection(db, 'zp_verify_requests'), fs.where('status', '==', status), fs.limit(100))
    const rows = (await fs.getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }))
    return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }, [status])
  const decide = async (r, approve) => {
    let reason = ''
    if (!approve) {
      reason = (window.prompt(`Why is @${r.username} rejected? They will see this in Zbot (/myverify).`, 'No zpas.org link on the official accounts.') || '').trim()
      if (!reason) return
    }
    let company = ''
    if (approve) {
      if (!(await ask({ title: `Verify @${r.username}?`, message: 'The blue check appears on this ' + (r.kind === 'bot' ? 'bot' : 'account') + ' everywhere in PassGram right away.', confirm: 'Verify' }))) return
      // optional company / brand name next to the name ("Google", "X"…); prefilled with what they asked for
      const typed = window.prompt('Company name to show next to the name (optional, max 32). Leave empty for none.', r.company || '')
      if (typed === null) return
      company = typed.trim().replace(/\s+/g, ' ').slice(0, 32)
    }
    setBusy(r.id)
    try {
      const batch = fs.writeBatch(db)
      batch.update(fs.doc(db, 'zp_verify_requests', r.id), { status: approve ? 'approved' : 'rejected', reason, decidedAt: Date.now(), decidedBy: auth.currentUser?.uid || '' })
      if (approve) batch.update(fs.doc(db, 'chat_profiles', r.id), { verified: true, ...(company ? { companyLabel: company } : {}) })
      await batch.commit()
      toast(approve ? `@${r.username} is verified.` : `@${r.username} was rejected.`)
      list.reload()
    } catch (error) { toast(errorText(error), 'bad') } finally { setBusy('') }
  }
  return (
    <Card title="Blue check requests" hint="Applications from Verify Bot (zpas.org/verifybot). Check that the official accounts are real and link back to zpas.org/username."
      actions={<button className="zpa-btn ghost sm" onClick={list.reload}><Icon name="refresh" size={15} />Reload</button>}>
      <div className="zpa-toolbar">
        <Segmented value={status} onChange={setStatus} options={[
          { value: 'pending', label: 'Waiting' }, { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }, { value: 'removed', label: 'Removed by owner' }]} />
      </div>
      <Table loading={list.loading} error={list.error} rows={list.data}
        empty={status === 'pending' ? 'No requests waiting. 🎉' : 'Nothing here.'}
        columns={[
          { label: 'Who', render: (r) => <span><strong>@{r.username}</strong> <span className={`zpa-pill ${r.kind === 'bot' ? 'warn' : 'muted'}`}>{r.kind === 'bot' ? 'BOT' : 'ACCOUNT'}</span></span> },
          { label: 'Official accounts', render: (r) => <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{(r.links || []).map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer">{linkHost(u)} ↗</a>)}</span> },
          { label: 'Press', render: (r) => (r.press || []).length ? <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{r.press.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer">{linkHost(u)} ↗</a>)}</span> : '—' },
          { label: 'Company', render: (r) => r.company || '—' },
          { label: 'Note', render: (r) => r.note || '—' },
          { label: 'Sent', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') },
          { label: status === 'pending' ? '' : 'Result', render: (r) => status === 'pending' ? (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <button className="zpa-btn primary sm" disabled={busy === r.id} onClick={() => decide(r, true)}><Icon name="check" size={14} />Verify</button>
              <button className="zpa-btn ghost sm" disabled={busy === r.id} onClick={() => decide(r, false)}>Reject</button>
            </span>
          ) : (r.reason || (r.decidedAt ? new Date(r.decidedAt).toLocaleString() : '—')) },
        ]} />
    </Card>
  )
}

/* ---------------- usernames: reserved list (remote JSON) + give a username / deep link ---------------- */
function Usernames({ fb, ask, toast }) {
  const { fs, db, auth } = fb
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(null) // the text as stored; null while loading
  const [meta, setMeta] = useState({})
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const area = useRef(null)
  const gutter = useRef(null)
  const load = useCallback(async () => {
    setLoadError('')
    try {
      const snap = await fs.getDoc(fs.doc(db, 'config', 'usernames'))
      const stored = snap.exists() ? String(snap.data().json || '') : ''
      setSaved(stored); setText(stored || DEFAULT_TEXT)
      setMeta(snap.exists() ? { at: snap.data().updatedAt, by: snap.data().updatedBy, live: true } : { live: false })
    } catch (error) { setLoadError(errorText(error)) }
  }, [fs, db])
  useEffect(() => { load() }, [load])
  const check = useMemo(() => parseReserved(text), [text])
  const dirty = saved !== null && text !== saved
  const lines = useMemo(() => text.split('\n').length, [text])

  const save = async () => {
    if (!check.ok || saving) return
    if (!(await ask({ title: 'Save reserved usernames?', message: `${check.total} names in ${check.lists.length} lists. From now on nobody can claim them; only you can give them out.`, confirm: 'Save' }))) return
    setSaving(true)
    try {
      await fs.setDoc(fs.doc(db, 'config', 'usernames'), { json: text, names: check.names, count: check.total, updatedAt: fs.serverTimestamp(), updatedBy: auth.currentUser?.email || '' })
      toast('Saved. The list is live in the apps.')
      await load()
    } catch (error) { toast(errorText(error), 'bad') } finally { setSaving(false) }
  }
  const format = () => { if (check.ok) setText(JSON.stringify(JSON.parse(text), null, 2)) }
  const keys = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save() }
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget, a = el.selectionStart, b = el.selectionEnd
      setText(text.slice(0, a) + '  ' + text.slice(b))
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 2 })
    }
  }
  const jumpTo = (line) => {
    const el = area.current
    if (!el || !line) return
    const all = text.split('\n')
    const at = all.slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0)
    el.focus(); el.selectionStart = at; el.selectionEnd = at + (all[line - 1] || '').length
    el.scrollTop = Math.max(0, (line - 5) * 21)
  }

  return (
    <>
      <Card title="Reserved usernames"
        hint="Nobody can claim these names or their links (zpas.org/name). Countries and government names go only to the real government, after you talk with them. Each top-level list is a group; text values are just notes."
        actions={<>
          <button className="zpa-btn ghost sm" onClick={format} disabled={!check.ok}><Icon name="braces" size={15} />Format</button>
          <button className="zpa-btn ghost sm" onClick={() => setText(saved || DEFAULT_TEXT)} disabled={!dirty}><Icon name="refresh" size={15} />Revert</button>
          <button className="zpa-btn primary sm" onClick={save} disabled={!check.ok || saving || (!dirty && meta.live)}><Icon name="save" size={15} />{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        {loadError ? <div className="zpa-names-error">{loadError} <button className="zpa-btn ghost sm" onClick={load}>Retry</button></div> : saved === null ? <div className="zpa-code-loading">Loading…</div> : (
          <>
            <div className="zpa-names-stats">
              <span className={`zpa-pill ${meta.live ? 'good' : 'warn'}`}>{meta.live ? 'Live' : 'Not saved yet — this is the starter list'}</span>
              {check.ok && check.lists.map((l) => <span key={l.list} className="zpa-pill muted">{l.list} · {l.count}</span>)}
              {meta.at && <span className="zpa-names-when">Saved {fmtDate(meta.at)}{meta.by ? ` by ${meta.by}` : ''}</span>}
            </div>
            <div className={`zpa-code ${check.ok ? '' : 'invalid'}`}>
              <pre ref={gutter} className="zpa-code-gutter" aria-hidden="true">{Array.from({ length: lines }, (_, i) => i + 1).join('\n')}</pre>
              <textarea ref={area} value={text} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off"
                onChange={(e) => setText(e.target.value)} onKeyDown={keys}
                onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop }} aria-label="Reserved usernames JSON" />
            </div>
            <div className={`zpa-code-status ${check.ok ? 'ok' : 'bad'}`}>
              {check.ok
                ? <><Icon name="check" size={14} />Valid · {check.total} names in {check.lists.length} lists{dirty ? ' · unsaved changes (Ctrl+S to save)' : ''}</>
                : <><Icon name="x" size={14} />{check.error}{check.line ? <button type="button" className="zpa-linkbtn" onClick={() => jumpTo(check.line)}>Go to line {check.line}</button> : null}</>}
            </div>
          </>
        )}
      </Card>
      <GiveUsername fb={fb} ask={ask} toast={toast} reserved={check.ok ? check.names : {}} />
    </>
  )
}

function GiveUsername({ fb, ask, toast, reserved }) {
  const { fs, db } = fb
  const [name, setName] = useState('')
  const [who, setWho] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState(null)
  const clean = name.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?zpas\.org\//, '').replace(/^@/, '')

  // @username, PassGram ID or account id → account id
  const findUid = async (value) => {
    const v = value.trim().replace(/^(https?:\/\/)?(www\.)?zpas\.org\//, '')
    if (!v) return null
    if (/^\d{8,14}$/.test(v)) {
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'users'), fs.where('zPassId', '==', v), fs.limit(1)))
      return snap.docs[0]?.id || null
    }
    if (v.startsWith('@') || /^[a-z0-9_]{1,32}$/i.test(v)) {
      const handle = await fs.getDoc(fs.doc(db, 'chat_usernames', v.replace(/^@/, '').toLowerCase()))
      if (handle.exists() && handle.data().uid && !handle.data().gid) return handle.data().uid
      if (v.startsWith('@')) return null
    }
    return (await fs.getDoc(fs.doc(db, 'chat_profiles', v))).exists() ? v : null
  }
  const lookup = async () => {
    if (!NAME.test(clean)) { setInfo({ bad: 'Usernames use a–z, 0–9 and _ (max 32).' }); return }
    setBusy(true)
    try {
      const handle = await fs.getDoc(fs.doc(db, 'chat_usernames', clean))
      let owner = null
      if (handle.exists()) {
        const d = handle.data()
        if (d.gid) owner = { label: 'a group or channel', gid: d.gid }
        else {
          const p = await fs.getDoc(fs.doc(db, 'chat_profiles', d.uid))
          owner = { uid: d.uid, label: p.exists() ? (p.data().displayName || p.data().firstName || d.uid) : d.uid }
        }
      }
      setInfo({ name: clean, owner, list: reserved[clean] || reserved[clean.replace(/_/g, '')] || '' })
    } catch (error) { toast(errorText(error), 'bad') } finally { setBusy(false) }
  }
  const give = async () => {
    if (!NAME.test(clean)) { toast('Usernames use a–z, 0–9 and _ (max 32).', 'bad'); return }
    setBusy(true)
    try {
      const uid = await findUid(who)
      if (!uid) { toast('Person not found. Use their @username, PassGram ID or account id.', 'bad'); return }
      const profile = await fs.getDoc(fs.doc(db, 'chat_profiles', uid))
      if (!profile.exists()) { toast('This person has no PassGram chat profile yet (they must open Chats once).', 'bad'); return }
      const person = profile.data().displayName || profile.data().firstName || uid
      const old = String(profile.data().username || '')
      if (old === clean) { toast(`${person} already has @${clean}.`); return }
      const handle = await fs.getDoc(fs.doc(db, 'chat_usernames', clean))
      const prev = handle.exists() ? handle.data() : null
      if (prev?.gid) { toast(`@${clean} belongs to a group or channel. Release it first.`, 'bad'); return }
      const takeOver = !!(prev && prev.uid !== uid)
      const steps = [`${person} gets @${clean} and the link zpas.org/${clean}.`]
      if (old) steps.push(`Their old username @${old} becomes free.`)
      if (takeOver) steps.push('The current owner loses it.')
      if (!(await ask({ title: `Give @${clean}?`, message: steps.join(' '), confirm: 'Give username', danger: takeOver }))) return
      const batch = fs.writeBatch(db)
      if (takeOver) {
        batch.delete(fs.doc(db, 'chat_usernames', clean))
        const prevProfile = await fs.getDoc(fs.doc(db, 'chat_profiles', prev.uid))
        if (prevProfile.exists() && prevProfile.data().username === clean) batch.update(fs.doc(db, 'chat_profiles', prev.uid), { username: '' })
      }
      if (old) batch.delete(fs.doc(db, 'chat_usernames', old))
      batch.set(fs.doc(db, 'chat_usernames', clean), { uid })
      batch.update(fs.doc(db, 'chat_profiles', uid), { username: clean })
      await batch.commit()
      toast(`@${clean} now belongs to ${person}.`)
      setWho('')
      await lookup()
    } catch (error) { toast(errorText(error), 'bad') } finally { setBusy(false) }
  }
  const release = async () => {
    if (!info?.owner) return
    if (!(await ask({ title: `Release @${info.name}?`, message: `${info.owner.label} loses @${info.name}. It stays reserved if it is on the list above.`, confirm: 'Release', danger: true }))) return
    setBusy(true)
    try {
      const batch = fs.writeBatch(db)
      batch.delete(fs.doc(db, 'chat_usernames', info.name))
      if (info.owner.uid) {
        const p = await fs.getDoc(fs.doc(db, 'chat_profiles', info.owner.uid))
        if (p.exists() && p.data().username === info.name) batch.update(fs.doc(db, 'chat_profiles', info.owner.uid), { username: '' })
      }
      await batch.commit()
      toast(`@${info.name} was released.`)
      await lookup()
    } catch (error) { toast(errorText(error), 'bad') } finally { setBusy(false) }
  }
  return (
    <Card title="Give a username" hint="Give any name to a person, also reserved ones like a country or a 1–4 letter company name. Their link zpas.org/name works right away and opens their chat in the apps.">
      <div className="zpa-give">
        <label className="zpa-field grow"><span>Username / deep link</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setInfo(null) }} onKeyDown={(e) => { if (e.key === 'Enter') lookup() }} placeholder="turkey" autoCapitalize="off" spellCheck={false} /></label>
        <label className="zpa-field grow"><span>Give to</span>
          <input value={who} onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') give() }} placeholder="@username, PassGram ID or account id" autoCapitalize="off" spellCheck={false} /></label>
        <div className="zpa-give-actions">
          <button className="zpa-btn ghost" onClick={lookup} disabled={busy || !clean}><Icon name="search" size={15} />Check</button>
          <button className="zpa-btn primary" onClick={give} disabled={busy || !clean || !who.trim()}><Icon name="at" size={15} />Give username</button>
        </div>
      </div>
      {info && (
        <div className="zpa-give-info">
          {info.bad ? <span className="zpa-pill bad">{info.bad}</span> : (
            <>
              <a href={`https://zpas.org/${info.name}`} target="_blank" rel="noopener noreferrer" className="mono">zpas.org/{info.name} ↗</a>
              {info.list ? <span className="zpa-pill warn">Reserved · {info.list}</span> : <span className="zpa-pill muted">Not reserved</span>}
              {info.owner
                ? <><span className="zpa-pill good">Owner: {info.owner.label}</span><button className="zpa-btn ghost sm" onClick={release} disabled={busy}>Release</button></>
                : <span className="zpa-pill muted">Free</span>}
            </>
          )}
        </div>
      )}
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
        <div className="zpa-logo"><img src="/resources/assets/app-logo/zpass.png" alt="" width="44" height="44" /></div>
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
  const [palette, setPalette] = useState(false)
  // Like api / bots / core.zpas.org: signed-out visitors only see a plain 404; the sign-in form needs /admin#signin.
  const [wantsSignIn, setWantsSignIn] = useState(false)
  useEffect(() => {
    const check = () => setWantsSignIn(location.hash === '#signin')
    check(); window.addEventListener('hashchange', check); return () => window.removeEventListener('hashchange', check)
  }, [])
  useEffect(() => {
    const key = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) } }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    try { const t = localStorage.getItem('zp-admin-theme'); if (t === 'light' || t === 'dark') setTheme(t) } catch {}
    const hash = location.hash.slice(1); if (NAV.some((n) => n.id === hash)) setView(hash)
    let unsub
    firebase().then((f) => {
      setFb(f)
      unsub = f.authSdk.onAuthStateChanged(f.auth, async (user) => {
        if (!user) return setSession({ state: 'signin', user: null })
        const claims = (await user.getIdTokenResult().catch(() => null))?.claims
        const ok = isAdminUser(user, claims)
        if (ok && location.hash === '#signin') history.replaceState(null, '', location.pathname)
        setSession({ state: ok ? 'admin' : 'denied', user })
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
  const props = { fb, ask, toast, go, user: session.user }
  const groups = [...new Set(NAV.map((n) => n.group))]

  return (
    <div className="zpa" data-theme={theme}>
      {session.state === 'loading' && <div className="zpa-auth"><span className="zpa-spin big" /></div>}
      {(session.state === 'signin' || session.state === 'denied') && (wantsSignIn
        ? <SignIn fb={fb} denied={session.state === 'denied'} user={session.user} />
        : <pre className="zpa-decoy">{JSON.stringify(session.state === 'denied' ? { ok: false, error_code: 403, description: 'Forbidden' } : { ok: false, error_code: 404, description: 'Not Found' })}</pre>)}
      {session.state === 'admin' && fb && (
        <div className={`zpa-shell ${navOpen ? 'nav-open' : ''}`}>
          <aside className="zpa-side">
            <div className="zpa-brand"><img src="/resources/assets/app-logo/zpass.png" alt="" width="34" height="34" /><div><strong>PassGram</strong><small>Admin console</small></div></div>
            <button type="button" className="zpa-jump" onClick={() => setPalette(true)}><Icon name="search" size={16} /><span>Jump to…</span><kbd>Ctrl K</kbd></button>
            <nav>
              {groups.map((g) => (
                <div key={g} className="zpa-nav-group">
                  <div className="zpa-side-label">{g}</div>
                  {NAV.filter((n) => n.group === g).map((n) => (
                    <button key={n.id} type="button" className={view === n.id ? 'on' : ''} onClick={() => go(n.id)}>
                      <Anim name={n.anim} fallback={n.icon} size={19} play={view === n.id} />{n.label}
                    </button>
                  ))}
                </div>
              ))}
              <div className="zpa-nav-group">
                <div className="zpa-side-label">Other panels</div>
                {EXTERNAL.map((l) => <a key={l.href} href={l.href}><Anim name={l.anim} fallback={l.icon} size={19} />{l.label}</a>)}
              </div>
            </nav>
            <div className="zpa-profile">
              {session.user.photoURL
                ? <img src={session.user.photoURL} alt="" width="38" height="38" referrerPolicy="no-referrer" />
                : <span className="zpa-avatar">{(session.user.displayName || session.user.email || '?').charAt(0).toUpperCase()}</span>}
              <div><strong>{session.user.displayName || session.user.email?.split('@')[0]}</strong><small title={session.user.email}>{session.user.email}</small><em>Admin</em></div>
              <button type="button" className="zpa-icon-btn" onClick={() => fb.authSdk.signOut(fb.auth)} aria-label="Sign out" title="Sign out"><Anim name="log-out" fallback="out" size={18} /></button>
            </div>
          </aside>
          <div className="zpa-scrim" onClick={() => setNavOpen(false)} />
          <div className="zpa-main">
            <div className="zpa-top">
              <button type="button" className="zpa-icon-btn zpa-menu" onClick={() => setNavOpen(true)} aria-label="Menu"><Icon name="menu" /></button>
              <span className="zpa-top-icon"><Anim name={current.anim} fallback={current.icon} size={20} play={view} /></span>
              <div><h1>{current.label}</h1><small>{current.hint}</small></div>
              <button type="button" className="zpa-icon-btn" onClick={() => setPalette(true)} aria-label="Search" title="Jump to (Ctrl K)"><Icon name="search" /></button>
              <button type="button" className="zpa-icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme"><Anim name={theme === 'dark' ? 'sun' : 'moon'} fallback={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button>
            </div>
            <div className="zpa-content" key={view}>
              {view === 'overview' && <Overview {...props} />}
              {view === 'requests' && <Requests {...props} />}
              {view === 'subscriptions' && <Subscriptions {...props} />}
              {view === 'users' && <Users {...props} />}
              {view === 'moderation' && <Moderation {...props} />}
              {view === 'usernames' && <Usernames {...props} />}
              {view === 'verification' && <Verification {...props} />}
              {view === 'payments' && <Payments {...props} />}
              {view === 'releases' && <><Releases {...props} /><PlatformStatus {...props} /></>}
              {view === 'paywall' && <Paywall {...props} />}
              {view === 'errors' && <Errors {...props} />}
            </div>
          </div>
        </div>
      )}
      {dialog && <Dialog spec={dialog.spec} onClose={closeDialog} />}
      {palette && session.state === 'admin' && <Palette onGo={go} onClose={() => setPalette(false)} />}
      <div className="zpa-toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`zpa-toast ${t.kind}`}>{t.text}</div>)}</div>
    </div>
  )
}
