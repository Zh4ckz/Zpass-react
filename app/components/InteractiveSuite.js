'use client'

import { useEffect, useState } from 'react'
import {
  generateTOTP,
  generateStrongPassword,
  evaluatePasswordStrength,
  checkHibpBreach,
  encryptZeroKnowledgePayload,
  decryptZeroKnowledgePayload,
} from './crypto-utils'

const SAMPLE_VAULT_ITEMS = [
  {
    id: 'github',
    badge: 'GH',
    title: 'GitHub Production',
    username: 'rezan@zpas.org',
    password: 'vK9#mP2$xL8@qW5!nZ3^rT7',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    note: 'SSH recovery keys stored in encrypted hardware token #2.',
    url: 'https://github.com',
  },
  {
    id: 'cloudflare',
    badge: 'CF',
    title: 'Cloudflare Edge Root',
    username: 'ops@zpas.org',
    password: 'CF_99#xR4!pL8$zQ2&mK7*wN',
    totpSecret: 'GEZDGNBVGY3TQOJQ',
    note: 'Worker deployment tokens rotated every 30 days.',
    url: 'https://dash.cloudflare.com',
  },
  {
    id: 'stripe',
    badge: 'ST',
    title: 'Stripe Treasury & Billing',
    username: 'billing@zpas.org',
    password: 'StR!pE_84$kM9#vB2@pQ6^zL',
    totpSecret: 'MFRGGZDFMZTWQ2LK',
    note: 'Webhook signing secret restricted to payment-worker.',
    url: 'https://dashboard.stripe.com',
  },
]

const SAMPLE_CSV = `name,url,username,password,note
GitHub,https://github.com,rezan@zpas.org,vK9#mP2$xL8@qW5,Primary Dev Account
Cloudflare,https://dash.cloudflare.com,ops@zpas.org,CF_99#xR4!pL8$zQ2,Workers DNS & Edge
ProtonMail,https://mail.proton.me,rezan@pm.me,Pr0t0n!98#zX4@qL1,Backup encrypted inbox
Stripe,https://dashboard.stripe.com,billing@zpas.org,StR!pE_84$kM9#vB2,Live merchant dashboard`

export default function InteractiveSuite({ t }) {
  const [activeTab, setActiveTab] = useState('vault')

  // Tab 1: Live Vault & TOTP state
  const [selectedItem, setSelectedItem] = useState(SAMPLE_VAULT_ITEMS[0])
  const [showPwd, setShowPwd] = useState(false)
  const [totpCode, setTotpCode] = useState('--- ---')
  const [totpSecondsLeft, setTotpSecondsLeft] = useState(30)
  const [copiedField, setCopiedField] = useState('')

  // Tab 2: Breach & Password Lab state
  const [testPassword, setTestPassword] = useState('PassGram#2026!ZeroKnowledge')
  const [breachResult, setBreachResult] = useState({ status: 'idle', count: 0, prefix: '' })
  const [checkingBreach, setCheckingBreach] = useState(false)

  // Tab 3: Encrypted Send state
  const [sendTitle, setSendTitle] = useState('Production API Recovery Key')
  const [sendSecret, setSendSecret] = useState('zp_live_98f72a4b6c1d3e5f009182736455_secret')
  const [sendExpiry, setSendExpiry] = useState('24h')
  const [generatedSendUrl, setGeneratedSendUrl] = useState('')
  const [decryptedPreview, setDecryptedPreview] = useState(null)

  // Tab 4: Vault Importer state
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV)
  const [importedRows, setImportedRows] = useState([])

  // Update real RFC-6238 TOTP every second
  useEffect(() => {
    let mounted = true
    const tick = async () => {
      const rem = 30 - (Math.floor(Date.now() / 1000) % 30)
      const code = await generateTOTP(selectedItem.totpSecret)
      if (mounted) {
        setTotpSecondsLeft(rem)
        setTotpCode(code)
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [selectedItem])

  // Parse CSV rows automatically
  useEffect(() => {
    const lines = String(csvInput || '')
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
    if (lines.length <= 1) {
      setImportedRows([])
      return
    }
    const rows = lines.slice(1).map((line, idx) => {
      const parts = line.split(',')
      const pwd = parts[3] || ''
      const strength = evaluatePasswordStrength(pwd)
      return {
        id: idx,
        name: parts[0] || 'Account',
        url: parts[1] || '',
        username: parts[2] || '',
        strength,
      }
    })
    setImportedRows(rows)
  }, [csvInput])

  const copyValue = async (label, val) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedField(label)
      setTimeout(() => setCopiedField(''), 1800)
    } catch {
      // Fallback ignored
    }
  }

  const runBreachCheck = async () => {
    setCheckingBreach(true)
    const res = await checkHibpBreach(testPassword)
    setBreachResult(res)
    setCheckingBreach(false)
  }

  const handleCreateSendLink = async () => {
    const expMs =
      sendExpiry === '1h'
        ? 3600 * 1000
        : sendExpiry === '24h'
        ? 24 * 3600 * 1000
        : 7 * 24 * 3600 * 1000
    const payload = {
      t: sendTitle,
      s: sendSecret,
      exp: Date.now() + expMs,
      v: 1,
    }
    const { cipherB64, ivB64, keyB64 } = await encryptZeroKnowledgePayload(payload)
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zpas.org'
    const link = `${origin}/send#c=${cipherB64}&iv=${ivB64}&k=${keyB64}`
    setGeneratedSendUrl(link)
    const verifyObj = await decryptZeroKnowledgePayload(cipherB64, ivB64, keyB64)
    setDecryptedPreview(verifyObj)
  }

  const strengthInfo = evaluatePasswordStrength(testPassword)

  return (
    <section className="pg-suite-section section-wrap" id="interactive-lab" aria-labelledby="suite-title">
      <div className="pg-suite-head">
        <div className="pg-kicker">
          <span></span> {t.kicker}
        </div>
        <h2 id="suite-title">
          {t.titleLine1}
          <br />
          <em>{t.titleEm}</em>
        </h2>
        <p>{t.subtitle}</p>
      </div>

      <div className="pg-suite-tabs" role="tablist" aria-label="Interactive security tools">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'vault'}
          className={`pg-suite-tab ${activeTab === 'vault' ? 'active' : ''}`}
          onClick={() => setActiveTab('vault')}
        >
          <span>⌑</span> {t.tabVault} <span className="pg-suite-tab-badge">RFC-6238</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit'}
          className={`pg-suite-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <span>✓</span> {t.tabAudit} <span className="pg-suite-tab-badge">k-Anonymity</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'send'}
          className={`pg-suite-tab ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          <span>↗</span> {t.tabSend} <span className="pg-suite-tab-badge">AES-256-GCM</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'import'}
          className={`pg-suite-tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <span>⇄</span> {t.tabImport} <span className="pg-suite-tab-badge">CSV / JSON</span>
        </button>
      </div>

      <div className="pg-lab-card">
        <div className="pg-lab-topbar">
          <div className="pg-lab-status">
            <span className="pg-lab-status-dot"></span>
            WebCrypto Engine Active · Client-Side Only
          </div>
          <span>Zero telemetry · Local memory sandbox</span>
        </div>

        <div className="pg-lab-body">
          {activeTab === 'vault' && (
            <div className="pg-vault-grid">
              <div className="pg-vault-list">
                {SAMPLE_VAULT_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pg-vault-item-btn ${selectedItem.id === item.id ? 'active' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <span className="pg-vault-icon">{item.badge}</span>
                    <span className="pg-vault-item-meta">
                      <strong>{item.title}</strong>
                      <span>{item.username}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="pg-vault-detail">
                <div className="pg-vault-detail-head">
                  <div>
                    <h3>{selectedItem.title}</h3>
                    <small>{selectedItem.url}</small>
                  </div>
                  <a className="pg-mini-btn primary" href="https://web.zpas.org/">
                    Open Full Web Vault ↗
                  </a>
                </div>

                <div className="pg-field-row">
                  <div className="pg-field-info">
                    <span className="pg-field-label">Username / Identifier</span>
                    <div className="pg-field-value">{selectedItem.username}</div>
                  </div>
                  <button
                    type="button"
                    className="pg-mini-btn"
                    onClick={() => copyValue('user', selectedItem.username)}
                  >
                    {copiedField === 'user' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                <div className="pg-field-row">
                  <div className="pg-field-info">
                    <span className="pg-field-label">Master-Encrypted Password</span>
                    <div className="pg-field-value">
                      {showPwd ? selectedItem.password : '••••••••••••••••••••••••'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" className="pg-mini-btn" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? 'Hide' : 'Reveal'}
                    </button>
                    <button
                      type="button"
                      className="pg-mini-btn"
                      onClick={() => copyValue('pwd', selectedItem.password)}
                    >
                      {copiedField === 'pwd' ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="pg-field-row">
                  <div className="pg-field-info">
                    <span className="pg-field-label">Live 2FA Authenticator (TOTP · RFC-6238)</span>
                    <div className="pg-totp-code">{totpCode}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pg-totp-ring">{totpSecondsLeft}s</span>
                    <button
                      type="button"
                      className="pg-mini-btn"
                      onClick={() => copyValue('totp', totpCode.replace(/\s+/g, ''))}
                    >
                      {copiedField === 'totp' ? 'Copied ✓' : 'Copy Code'}
                    </button>
                  </div>
                </div>

                <div className="pg-field-row" style={{ marginBottom: 0 }}>
                  <div className="pg-field-info">
                    <span className="pg-field-label">Private Vault Note</span>
                    <div className="pg-field-value" style={{ fontSize: '12px', color: '#51637d' }}>
                      {selectedItem.note}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="pg-audit-grid">
              <div>
                <div className="pg-input-group">
                  <label htmlFor="pg-audit-input">Test or Generate a Password</label>
                  <div className="pg-input-wrap">
                    <input
                      id="pg-audit-input"
                      type="text"
                      className="pg-text-input"
                      value={testPassword}
                      onChange={(e) => {
                        setTestPassword(e.target.value)
                        setBreachResult({ status: 'idle', count: 0, prefix: '' })
                      }}
                    />
                    <button
                      type="button"
                      className="pg-mini-btn"
                      onClick={() => {
                        setTestPassword(generateStrongPassword(22))
                        setBreachResult({ status: 'idle', count: 0, prefix: '' })
                      }}
                    >
                      Generate 22-char
                    </button>
                  </div>
                </div>

                <div className="pg-meter-bar">
                  <div
                    className="pg-meter-fill"
                    style={{ width: `${strengthInfo.score}%`, backgroundColor: strengthInfo.color }}
                  />
                </div>

                <div className="pg-audit-metrics">
                  <div className="pg-metric-box">
                    <small>Entropy Bits</small>
                    <strong>{strengthInfo.bits} bits</strong>
                  </div>
                  <div className="pg-metric-box">
                    <small>Vault Rating</small>
                    <strong style={{ color: strengthInfo.color }}>{strengthInfo.label}</strong>
                  </div>
                  <div className="pg-metric-box">
                    <small>Offline Crack Time</small>
                    <strong>{strengthInfo.crackTime}</strong>
                  </div>
                </div>
              </div>

              <div className="pg-breach-panel">
                <div>
                  <span className="pg-field-label">k-Anonymity Breach Auditor (HaveIBeenPwned)</span>
                  {breachResult.status === 'idle' && (
                    <span className="pg-breach-badge neutral">Ready to check safely</span>
                  )}
                  {breachResult.status === 'safe' && (
                    <span className="pg-breach-badge safe">
                      ✓ 0 Known Breaches (Prefix {breachResult.prefix}…)
                    </span>
                  )}
                  {breachResult.status === 'pwned' && (
                    <span className="pg-breach-badge warn">
                      ⚠ Exposed in {breachResult.count.toLocaleString()} public breaches!
                    </span>
                  )}
                  {breachResult.status === 'offline' && (
                    <span className="pg-breach-badge neutral">
                      Local SHA-1 Prefix: {breachResult.prefix}***** (Network sandboxed)
                    </span>
                  )}
                  <p style={{ fontSize: '12px', lineHeight: 1.65, color: '#5d708c', margin: '6px 0 16px' }}>
                    Your password is never sent over the internet. PassGram hashes it locally with SHA-1 and queries only the first 5 hex characters.
                  </p>
                </div>
                <button
                  type="button"
                  className="pg-mini-btn primary"
                  onClick={runBreachCheck}
                  disabled={checkingBreach}
                >
                  {checkingBreach ? 'Checking k-Anonymity Range…' : 'Check Against 12B+ Breached Passwords'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'send' && (
            <div className="pg-audit-grid">
              <div>
                <div className="pg-input-group">
                  <label htmlFor="pg-send-title">Secret Title</label>
                  <input
                    id="pg-send-title"
                    type="text"
                    className="pg-text-input"
                    value={sendTitle}
                    onChange={(e) => setSendTitle(e.target.value)}
                  />
                </div>
                <div className="pg-input-group">
                  <label htmlFor="pg-send-secret">Secret Note or Password to Seal</label>
                  <textarea
                    id="pg-send-secret"
                    rows={3}
                    className="pg-textarea"
                    value={sendSecret}
                    onChange={(e) => setSendSecret(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    aria-label="Expiration window"
                    className="pg-text-input"
                    style={{ width: 'auto' }}
                    value={sendExpiry}
                    onChange={(e) => setSendExpiry(e.target.value)}
                  >
                    <option value="1h">Expires in 1 Hour</option>
                    <option value="24h">Expires in 24 Hours</option>
                    <option value="7d">Expires in 7 Days</option>
                  </select>
                  <button type="button" className="pg-mini-btn primary" onClick={handleCreateSendLink}>
                    Seal with AES-256-GCM & Generate Link
                  </button>
                </div>
              </div>

              <div className="pg-breach-panel">
                <div>
                  <span className="pg-field-label">Zero-Knowledge Shareable Link (#fragment)</span>
                  {generatedSendUrl ? (
                    <>
                      <div
                        className="pg-zk-code"
                        style={{ marginTop: '8px', marginBottom: '12px', fontSize: '11px' }}
                      >
                        {generatedSendUrl}
                      </div>
                      {decryptedPreview && (
                        <p style={{ fontSize: '11px', color: '#0b7a43', margin: '0 0 10px' }}>
                          ✓ Verified locally: Decryption yields &ldquo;{decryptedPreview.t}&rdquo;
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#61748f', lineHeight: 1.7 }}>
                      Click <b>Seal with AES-256-GCM</b> to encrypt your secret in the browser. The decryption key stays in the URL <code>#hash</code> fragment, which browsers never send to any server.
                    </p>
                  )}
                </div>
                {generatedSendUrl && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="pg-mini-btn primary"
                      onClick={() => copyValue('sendUrl', generatedSendUrl)}
                    >
                      {copiedField === 'sendUrl' ? 'Link Copied ✓' : 'Copy Encrypted Link'}
                    </button>
                    <a className="pg-mini-btn" href={generatedSendUrl} target="_blank" rel="noopener noreferrer">
                      Open Receiver View ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div>
              <div className="pg-input-group">
                <label htmlFor="pg-csv-box">
                  Paste CSV Export (1Password, Bitwarden, Chrome, or PassGram Format) — Parsed 100% Offline
                </label>
                <textarea
                  id="pg-csv-box"
                  rows={4}
                  className="pg-textarea"
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                />
              </div>
              <div className="pg-import-list">
                {importedRows.map((row) => (
                  <div key={row.id} className="pg-import-row">
                    <strong>{row.name}</strong>
                    <span style={{ color: '#5c708c' }}>{row.username}</span>
                    <span style={{ color: '#7a8da8', fontSize: '11px' }}>{row.url}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: row.strength.color,
                      }}
                    >
                      {row.strength.label} ({row.strength.bits}b)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
