const encoder = new TextEncoder();
let keyCache;

export async function requireAdmin(context) {
  const { env, request } = context;
  const team = (env.ACCESS_TEAM_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const aud = env.ACCESS_AUD;
  const emails = (env.ACCESS_ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!team || !aud || !emails.length) return jsonError(503, 'Cloudflare Access allow-list ve audience sırlarını yapılandır.');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return jsonError(401, 'Cloudflare Access oturumu gerekli.');
  try {
    const claims = await verifyAccessJwt(token, team);
    if (claims.iss !== `https://${team}` || !Array.isArray(claims.aud) || !claims.aud.includes(aud) || !claims.email || !emails.includes(String(claims.email).toLowerCase()) || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error('Access policy mismatch');
    return null;
  } catch { return jsonError(403, 'Cloudflare Access doğrulaması başarısız.'); }
}

async function verifyAccessJwt(jwt, team) {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('bad jwt');
  const header = JSON.parse(decodeBase64Url(parts[0]));
  const claims = JSON.parse(decodeBase64Url(parts[1]));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('bad alg');
  const jwks = await getJwks(team);
  const jwk = jwks.keys.find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('key missing');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const data = encoder.encode(`${parts[0]}.${parts[1]}`);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)) throw new Error('signature invalid');
  return claims;
}

async function getJwks(team) {
  if (keyCache && keyCache.until > Date.now()) return keyCache.value;
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('JWKS unavailable');
  const value = await response.json();
  keyCache = { value, until: Date.now() + 5 * 60 * 1000 };
  return value;
}
function decodeBase64Url(value) { return decodeURIComponent(Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')); }
function jsonError(status, error) { return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } }); }
