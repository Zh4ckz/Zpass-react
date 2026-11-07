// Firebase sign-in check (ID token) and App Check token check, without the Admin SDK.
import { HttpError } from './policy.js';

const API_KEY = 'AIzaSyBvnc-swQuAx_Fe67TUY7TGoM4VdG89cI4'; // public web API key of passgram-org
const PROJECT_NUMBER = '157086803240';

// Google validates the token (signature, expiry, project) and returns the account, including custom claims.
export async function verifyIdToken(idToken, fetcher = (...a) => globalThis.fetch(...a)) {
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 8192) throw new HttpError(401, 'Sign in required');
  let user;
  try {
    const response = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }), signal: AbortSignal.timeout(10000),
    });
    user = response.ok ? (await response.json()).users?.[0] : null;
  } catch { user = null; }
  if (!user?.localId || user.disabled) throw new HttpError(401, 'Sign in required');
  let claims = {};
  try { claims = JSON.parse(user.customAttributes || '{}'); } catch {}
  return { uid: user.localId, email: user.email || '', email_verified: user.emailVerified === true, phone_number: user.phoneNumber || '', admin: claims.admin === true };
}

const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
let jwksCache;
async function appCheckKeys(fetcher) {
  if (jwksCache && jwksCache.expires > Date.now()) return jwksCache.keys;
  const response = await fetcher('https://firebaseappcheck.googleapis.com/v1/jwks', { signal: AbortSignal.timeout(10000) });
  const { keys } = await response.json();
  jwksCache = { keys: keys || [], expires: Date.now() + 6 * 3600000 };
  return jwksCache.keys;
}

// Verifies a Firebase App Check token (RS256 JWT from Play Integrity / debug provider).
export async function verifyAppCheck(token, fetcher = (...a) => globalThis.fetch(...a)) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64(parts[1])));
    if (header.alg !== 'RS256' || header.typ !== 'JWT') return false;
    if (payload.iss !== `https://firebaseappcheck.googleapis.com/${PROJECT_NUMBER}`) return false;
    if (!(Array.isArray(payload.aud) ? payload.aud : [payload.aud]).includes(`projects/${PROJECT_NUMBER}`)) return false;
    if (!(payload.exp * 1000 > Date.now())) return false;
    const jwk = (await appCheckKeys(fetcher)).find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  } catch { return false; }
}
