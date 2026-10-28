namespace Zapp.Cloud;

public sealed record WebLoginStatus(bool Enabled, string? Secret);

/// <summary>
/// Reads the "vault unlock code" set up in the Android app's Profile/Authenticator screen
/// (com.zpass.security.WebLoginAuth on the Android side) — a static Base32 secret stored on the
/// user doc, shown as a rotating 6-digit code in the app. Entering that code here proves phone
/// possession, and the static secret underneath doubles as the recovery password (exactly how
/// zpass.web.app's own "Vault unlock code" dialog already works — see app.js requestVaultUnlock).
/// </summary>
public static class WebLoginAuth
{
    public static async Task<WebLoginStatus> FetchStatusAsync(FirestoreClient firestore, string uid, CancellationToken ct = default)
    {
        var doc = await firestore.GetDocumentAsync($"users/{uid}", ct);
        if (doc is null) return new WebLoginStatus(false, null);
        var enabled = doc.Fields.TryGetValue("webLoginEnabled", out var v) && v is bool b && b;
        var secret = doc.GetString("webLoginSecret");
        return enabled && !string.IsNullOrEmpty(secret) ? new WebLoginStatus(true, secret) : new WebLoginStatus(false, null);
    }
}
