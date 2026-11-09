'use client'

import { useEffect, useState } from 'react'
import { decryptZeroKnowledgePayload } from '../components/crypto-utils'
import '../components/interactive-suite.css'

export default function PassGramSendPage() {
  const [status, setStatus] = useState('loading') // loading | ready | unlocked | expired | invalid
  const [payload, setPayload] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const parseHash = async () => {
      try {
        const rawHash = window.location.hash.replace(/^#/, '')
        if (!rawHash) {
          setStatus('invalid')
          return
        }
        const params = new URLSearchParams(rawHash)
        const c = params.get('c')
        const iv = params.get('iv')
        const k = params.get('k')
        if (!c || !iv || !k) {
          setStatus('invalid')
          return
        }
        const decrypted = await decryptZeroKnowledgePayload(c, iv, k)
        if (decrypted.exp && Date.now() > decrypted.exp) {
          setStatus('expired')
          return
        }
        setPayload(decrypted)
        setStatus('ready')
      } catch {
        setStatus('invalid')
      }
    }
    parseHash()
  }, [])

  const handleRevealAndBurn = () => {
    setStatus('unlocked')
    // Wipe the decryption key from the browser address bar history so it cannot be re-opened from history
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, 'PassGram Send — Viewed', window.location.pathname)
    }
  }

  const copySecret = async () => {
    if (!payload?.s) return
    try {
      await navigator.clipboard.writeText(payload.s)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  return (
    <div
      className="home-refresh"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'radial-gradient(ellipse 800px 500px at 50% 0%, #edf4ff 0%, #ffffff 75%)',
      }}
    >
      <header className="site-header">
        <a className="brand" href="https://zpas.org/" aria-label="PassGram home">
          <span className="brand-mark">P</span>
          <span>PassGram Send</span>
        </a>
        <div className="header-actions">
          <a className="pg-mini-btn primary" href="https://zpas.org/#interactive-lab">
            Create New Encrypted Send ↗
          </a>
        </div>
      </header>

      <main className="section-wrap" style={{ padding: '72px 20px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <div className="pg-lab-card">
          <div className="pg-lab-topbar">
            <div className="pg-lab-status">
              <span className="pg-lab-status-dot"></span>
              Zero-Knowledge AES-256-GCM Envelope
            </div>
            <span>Client-Side Decryption</span>
          </div>

          <div className="pg-lab-body" style={{ textAlign: 'center' }}>
            {status === 'loading' && <p>Verifying cryptographic envelope…</p>}

            {status === 'invalid' && (
              <div>
                <h2 style={{ margin: '0 0 10px', fontSize: '22px' }}>Invalid or Already Burned Link</h2>
                <p style={{ fontSize: '13px', color: '#647690', marginBottom: '20px' }}>
                  This PassGram Send URL does not contain a valid encryption key fragment, or the key was already cleared after viewing.
                </p>
                <a className="pg-mini-btn primary" href="https://zpas.org/#interactive-lab">
                  Create a New Encrypted Link
                </a>
              </div>
            )}

            {status === 'expired' && (
              <div>
                <h2 style={{ margin: '0 0 10px', fontSize: '22px', color: '#c92a2a' }}>Link Expired</h2>
                <p style={{ fontSize: '13px', color: '#647690', marginBottom: '20px' }}>
                  The sender set an expiration timestamp on this secret that has now passed.
                </p>
                <a className="pg-mini-btn primary" href="https://zpas.org/">
                  Return to PassGram
                </a>
              </div>
            )}

            {status === 'ready' && payload && (
              <div>
                <span className="pg-breach-badge safe">✓ Authentic AES-256-GCM Tag Verified</span>
                <h2 style={{ margin: '8px 0 10px', fontSize: '24px' }}>{payload.t || 'Encrypted Secret'}</h2>
                <p style={{ fontSize: '13px', color: '#647690', marginBottom: '24px' }}>
                  Revealing this secret will decrypt it locally in your browser and immediately scrub the key from your address bar.
                </p>
                <button type="button" className="pg-mini-btn primary" onClick={handleRevealAndBurn}>
                  Reveal Secret & Scrub URL Key
                </button>
              </div>
            )}

            {status === 'unlocked' && payload && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '16px', color: '#14213b' }}>{payload.t}</strong>
                  <span className="pg-breach-badge warn" style={{ margin: 0 }}>
                    URL Key Scrubbed
                  </span>
                </div>
                <pre
                  className="pg-zk-code"
                  style={{
                    fontSize: '14px',
                    padding: '16px',
                    whiteSpace: 'pre-wrap',
                    marginBottom: '16px',
                  }}
                >
                  {payload.s}
                </pre>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="pg-mini-btn primary" onClick={copySecret}>
                    {copied ? 'Copied to Clipboard ✓' : 'Copy Secret'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-bottom">
          <span>PassGram Zero-Knowledge Send · Key never transmitted to server</span>
          <span>© 2026 PassGram</span>
        </div>
      </footer>
    </div>
  )
}
