'use client'

import { useEffect, useState } from 'react'
import { SERVICE_PAGES } from './service-pages'
import { TRANSLATIONS } from './components/i18n-data'
import InteractiveSuite from './components/InteractiveSuite'
import ZeroKnowledgeDiagram from './components/ZeroKnowledgeDiagram'
import ComparisonSection from './components/ComparisonSection'
import './components/interactive-suite.css'

export default function Home() {
  const [subdomainPage, setSubdomainPage] = useState(null)
  const [lang, setLang] = useState('en')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const host = window.location.hostname.toLowerCase()
    const isRootPath = ['/', '/index.html'].includes(window.location.pathname)
    const subdomainPages = {
      'pay.zpas.org': SERVICE_PAGES.pay,
      'docs.zpas.org': SERVICE_PAGES.docs,
      'api.zpas.org': SERVICE_PAGES.api,
      'bots.zpas.org': SERVICE_PAGES.bots,
      'core.zpas.org': SERVICE_PAGES.core,
      'web.zpas.org': '/web',
      'login.zpas.org': '/web',
    }
    const destination = isRootPath ? subdomainPages[host] : null
    if (destination) {
      if (host === 'pay.zpas.org') document.title = 'Checkout — PassGram'
      setSubdomainPage(destination + window.location.search)
      return
    }

    // Detect stored or browser language
    try {
      const savedLang = localStorage.getItem('pg_site_lang')
      if (savedLang && TRANSLATIONS[savedLang]) {
        setLang(savedLang)
      } else {
        const navLang = (navigator.language || '').slice(0, 2).toLowerCase()
        if (TRANSLATIONS[navLang]) setLang(navLang)
      }
    } catch {
      // Ignore storage access errors
    }

    const modernScript = document.createElement('script')
    modernScript.src = '/resources/js/modern-reveal.js?v=12'
    modernScript.async = false
    document.body.appendChild(modernScript)

    const glassScript = document.createElement('script')
    glassScript.src = '/resources/js/glass-header.js?v=4'
    glassScript.async = false
    document.body.appendChild(glassScript)

    return () => {
      modernScript.remove()
      glassScript.remove()
    }
  }, [])

  const changeLanguage = (nextLang) => {
    setLang(nextLang)
    try {
      localStorage.setItem('pg_site_lang', nextLang)
    } catch {
      // Ignore
    }
  }

  if (subdomainPage) {
    return (
      <iframe
        title="PassGram subdomain page"
        src={subdomainPage}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    )
  }

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en

  return (
    <div className="home-refresh">
      <header className="site-header">
        <a className="brand" href="https://zpas.org/" aria-label="PassGram home">
          <span className="brand-mark">P</span>
          <span>PassGram</span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen ? 'true' : 'false'}
          aria-controls="main-nav"
          aria-label="Open menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
        </button>
        <nav id="main-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
          <a href="https://zpas.org/apps">{t.nav.apps}</a>
          <a href="#interactive-lab">Live Demo</a>
          <a href="#compare">Compare</a>
          <a href="https://zpas.org/faq">{t.nav.faq}</a>
          <a href="https://docs.zpas.org/" target="_blank" rel="noopener noreferrer">
            {t.nav.docs}
          </a>
          <a href="https://zpas.org/about/pricing">{t.nav.pricing}</a>
          <a href="https://zpas.org/legal/security">{t.nav.safety}</a>
          <a href="https://zpas.org/support">{t.nav.support}</a>
        </nav>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="pg-lang-switcher" role="group" aria-label="Language switcher">
            {['en', 'tr', 'de'].map((code) => (
              <button
                key={code}
                type="button"
                className={`pg-lang-btn ${lang === code ? 'active' : ''}`}
                onClick={() => changeLanguage(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <a
            className="x-link"
            href="https://x.com/4rezan"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow on X"
          >
            <svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
              />
            </svg>
            <span>{t.nav.follow}</span>
          </a>
        </div>
      </header>

      <main className="pg-home-main">
        {/* Hero Section */}
        <section className="pg-intro section-wrap" aria-labelledby="home-title">
          <div className="pg-kicker">
            <span></span> {t.hero.kicker}
          </div>
          <h1 id="home-title">
            {t.hero.titleLine1}
            <br />
            <em>{t.hero.titleEm}</em>
          </h1>
          <p>{t.hero.subtitle}</p>
          <div className="pg-intro-actions">
            <a className="button button-dark" href="https://zpas.org/apps">
              {t.hero.ctaPrimary} <span aria-hidden="true">↗</span>
            </a>
            <a className="pg-text-link" href="https://web.zpas.org/" target="_blank" rel="noopener noreferrer">
              {t.hero.ctaSecondary} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="pg-product-stage">
            <div className="pg-stage-orbit" aria-hidden="true"></div>
            <div className="pg-desktop-preview">
              <div className="pg-browser-bar">
                <span className="pg-browser-dots" aria-hidden="true">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <span className="pg-address">
                  <span aria-hidden="true">⌑</span> web.zpas.org
                </span>
                <span className="pg-browser-label">PASSGRAM WEB</span>
              </div>
              <div className="pg-desktop-viewport">
                <img
                  src="/resources/previews/web-desktop.webp"
                  alt="PassGram Web: the desktop sign-in screen with email and phone options"
                  width="980"
                  height="580"
                  fetchPriority="high"
                />
              </div>
            </div>
            <div className="pg-phone-preview" aria-hidden="true">
              <div className="pg-phone-camera"></div>
              <div className="pg-phone-viewport">
                <img
                  src="/resources/previews/web-mobile.webp"
                  alt=""
                  width="340"
                  height="690"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="pg-phone-home"></div>
            </div>
            <span className="pg-stage-note">
              <span></span> {t.hero.stageNote}
            </span>
          </div>
          <p className="pg-preview-caption">{t.hero.caption}</p>
        </section>

        {/* Platforms Section */}
        <section className="pg-platforms section-wrap" aria-label="Available platforms">
          <p>{t.platforms.heading}</p>
          <div>
            <a href="https://zpas.org/apps/android">
              <img src="/resources/assets/apps/android.svg" alt="" width="23" height="23" />
              Android<span>{t.platforms.androidSub}</span>
            </a>
            <a href="https://zpas.org/apps/windows">
              <img src="/resources/assets/apps/windows.svg" alt="" width="23" height="23" />
              Windows<span>{t.platforms.windowsSub}</span>
            </a>
            <a href="https://web.zpas.org/" target="_blank" rel="noopener noreferrer">
              <img src="/resources/assets/apps/globe.svg" alt="" width="23" height="23" />
              Web<span>{t.platforms.webSub}</span>
            </a>
          </div>
        </section>

        {/* Interactive Suite: Live Vault, TOTP, HIBP Breach Auditor, Encrypted Send, CSV Importer */}
        <InteractiveSuite t={t.interactive} />

        {/* Editorial Features Section */}
        <section className="pg-editorial section-wrap" id="features" aria-labelledby="features-title">
          <div className="pg-detail-art" aria-hidden="true">
            <div className="pg-detail-grid"></div>
            <div className="pg-vault-sheet">
              <div className="pg-sheet-top">
                <img src="/resources/assets/app-logo/zpass.png" alt="" width="34" height="34" />
                <span>
                  Your personal space<small>THE EVERYDAY ESSENTIALS</small>
                </span>
                <span className="pg-sheet-lock">⌑</span>
              </div>
              <div className="pg-sheet-item">
                <span className="pg-item-symbol">Aa</span>
                <div>
                  Passwords<small>A place for every account</small>
                </div>
                <span>••••••••</span>
              </div>
              <div className="pg-sheet-item">
                <span className="pg-item-symbol">#</span>
                <div>
                  Authenticator<small>Your sign-in essentials</small>
                </div>
                <span className="pg-demo-code">••• •••</span>
              </div>
              <div className="pg-sheet-item">
                <span className="pg-item-symbol">≡</span>
                <div>
                  Private notes<small>The things you want to keep</small>
                </div>
                <span>↗</span>
              </div>
              <div className="pg-sheet-footer">
                <span></span> A calmer way to keep it together.
              </div>
            </div>
            <span className="pg-art-caption">A look inside your everyday essentials · illustrative preview</span>
          </div>
          <div className="pg-editorial-copy">
            <div className="pg-kicker">{t.features.kicker}</div>
            <h2 id="features-title">
              {t.features.titleLine1}
              <br />
              <em>{t.features.titleEm}</em>
            </h2>
            <p>{t.features.desc}</p>
            <dl className="pg-feature-list">
              <div>
                <dt>
                  01 <b>{t.features.f1Title}</b>
                </dt>
                <dd>{t.features.f1Desc}</dd>
              </div>
              <div>
                <dt>
                  02 <b>{t.features.f2Title}</b>
                </dt>
                <dd>{t.features.f2Desc}</dd>
              </div>
              <div>
                <dt>
                  03 <b>{t.features.f3Title}</b>
                </dt>
                <dd>{t.features.f3Desc}</dd>
              </div>
            </dl>
            <a className="pg-text-link" href="https://zpas.org/apps">
              {t.features.link} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        {/* Zero-Knowledge Live Encryption Diagram */}
        <ZeroKnowledgeDiagram t={t.zeroKnowledge} />

        {/* Web Preview Section */}
        <section className="pg-web-section section-wrap" id="how" aria-labelledby="web-title">
          <div className="pg-web-copy">
            <div className="pg-kicker">A FAMILIAR PLACE. ONE NEW TAB.</div>
            <h2 id="web-title">
              Your space.
              <br />
              <em>Anywhere you browse.</em>
            </h2>
            <p>
              No need to carry your computer everywhere. Open PassGram Web and choose the sign-in method that works for
              you.
            </p>
            <ol className="pg-signin-steps">
              <li>
                <span>01</span>
                <div>
                  <b>Open the official web app</b>
                  <p>Start at web.zpas.org.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <b>Choose how to sign in</b>
                  <p>Use the options shown in the app.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <b>Continue in your own space</b>
                  <p>Review your signed-in devices in Settings.</p>
                </div>
              </li>
            </ol>
            <a className="pg-text-link" href="https://web.zpas.org/" target="_blank" rel="noopener noreferrer">
              Open PassGram Web <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="pg-web-visual">
            <div className="pg-web-visual-head">
              <span className="pg-live-dot"></span> PASSGRAM WEB <span>Interface preview</span>
            </div>
            <div className="pg-web-crop">
              <img
                src="/resources/previews/web-mobile.webp"
                alt="PassGram web email and phone sign-in screen"
                width="340"
                height="690"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p>Your real web interface. No account data is loaded in this preview.</p>
          </div>
        </section>

        {/* Competitor Comparison Section */}
        <ComparisonSection t={t.comparison} />

        {/* Trust Section */}
        <section className="pg-trust section-wrap" id="security-deep" aria-labelledby="trust-title">
          <div>
            <div className="pg-kicker">{t.trust.kicker}</div>
            <h2 id="trust-title">
              {t.trust.titleLine1}
              <br />
              <em>{t.trust.titleEm}</em>
            </h2>
            <a className="pg-text-link" href="https://zpas.org/legal/security">
              {t.trust.link} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="pg-trust-list">
            <article>
              <span>01 /</span>
              <div>
                <h3>{t.trust.t1Title}</h3>
                <p>{t.trust.t1Desc}</p>
              </div>
            </article>
            <article>
              <span>02 /</span>
              <div>
                <h3>{t.trust.t2Title}</h3>
                <p>{t.trust.t2Desc}</p>
              </div>
            </article>
            <article>
              <span>03 /</span>
              <div>
                <h3>{t.trust.t3Title}</h3>
                <p>{t.trust.t3Desc}</p>
              </div>
            </article>
          </div>
        </section>

        {/* Founder Note Section */}
        <section className="founder" id="founder" aria-labelledby="founder-title">
          <div className="founder-card">
            <div className="eyebrow">{t.founder.eyebrow}</div>
            <h2 id="founder-title">
              {t.founder.titleLine1} <em>{t.founder.titleEm}</em>
            </h2>
            <div className="founder-grid">
              <div className="founder-id">
                <a
                  className="founder-profile"
                  href="https://zpas.org/Rezan"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Rezan's channel on PassGram"
                >
                  <img
                    src="/resources/img/rezan.jpg"
                    alt="Rezan, CEO and Co-Founder of PassGram"
                    width="96"
                    height="96"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <b>Rezan</b>
                    <span>{t.founder.role}</span>
                    <span>PassGram</span>
                  </div>
                </a>
                <div className="id-links">
                  <a
                    className="x-link"
                    href="https://x.com/4rezan"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow Rezan on X"
                  >
                    <svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      />
                    </svg>
                  </a>
                  <a
                    className="g-link"
                    href="https://github.com/4rezan"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow Rezan on GitHub"
                  >
                    <svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
                      />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="founder-body">
                <p className="founder-quote">{t.founder.q1}</p>
                <p className="founder-quote">{t.founder.q2}</p>
                <p className="founder-quote">{t.founder.q3}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section className="pg-final section-wrap">
          <div className="pg-kicker">{t.finalCta.kicker}</div>
          <h2>
            {t.finalCta.titleLine1}
            <br />
            <em>{t.finalCta.titleEm}</em>
          </h2>
          <p>{t.finalCta.desc}</p>
          <a className="button button-dark" href="https://zpas.org/apps">
            {t.finalCta.button} <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div>
            <a className="brand" href="https://zpas.org/">
              <span className="brand-mark">P</span>
              <span>PassGram</span>
            </a>
            <p>
              Your digital life, in <em>one private space.</em>
            </p>
          </div>
          <nav>
            <a href="https://zpas.org/apps">{t.nav.apps}</a>
            <a href="https://zpas.org/send">PassGram Send</a>
            <a href="https://docs.zpas.org/" target="_blank" rel="noopener noreferrer">
              API
            </a>
            <a href="https://zpas.org/faq">{t.nav.faq}</a>
            <a href="https://zpas.org/legal/privacy">{t.nav.privacy}</a>
            <a href="https://zpas.org/legal/security">{t.nav.safety}</a>
          </nav>
          <a className="footer-x" href="https://x.com/4rezan" target="_blank" rel="noopener noreferrer">
            <svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
              />
            </svg>{' '}
            {t.nav.follow} on X
          </a>
        </div>
        <div className="footer-bottom">
          <div className="fb-links">
            <a href="https://zpas.org/legal/terms">{t.nav.terms}</a>
            <a href="https://zpas.org/legal/privacy">{t.nav.privacy}</a>
            <a href="https://zpas.org/legal/security">{t.nav.safety}</a>
            <a className="fb-choices" href="https://zpas.org/legal/privacy#choices">
              <svg viewBox="0 0 30 14" aria-hidden="true" focusable="false">
                <path
                  fill="#fff"
                  d="M7.4 12.8h6.8l3.1-11.6H7.4C4.2 1.2 1.6 3.8 1.6 7s2.6 5.8 5.8 5.8z"
                />
                <path
                  fill="#1769ff"
                  d="M22.6 0H7.4c-3.9 0-7 3.1-7 7s3.1 7 7 7h15.2c3.9 0 7-3.1 7-7s-3.2-7-7-7zm-21 7c0-3.2 2.6-5.8 5.8-5.8h9.9l-3.1 11.6H7.4c-3.2 0-5.8-2.6-5.8-5.8z"
                />
                <path
                  fill="#fff"
                  d="M24.6 4c.2.2.2.6 0 .8L22.5 7l2.2 2.2c.2.2.2.6 0 .8-.2.2-.6.2-.8 0l-2.2-2.2-2.2 2.2c-.2.2-.6.2-.8 0-.2-.2-.2-.6 0-.8L20.8 7l-2.2-2.2c-.2-.2-.2-.6 0-.8.2-.2.6-.2.8 0l2.2 2.2L23.8 4c.2-.2.6-.2.8 0z"
                />
                <path
                  fill="#1769ff"
                  d="M12.7 4.1c.2.2.3.6.1.8L8.6 9.8c-.1.1-.2.2-.3.2-.2.1-.5.1-.7-.1L5.4 7.7c-.2-.2-.2-.6 0-.8.2-.2.6-.2.8 0L8 8.6l3.8-4.5c.2-.2.6-.2.9 0z"
                />
              </svg>
              Your Privacy Choices
            </a>
          </div>
          <span>© 2026 PassGram</span>
        </div>
      </footer>
    </div>
  )
}
