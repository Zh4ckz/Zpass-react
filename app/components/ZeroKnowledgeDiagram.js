'use client'

import { useEffect, useState } from 'react'
import { encryptZeroKnowledgePayload } from './crypto-utils'

export default function ZeroKnowledgeDiagram({ t }) {
  const [sampleInput, setSampleInput] = useState('MyPrivateVaultKey#2026')
  const [cryptoState, setCryptoState] = useState({
    ivB64: '9f8e7d6c5b4a3f2e',
    keyB64: 'a1b2c3d4e5f60718293a4b5c6d7e8f90...',
    cipherB64: 'x8Kq9Lm2Np4Qr7St0Uv3Wx6Yz...',
  })

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const res = await encryptZeroKnowledgePayload({ secret: sampleInput })
        if (active) setCryptoState(res)
      } catch {
        // Ignore if subtle crypto unavailable
      }
    }
    run()
    return () => {
      active = false
    }
  }, [sampleInput])

  return (
    <section className="pg-zk-section section-wrap" id="zero-knowledge" aria-labelledby="zk-title">
      <div className="pg-suite-head">
        <div className="pg-kicker">
          <span></span> {t.kicker}
        </div>
        <h2 id="zk-title">
          {t.titleLine1}
          <br />
          <em>{t.titleEm}</em>
        </h2>
        <p>{t.subtitle}</p>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto 24px' }}>
        <input
          type="text"
          aria-label="Live plaintext secret to encrypt locally"
          className="pg-text-input"
          value={sampleInput}
          onChange={(e) => setSampleInput(e.target.value)}
          placeholder="Type any secret to watch real-time AES-256-GCM encryption..."
        />
      </div>

      <div className="pg-zk-pipeline">
        <div className="pg-zk-step">
          <div className="pg-zk-step-head">
            <span>{t.step1}</span>
            <span>YOUR DEVICE ONLY</span>
          </div>
          <code className="pg-zk-code">{sampleInput || '(empty)'}</code>
        </div>

        <div className="pg-zk-step">
          <div className="pg-zk-step-head">
            <span>{t.step2}</span>
            <span>256-BIT + 96-BIT IV</span>
          </div>
          <code className="pg-zk-code">
            IV: {cryptoState.ivB64}
            <br />
            Key: {cryptoState.keyB64.slice(0, 28)}…
          </code>
        </div>

        <div className="pg-zk-step">
          <div className="pg-zk-step-head">
            <span>{t.step3}</span>
            <span>ZERO-KNOWLEDGE</span>
          </div>
          <code className="pg-zk-code">{cryptoState.cipherB64}</code>
        </div>
      </div>
    </section>
  )
}
