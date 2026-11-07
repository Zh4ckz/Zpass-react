'use client'
// Handles Firebase Auth email links (verify email, reset password, recover email, change email).
// Set as the custom action URL in Firebase Console: Authentication > Templates > Edit > Customize action URL
// -> https://zpas.org/auth/action
import { useEffect, useState } from 'react'
import './action.css'

const FIREBASE = {
  apiKey: 'AIzaSyBvnc-swQuAx_Fe67TUY7TGoM4VdG89cI4',
  authDomain: 'passgram-org.firebaseapp.com',
  projectId: 'passgram-org',
  appId: '1:157086803240:web:152ae9d14c582db8c91c1d',
}

async function loadAuth() {
  const [{ initializeApp, getApps }, sdk] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  const app = getApps()[0] || initializeApp(FIREBASE)
  return { auth: sdk.getAuth(app), sdk }
}

const ERRORS = {
  'auth/expired-action-code': 'This link has expired. Request a new one from the app.',
  'auth/invalid-action-code': 'This link is not valid anymore. It may have been used already. Request a new one from the app.',
  'auth/user-disabled': 'This account has been disabled. Contact support for help.',
  'auth/user-not-found': 'We could not find this account.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
}
const message = (e) => ERRORS[e?.code] || 'Something went wrong. Request a new link from the app and try again.'

// Only follow continue links that stay on our own domains.
function safeContinue(raw) {
  try {
    const url = new URL(raw)
    if (url.protocol === 'https:' && (url.hostname === 'zpas.org' || url.hostname.endsWith('.zpas.org'))) return url.href
  } catch {}
  return ''
}

function strength(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}

const Icon = ({ kind }) => {
  const paths = {
    ok: 'M20 6L9 17l-5-5',
    bad: 'M12 8v5M12 16.5h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
    key: 'M15 7a4 4 0 11-3.9 4.9L3 20v-3l2-2v-2h2l1.9-1.9A4 4 0 0115 7zM16 8h.01',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  }
  return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>
}

function Eye({ open }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{open ? <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3 3.9M6.6 6.6A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></>}</svg>
}

export default function ActionClient() {
  const [view, setView] = useState({ state: 'loading' })
  const [fb, setFb] = useState(null)
  const [params, setParams] = useState(null)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const p = { mode: q.get('mode') || '', code: q.get('oobCode') || '', next: safeContinue(q.get('continueUrl') || '') }
    setParams(p)
    // Keep the one-time code out of the address bar and history once it has been read.
    history.replaceState(null, '', location.pathname)
    if (!p.code) return setView({ state: 'error', title: 'Link incomplete', text: 'Open the newest link from your email, or request a new one from the app.' })
    loadAuth().then(async (f) => {
      setFb(f)
      const { auth, sdk } = f
      try {
        if (p.mode === 'verifyEmail') {
          await sdk.applyActionCode(auth, p.code)
          setView({ state: 'done', icon: 'ok', title: 'Email verified', text: 'Your email address is confirmed. Go back to the PassGram app. It continues on its own in a few seconds.' })
        } else if (p.mode === 'resetPassword') {
          const email = await sdk.verifyPasswordResetCode(auth, p.code)
          setView({ state: 'reset', email })
        } else if (p.mode === 'recoverEmail') {
          const info = await sdk.checkActionCode(auth, p.code)
          await sdk.applyActionCode(auth, p.code)
          setView({ state: 'recovered', email: info.data.email })
        } else if (p.mode === 'verifyAndChangeEmail') {
          const info = await sdk.checkActionCode(auth, p.code)
          await sdk.applyActionCode(auth, p.code)
          setView({ state: 'done', icon: 'ok', title: 'Email changed', text: `You now sign in with ${info.data.email || 'your new email address'}.` })
        } else {
          setView({ state: 'error', title: 'Open this link in the app', text: 'This kind of link works inside the PassGram app.' })
        }
      } catch (e) {
        setView({ state: 'error', title: 'Link not valid', text: message(e) })
      }
    }).catch(() => setView({ state: 'error', title: 'Could not load', text: 'Check your connection and open the link again.' }))
  }, [])

  const submitReset = async (e) => {
    e.preventDefault()
    setFormError('')
    if (pw.length < 8) return setFormError('Use at least 8 characters.')
    if (pw !== pw2) return setFormError('The passwords do not match.')
    setBusy(true)
    try {
      await fb.sdk.confirmPasswordReset(fb.auth, params.code, pw)
      setView({ state: 'done', icon: 'ok', title: 'Password changed', text: 'Sign in with your new password on any of your devices.' })
    } catch (err) {
      if (err?.code === 'auth/weak-password') setFormError(message(err))
      else setView({ state: 'error', title: 'Could not change password', text: message(err) })
    } finally { setBusy(false) }
  }

  const sendReset = async (email) => {
    setBusy(true)
    try {
      await fb.sdk.sendPasswordResetEmail(fb.auth, email)
      setView({ state: 'done', icon: 'mail', title: 'Check your inbox', text: `We sent a password reset link to ${email}.` })
    } catch (err) { setView({ state: 'error', title: 'Could not send email', text: message(err) }) } finally { setBusy(false) }
  }

  const score = strength(pw)
  const continueButton = params?.next && <a className="zpx-btn" href={params.next}>Continue</a>

  return (
    <div className="zpx">
      <div className="zpx-glow" aria-hidden="true" />
      <main className="zpx-card">
        <a className="zpx-brand" href="https://zpas.org/"><img src="/resources/assets/app-logo/zpass.png" alt="" width="34" height="34" /><span>PassGram</span></a>

        {view.state === 'loading' && (
          <div className="zpx-center" role="status"><span className="zpx-spin" /><p>Checking your link…</p></div>
        )}

        {view.state === 'done' && (
          <div className="zpx-center">
            <div className={`zpx-badge ${view.icon === 'mail' ? 'info' : 'good'}`}><Icon kind={view.icon} /></div>
            <h1>{view.title}</h1>
            <p>{view.text}</p>
            <div className="zpx-actions">
              {continueButton || <a className="zpx-btn" href="https://web.zpas.org/">Open PassGram Web</a>}
            </div>
          </div>
        )}

        {view.state === 'error' && (
          <div className="zpx-center">
            <div className="zpx-badge bad"><Icon kind="bad" /></div>
            <h1>{view.title}</h1>
            <p>{view.text}</p>
            <div className="zpx-actions"><a className="zpx-btn ghost" href="https://zpas.org/support">Get help</a></div>
          </div>
        )}

        {view.state === 'recovered' && (
          <div className="zpx-center">
            <div className="zpx-badge good"><Icon kind="ok" /></div>
            <h1>Email restored</h1>
            <p>Your sign-in email is back to <b>{view.email}</b>. If you did not ask for the change, reset your password now.</p>
            <div className="zpx-actions"><button className="zpx-btn" disabled={busy} onClick={() => sendReset(view.email)}>{busy ? 'Sending…' : 'Reset my password'}</button></div>
          </div>
        )}

        {view.state === 'reset' && (
          <form className="zpx-form" onSubmit={submitReset}>
            <div className="zpx-badge info"><Icon kind="key" /></div>
            <h1>Choose a new password</h1>
            <p>For <b>{view.email}</b></p>
            <label className="zpx-field">
              <span>New password</span>
              <div className="zpx-input">
                <input type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus required minLength={8} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}><Eye open={show} /></button>
              </div>
              <div className="zpx-meter" data-score={pw ? score : 0} aria-hidden="true"><i /><i /><i /><i /></div>
            </label>
            <label className="zpx-field">
              <span>Repeat password</span>
              <div className="zpx-input"><input type={show ? 'text' : 'password'} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
            </label>
            {formError && <p className="zpx-error" role="alert">{formError}</p>}
            <button className="zpx-btn wide" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
          </form>
        )}

        <footer className="zpx-foot"><a href="https://zpas.org/legal/privacy">Privacy</a><span>·</span><a href="https://zpas.org/support">Support</a></footer>
      </main>
    </div>
  )
}
