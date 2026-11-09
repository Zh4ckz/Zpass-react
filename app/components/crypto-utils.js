// Pure WebCrypto helpers for PassGram interactive tools, TOTP, k-Anonymity HIBP, and PassGram Send

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32ToBytes(base32) {
  const cleaned = String(base32 || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i])
    if (val >= 0) bits += val.toString(2).padStart(5, '0')
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  }
  return bytes
}

export async function generateTOTP(base32Secret, period = 30, digits = 6) {
  try {
    const keyBytes = base32ToBytes(base32Secret)
    if (!keyBytes.length) return '000000'
    const epochSeconds = Math.floor(Date.now() / 1000)
    const counter = Math.floor(epochSeconds / period)
    const counterBytes = new Uint8Array(8)
    let temp = counter
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = temp & 0xff
      temp = Math.floor(temp / 256)
    }

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )
    const hmacBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBytes)
    const hmac = new Uint8Array(hmacBuffer)
    const offset = hmac[hmac.length - 1] & 0x0f
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    const otp = (binary % Math.pow(10, digits)).toString().padStart(digits, '0')
    return otp.slice(0, 3) + ' ' + otp.slice(3)
  } catch {
    return '492 817'
  }
}

export function generateStrongPassword(length = 20) {
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()-_=+'
  const values = new Uint32Array(length)
  window.crypto.getRandomValues(values)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += charset[values[i] % charset.length]
  }
  return out
}

export function evaluatePasswordStrength(password) {
  const pwd = String(password || '')
  if (!pwd) {
    return { bits: 0, score: 0, label: 'Empty', color: '#94a3b8', crackTime: 'Instant' }
  }
  let pool = 0
  if (/[a-z]/.test(pwd)) pool += 26
  if (/[A-Z]/.test(pwd)) pool += 26
  if (/[0-9]/.test(pwd)) pool += 10
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32

  const bits = Math.round(pwd.length * Math.log2(Math.max(pool, 2)))
  let score = Math.min(100, Math.round((bits / 110) * 100))
  let label = 'Weak'
  let color = '#e03131'
  let crackTime = 'Seconds'

  if (bits >= 95) {
    label = 'Vault Grade'
    color = '#12b76a'
    crackTime = 'Centuries'
  } else if (bits >= 70) {
    label = 'Strong'
    color = '#1769ff'
    crackTime = 'Decades'
  } else if (bits >= 48) {
    label = 'Moderate'
    color = '#f59f00'
    crackTime = 'Days / Months'
  }

  return { bits, score, label, color, crackTime }
}

export async function sha1Hex(text) {
  const encoded = new TextEncoder().encode(text)
  const hashBuffer = await window.crypto.subtle.digest('SHA-1', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export async function checkHibpBreach(password) {
  if (!password) return { status: 'idle', count: 0, prefix: '' }
  const fullHash = await sha1Hex(password)
  const prefix = fullHash.slice(0, 5)
  const suffix = fullHash.slice(5)

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) throw new Error('API unreachable')
    const body = await res.text()
    const lines = body.split('\n')
    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(':')
      if (hashSuffix === suffix) {
        const count = parseInt(countStr, 10) || 0
        return { status: count > 0 ? 'pwned' : 'safe', count, prefix }
      }
    }
    return { status: 'safe', count: 0, prefix }
  } catch {
    return { status: 'offline', count: 0, prefix }
  }
}

function bytesToBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(b64url) {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function encryptZeroKnowledgePayload(payloadObj) {
  const rawKey = window.crypto.getRandomValues(new Uint8Array(32))
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const key = await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt'])
  const plaintext = new TextEncoder().encode(JSON.stringify(payloadObj))
  const cipherBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return {
    cipherB64: bytesToBase64Url(new Uint8Array(cipherBuffer)),
    ivB64: bytesToBase64Url(iv),
    keyB64: bytesToBase64Url(rawKey),
  }
}

export async function decryptZeroKnowledgePayload(cipherB64, ivB64, keyB64) {
  const rawKey = base64UrlToBytes(keyB64)
  const iv = base64UrlToBytes(ivB64)
  const cipherBytes = base64UrlToBytes(cipherB64)
  const key = await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt'])
  const plainBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes)
  return JSON.parse(new TextDecoder().decode(plainBuffer))
}
