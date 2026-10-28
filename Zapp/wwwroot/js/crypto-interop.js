// Browser-crypto bridge for Zapp (Blazor WebAssembly). .NET's AesGcm and the pure-managed
// Argon2id implementation both throw PlatformNotSupportedException under the browser WASM
// runtime, so this handles the AEAD cipher (via Web Crypto SubtleCrypto) and the memory-hard KDF
// (via the same hash-wasm Argon2 bundle zpass.web.app already ships) on the JS side. This is a
// direct port of the proven functions in public/js/app.js, so Zapp derives byte-identical keys
// to the website for the same recovery password / salts.
window.zpassCrypto = (function () {
  const decodeBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const encodeBase64 = (bytes) => {
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  };
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  async function pbkdf2DeriveKeyBase64(password, saltBase64, iterations) {
    const material = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: decodeBase64(saltBase64), iterations },
      material,
      256
    );
    return encodeBase64(new Uint8Array(bits));
  }

  async function argon2idDeriveKeyBase64(password, saltBase64) {
    const hash = await window.hashwasm.argon2id({
      password,
      salt: decodeBase64(saltBase64),
      iterations: 3,
      parallelism: 4,
      memorySize: 65536,
      hashLength: 32,
      outputType: "binary"
    });
    return encodeBase64(hash instanceof Uint8Array ? hash : new Uint8Array(hash));
  }

  async function aesGcmEncryptBase64(plaintext, keyBase64) {
    const key = await crypto.subtle.importKey("raw", decodeBase64(keyBase64), "AES-GCM", false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, textEncoder.encode(plaintext || "")));
    const payload = new Uint8Array(iv.length + encrypted.length);
    payload.set(iv);
    payload.set(encrypted, iv.length);
    return encodeBase64(payload);
  }

  async function aesGcmDecryptUtf8(payloadBase64, keyBase64) {
    const key = await crypto.subtle.importKey("raw", decodeBase64(keyBase64), "AES-GCM", false, ["decrypt"]);
    const payload = decodeBase64(payloadBase64);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: payload.slice(0, 12), tagLength: 128 }, key, payload.slice(12));
    return textDecoder.decode(plain);
  }

  return { pbkdf2DeriveKeyBase64, argon2idDeriveKeyBase64, aesGcmEncryptBase64, aesGcmDecryptUtf8 };
})();
