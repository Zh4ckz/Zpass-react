using System.Security.Cryptography;
using System.Text;
using Microsoft.JSInterop;

namespace Zapp.Security;

/// <summary>
/// Browser build of the same PortableCloudCrypto contract used by the WPF app and the Android
/// app — AES-GCM and Argon2id both throw PlatformNotSupportedException under Blazor
/// WebAssembly's Mono runtime, so the AEAD cipher and the memory-hard KDF are delegated to the
/// browser's own Web Crypto API / a WASM Argon2 build via JS interop (wwwroot/js/crypto-interop.js),
/// the same approach zpass.web.app's own vanilla-JS client already uses. HMAC (for document IDs)
/// works fine under WASM, so that part stays plain C#.
/// </summary>
public sealed class PortableCloudCrypto(IJSRuntime js)
{
    public const string EncryptionV1 = "AES-256-GCM-recovery-v1";
    public const string EncryptionV2 = "AES-256-GCM-recovery-v2";
    public const string KdfLabelV2 = "Argon2id-m65536-t3-p4+PBKDF2-HMAC-SHA256-600000";
    private const int IterationsV1 = 210_000;
    private const int IterationsV2 = 600_000;
    private const string CheckTextV1 = "ZPASS-PORTABLE-VAULT-V1";
    private const string CheckTextV2 = "ZPASS-PORTABLE-VAULT-V2";

    public static byte[] NewSalt()
    {
        var salt = new byte[32];
        RandomNumberGenerator.Fill(salt);
        return salt;
    }

    public static string Encode(byte[] bytes) => Convert.ToBase64String(bytes);
    public static byte[] Decode(string value) => Convert.FromBase64String(value);

    public ValueTask<string> DeriveKeyBase64Async(string password, byte[] salt) =>
        js.InvokeAsync<string>("zpassCrypto.pbkdf2DeriveKeyBase64", password, Encode(salt), IterationsV1);

    public ValueTask<string> DeriveKeyArgon2idBase64Async(string password, byte[] salt) =>
        js.InvokeAsync<string>("zpassCrypto.argon2idDeriveKeyBase64", password, Encode(salt));

    public ValueTask<string> DeriveKeySecondLayerBase64Async(string password, byte[] salt) =>
        js.InvokeAsync<string>("zpassCrypto.pbkdf2DeriveKeyBase64", password, Encode(salt), IterationsV2);

    public ValueTask<string> EncryptAsync(string value, string keyBase64) =>
        js.InvokeAsync<string>("zpassCrypto.aesGcmEncryptBase64", value, keyBase64);

    public ValueTask<string> DecryptAsync(string value, string keyBase64) =>
        js.InvokeAsync<string>("zpassCrypto.aesGcmDecryptUtf8", value, keyBase64);

    public async Task<string> EncryptV2Async(string value, string key1, string key2) =>
        await EncryptAsync(await EncryptAsync(value, key1), key2);

    public async Task<string> DecryptV2Async(string value, string key1, string key2) =>
        await DecryptAsync(await DecryptAsync(value, key2), key1);

    public async Task<string> CreateKeyCheckAsync(string keyBase64) => await EncryptAsync(CheckTextV1, keyBase64);

    public async Task<bool> VerifyKeyAsync(string keyBase64, string keyCheck)
    {
        try { return await DecryptAsync(keyCheck, keyBase64) == CheckTextV1; }
        catch { return false; }
    }

    public async Task<string> CreateKeyCheckV2Async(string key1, string key2) => await EncryptV2Async(CheckTextV2, key1, key2);

    public async Task<bool> VerifyKeyV2Async(string key1, string key2, string keyCheck)
    {
        try { return await DecryptV2Async(keyCheck, key1, key2) == CheckTextV2; }
        catch { return false; }
    }

    /// <summary>HMAC-SHA256 works natively under WASM — no JS bridge needed here.</summary>
    public static string DocumentId(string identity, string keyBase64)
    {
        using var hmac = new HMACSHA256(Decode(keyBase64));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(identity));
        return Convert.ToBase64String(hash).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }
}
