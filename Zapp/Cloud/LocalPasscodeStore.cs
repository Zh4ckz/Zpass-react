using System.Text.Json;
using Microsoft.JSInterop;
using Zapp.Security;

namespace Zapp.Cloud;

/// <summary>
/// "Quick unlock" for this browser: after a full sign-in + vault unlock, the user can set a short
/// local passcode instead of retyping the recovery password (or redoing the phone 2FA code) every
/// time they reopen the tab — the same convenience Bitwarden Desktop's "local passcode" and Proton
/// Pass's biometric quick-unlock give. It does NOT replace the real recovery-password security: the
/// Firebase refresh token and the recovery password are stored in localStorage only as AES-GCM
/// ciphertext, keyed by a PBKDF2 derivation of the passcode. Too many wrong passcode attempts (or an
/// explicit sign-out) wipes this local copy, forcing a full re-login + phone 2FA next time.
/// </summary>
public sealed class LocalPasscodeStore(IJSRuntime js, PortableCloudCrypto crypto)
{
    private const string StorageKey = "zpassQuickUnlock";
    public const int MaxAttempts = 5;

    private sealed class Payload
    {
        public string RefreshToken { get; set; } = "";
        public string Email { get; set; } = "";
        public string RecoveryPassword { get; set; } = "";
    }

    public async Task<bool> HasSavedSessionAsync() =>
        !string.IsNullOrEmpty(await js.InvokeAsync<string?>("localStorage.getItem", StorageKey));

    public async Task SaveAsync(string passcode, string refreshToken, string email, string recoveryPassword)
    {
        var salt = PortableCloudCrypto.NewSalt();
        var key = await crypto.DeriveKeyBase64Async(passcode, salt);
        var payloadJson = JsonSerializer.Serialize(new Payload { RefreshToken = refreshToken, Email = email, RecoveryPassword = recoveryPassword });
        var cipherText = await crypto.EncryptAsync(payloadJson, key);
        var stored = JsonSerializer.Serialize(new { salt = PortableCloudCrypto.Encode(salt), cipher = cipherText });
        await js.InvokeVoidAsync("localStorage.setItem", StorageKey, stored);
    }

    /// <returns>Null if the passcode was wrong; the recovered session info otherwise.</returns>
    public async Task<(string RefreshToken, string Email, string RecoveryPassword)?> TryUnlockAsync(string passcode)
    {
        var stored = await js.InvokeAsync<string?>("localStorage.getItem", StorageKey);
        if (string.IsNullOrEmpty(stored)) return null;

        using var doc = JsonDocument.Parse(stored);
        var salt = PortableCloudCrypto.Decode(doc.RootElement.GetProperty("salt").GetString()!);
        var cipherText = doc.RootElement.GetProperty("cipher").GetString()!;
        var key = await crypto.DeriveKeyBase64Async(passcode, salt);
        try
        {
            var json = await crypto.DecryptAsync(cipherText, key);
            var payload = JsonSerializer.Deserialize<Payload>(json)!;
            return (payload.RefreshToken, payload.Email, payload.RecoveryPassword);
        }
        catch
        {
            return null;
        }
    }

    public async Task ClearAsync() => await js.InvokeVoidAsync("localStorage.removeItem", StorageKey);
}
