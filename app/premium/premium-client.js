 'use client'
import { useEffect, useState } from 'react'

export default function PremiumClient() {
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!['web.zpas.org', 'login.zpas.org', 'localhost', '127.0.0.1'].includes(location.hostname)) {
      location.replace('https://web.zpas.org/premium' + location.search)
      return
    }
    let active = true
    let premium
    import(/* webpackIgnore: true */ '/resources/js/web-premium.mjs?v=5')
      .then(module => { premium = module; if (active) module.openPremium() })
      .catch(() => { if (active) setError('Premium could not load. Please try again.') })
    return () => { active = false; premium?.closePremium() }
  }, [attempt])
  return (
    <main id="pg-premium-page" style={{ minHeight: '100dvh', background: '#090909', color: '#f5f5f5', display: 'grid', placeItems: 'center', padding: 24 }}>
      <link rel="stylesheet" href="/resources/css/web-premium.css?v=5" />
      <section style={{ textAlign: 'center', maxWidth: 520 }}>
        <img src="/resources/assets/app-logo/zpass.png" width="44" height="44" alt="PassGram" />
        <h1>Choose your PassGram plan</h1>
        <p>Free, Plus and Pro. More room when you need it.</p>
        {error && <p role="alert">{error}</p>}
        <button type="button" onClick={() => { setError(''); setAttempt(value => value + 1) }} style={{ border: 0, borderRadius: 99, padding: '12px 24px', margin: '16px 0', cursor: 'pointer' }}>Compare plans</button>
        <p><a href="https://web.zpas.org/web" style={{ color: '#a8cfff' }}>Back to your account</a></p>
      </section>
    </main>
  )
}
