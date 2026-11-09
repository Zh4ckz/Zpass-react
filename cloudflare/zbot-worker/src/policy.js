// Validation rules shared by every route.
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };

// Same rule as firestore.rules isAdmin(): only the `admin` custom claim grants admin access.
// Email addresses never grant admin rights (the support address is not an admin).
export function isAdminIdentity(identity) {
  return !!identity && identity.admin === true;
}

export function username(value) {
  const name = String(value || '').toLowerCase().replace(/^@/, '');
  if (!/^[a-z][a-z0-9_]{3,31}$/.test(name) || name === 'zbot') fail(400, 'Invalid bot username');
  return name;
}

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const sha256 = async (text) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
export const randomId = () => hex(crypto.getRandomValues(new Uint8Array(12)));

// A bot token is "<bot number>:<43 random chars>" (older bots: "<24 hex id>:<43 chars>"). Only its SHA-256 is stored.
// The number is the bot's public numeric ID, so standard bot libraries that read it from the token work unchanged.
export const TOKEN = /^(?:[a-f0-9]{24}|[1-9]\d{8,11}):[A-Za-z0-9_-]{43}$/;
export async function tokenPair(left = randomId()) {
  const id = String(left);
  if (!/^(?:[a-f0-9]{24}|[1-9]\d{8,11})$/.test(id)) throw Error('Invalid bot ID');
  const token = `${id}:${b64url(crypto.getRandomValues(new Uint8Array(32)))}`;
  return { id, token, hash: await sha256(token) };
}
export async function tokenMatches(token, hash) {
  if (!TOKEN.test(token) || !/^[a-f0-9]{64}$/.test(hash || '')) return false;
  const actual = await sha256(token);
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= actual.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

// Bots get a random 10-digit number (6000000000–8999999999); people have 11 digits, so the two never overlap.
export function randomBotNumber() {
  const [a, b] = crypto.getRandomValues(new Uint32Array(2));
  return 6_000_000_000 + Number(((BigInt(a) << 32n) | BigInt(b)) % 3_000_000_000n);
}

// A person's public numeric ID. Same formula as the app (generate11DigitNumericId), so the number a bot sees
// is the "Z Pass Cloud ID" the person sees in the app.
export async function userNumber(uid) {
  if (!uid) return 10_000_000_000;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ZPASS_NUMERIC_ID_V1:' + uid)));
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(d[i]);
  n &= 0x7fffffffffffffffn;
  return Number(10_000_000_000n + (n % 90_000_000_000n));
}

// Commands: [{ command, description }], at most 100. Also accepts "cmd - description" lines.
const COMMAND = /^[a-z][a-z0-9_]{0,31}$/;
export function commands(value) {
  let list = value;
  if (typeof value === 'string' && value.trim().startsWith('[')) { try { list = JSON.parse(value); } catch { fail(400, 'commands must be a JSON array'); } }
  else if (typeof value === 'string') {
    list = value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const match = /^\/?(\S+)\s+-\s+(.+)$/.exec(line);
      if (!match) fail(400, 'Use command - description, one per line');
      return { command: match[1], description: match[2] };
    });
  }
  if (!Array.isArray(list) || list.length > 100) fail(400, 'Up to 100 commands are allowed');
  const seen = new Set();
  return list.map((item) => {
    const command = String(item?.command || '').trim().replace(/^\//, '').toLowerCase();
    const description = String(item?.description || '').trim();
    if (!COMMAND.test(command)) fail(400, `Invalid command: ${command || '(empty)'}`);
    if (!description || description.length > 100) fail(400, `Description for /${command} must be 1–100 characters`);
    if (seen.has(command)) fail(400, `Duplicate command: /${command}`);
    seen.add(command);
    return { command, description };
  });
}

export function webAppUrl(value) {
  const text = String(value || '').trim();
  let url;
  try { url = new URL(text); } catch { fail(400, 'Mini app URL must be a valid https address'); }
  if (url.protocol !== 'https:' || url.username || url.password || text.length > 512) fail(400, 'Mini app URL must be a valid https address');
  return url.toString();
}

export function menuButton(value) {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { fail(400, 'menu_button must be JSON'); } }
  const type = String(value?.type || 'commands');
  if (type === 'default' || type === 'commands') return { type };
  if (type !== 'web_app') fail(400, 'Menu type must be commands, web_app or default');
  const text = String(value?.text || '').trim();
  if (!text || text.length > 32) fail(400, 'Menu button text must be 1–32 characters');
  return { type, text, url: webAppUrl(value?.url ?? value?.web_app?.url) };
}
