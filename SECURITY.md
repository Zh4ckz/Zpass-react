# Security Policy & Architecture

PassGram (`zpas.org`) is built on the principle that your privacy is the foundation, not an optional feature. This document outlines our security architecture, supported versions, and how to report security vulnerabilities responsibly.

---

## Supported Platforms & Versions

Security updates are delivered continuously to our web platform and latest native releases:

| Platform / Component | Version / Channel | Supported |
| :--- | :--- | :---: |
| **PassGram Web** (`web.zpas.org`) | Production (Latest) | ✅ |
| **PassGram Android** | Latest Release (`2026.x`) | ✅ |
| **PassGram Windows** | Latest Release (`2026.x`) | ✅ |
| **Payment & Billing API** (`pay.zpas.org`) | Cloudflare Worker (`v2`) | ✅ |
| **Bot Gateway API** (`botapi.zpas.org`) | Cloudflare Worker (`v2`) | ✅ |
| Legacy Releases | `< 2026.0` | ❌ |

---

## Cryptographic & Zero-Knowledge Architecture

1. **Client-Side Encryption (`AES-256-GCM`)**:
   Sensitive vault records, notes, authenticator secrets, and PassGram Send payloads are encrypted in the client using WebCrypto (`AES-256-GCM`) with authenticated 96-bit initialization vectors (IVs) before transmission or link generation.
2. **Key Derivation (`PBKDF2-SHA256` / High-Entropy Ephemeral Keys)**:
   Master secrets and passphrase-protected items derive 256-bit keys client-side via `PBKDF2` (`SHA-256`, 100,000+ iterations) with unique cryptographic salts. URL fragment keys (`#key=...`) never leave the browser and are never transmitted in HTTP requests.
3. **k-Anonymity Password Breach Auditing**:
   Our Password Health & Breach Auditor computes the `SHA-1` hash of a tested password locally in the browser and sends only the first **5 hexadecimal characters** (prefix) to the Pwned Passwords API. The full password and full hash never leave your device.
4. **Session & Device Control**:
   Every sign-in is tied to a verifiable Firebase Auth token and device session record, allowing instant remote revocation from Settings.
5. **Payment Isolation**:
   Card details are processed exclusively on Stripe-hosted pages. PassGram servers and Workers validate Stripe HMAC webhook signatures (`Stripe-Signature`), enforce strict idempotency keys, and never store raw payment card numbers.

---

## Reporting a Vulnerability (Responsible Disclosure)

If you discover a security vulnerability in PassGram Web, our Android/Windows applications, or any `*.zpas.org` API endpoint, please report it privately so we can address it before public disclosure.

### Where to Report
* **Support & Security Portal**: [https://zpas.org/support](https://zpas.org/support)
* **Direct Founder Contact (X)**: [@4rezan](https://x.com/4rezan)

### What to Include
* Affected domain, endpoint, or application version (e.g., `web.zpas.org`, `botapi.zpas.org`).
* Step-by-step reproduction instructions or a minimal proof-of-concept (PoC).
* Potential impact assessment.

### Response Timeline & Safe Harbor
* **Acknowledgment**: Within **24–48 hours** of receiving your report.
* **Triage & Fix**: Critical issues are patched and deployed within **72 hours**.
* **Safe Harbor**: We will not pursue legal action against security researchers who test in good faith, avoid accessing other users' data, and do not degrade service availability (DoS/spam).
