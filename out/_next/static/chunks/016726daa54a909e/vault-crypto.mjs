// Browser side of the PassGram portable vault, byte-compatible with the Android app:
//  - LoginApproval.kt  (ECDH P-256 approval: the phone wraps the vault password for THIS browser only)
//  - PortableCloudCrypto.kt (Argon2id m=64MiB t=3 p=4 + PBKDF2-SHA256 600k, AES-256-GCM, 12-byte IV, standard base64)
// Pure functions only (no DOM, no Firebase) so they can be tested against an independent implementation.
const subtle = globalThis.crypto.subtle;
const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder();

export const b64encode = (bytes) => { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); };
export const b64decode = (text) => Uint8Array.from(atob(String(text)), (c) => c.charCodeAt(0));

// ---------- approval key exchange (LoginApproval.kt, protocolVersion 2) ----------
export async function createApprovalKeys() {
  const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const publicB64 = b64encode(await subtle.exportKey('spki', pair.publicKey)); // X.509 SubjectPublicKeyInfo, like Java's encoded key
  return { privateKey: pair.privateKey, publicB64 };
}

/** Decrypts approvedSecretEnc. wrapKey = SHA-256(ECDH secret || "ZPass.LoginApproval.v2|id|uid|requestPub|responsePub"). */
export async function unwrapApprovalSecret({ privateKey, requestPublicB64, responsePublicB64, requestId, uid, approvedSecretEnc }) {
  const peer = await subtle.importKey('spki', b64decode(responsePublicB64), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: peer }, privateKey, 256));
  const context = utf8.encode(`ZPass.LoginApproval.v2|${requestId}|${uid}|${requestPublicB64}|${responsePublicB64}`);
  const material = new Uint8Array(shared.length + context.length); material.set(shared); material.set(context, shared.length);
  shared.fill(0);
  const wrap = await subtle.importKey('raw', await subtle.digest('SHA-256', material), 'AES-GCM', false, ['decrypt']);
  material.fill(0);
  return decryptText(approvedSecretEnc, wrap);
}

// ---------- vault keys (PortableCloudCrypto.kt) ----------
export async function decryptText(value, key) {
  const payload = b64decode(value);
  if (payload.length < 28) throw Error('Invalid encrypted value'); // 12-byte IV + 16-byte tag (empty plaintext is valid)
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: payload.slice(0, 12), tagLength: 128 }, key, payload.slice(12));
  return fromUtf8.decode(plain);
}

async function pbkdf2Key(password, saltB64, iterations) {
  const material = await subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b64decode(saltB64), iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}

async function argon2Key(password, saltB64, argon2id) {
  const hash = await argon2id({ password, salt: b64decode(saltB64), iterations: 3, parallelism: 4, memorySize: 65536, hashLength: 32, outputType: 'binary' });
  const key = await subtle.importKey('raw', hash, 'AES-GCM', false, ['decrypt']);
  hash.fill?.(0);
  return key;
}

/**
 * Opens the portable vault with the password the phone sent.
 * Returns { decrypt(value) } on success, null if the password does not open this vault, undefined if there is no vault.
 */
export async function openVault(password, meta, argon2id) {
  if (!meta || typeof password !== 'string' || password.length < 10) return meta ? null : undefined;
  if (meta.encryption === 'AES-256-GCM-recovery-v2') {
    const [key1, key2] = await Promise.all([argon2Key(password, meta.recoverySalt, argon2id), pbkdf2Key(password, meta.recoverySalt2, 600000)]);
    const decrypt = async (value) => decryptText(await decryptText(value, key2), key1);
    const check = await decrypt(meta.recoveryKeyCheck).catch(() => null);
    return check === 'ZPASS-PORTABLE-VAULT-V2' ? { decrypt } : null;
  }
  if (meta.encryption === 'AES-256-GCM-recovery-v1') {
    const key = await pbkdf2Key(password, meta.recoverySalt, 210000);
    const decrypt = (value) => decryptText(value, key);
    const check = await decrypt(meta.recoveryKeyCheck).catch(() => null);
    return check === 'ZPASS-PORTABLE-VAULT-V1' ? { decrypt } : null;
  }
  return undefined;
}

// ---------- authenticator codes (RFC 6238 TOTP) ----------
function base32(text) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(text).toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, value = 0; const out = [];
  for (const ch of clean) {
    const v = alphabet.indexOf(ch);
    if (v < 0) throw Error('Invalid secret');
    value = (value << 5) | v; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

const keyCache = new Map();
export async function totp({ secret, algorithm = 'SHA1', digits = 6, period = 30 }, now = Date.now()) {
  const hash = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' }[String(algorithm || 'SHA1').toUpperCase().replace(/[^A-Z0-9]/g, '')] || 'SHA-1';
  const step = Number(period) > 0 ? Number(period) : 30;
  const size = [6, 7, 8].includes(Number(digits)) ? Number(digits) : 6;
  const cacheKey = hash + '|' + secret;
  let key = keyCache.get(cacheKey);
  if (!key) { key = await subtle.importKey('raw', base32(secret), { name: 'HMAC', hash }, false, ['sign']); keyCache.set(cacheKey, key); }
  const counter = Math.floor(now / 1000 / step);
  const msg = new DataView(new ArrayBuffer(8));
  msg.setUint32(0, Math.floor(counter / 2 ** 32)); msg.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await subtle.sign('HMAC', key, msg.buffer));
  const offset = mac[mac.length - 1] & 15;
  const bin = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return { code: String(bin % 10 ** size).padStart(size, '0'), remaining: step - (Math.floor(now / 1000) % step), period: step };
}
export const forgetTotpKeys = () => keyCache.clear();
