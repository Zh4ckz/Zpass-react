using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Zapp.Cloud;

public sealed class FirebaseSession
{
    public required string IdToken { get; init; }
    public required string RefreshToken { get; init; }
    public required string LocalId { get; init; }
    public required string Email { get; init; }
    public DateTimeOffset ExpiresAt { get; init; }
}

/// <summary>Thin wrapper over the Identity Toolkit REST API — the same backend the mobile
/// app's Firebase Auth SDK talks to, just called directly over HTTPS instead of through the SDK.</summary>
public sealed class FirebaseAuthClient(string apiKey)
{
    private static readonly HttpClient Http = new();
    private readonly string _apiKey = apiKey;

    public async Task<FirebaseSession> SignInWithPasswordAsync(string email, string password, CancellationToken ct = default)
    {
        var response = await Http.PostAsJsonAsync(
            $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={_apiKey}",
            new { email, password, returnSecureToken = true },
            ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new FirebaseAuthException(ExtractErrorMessage(json));

        var body = JsonSerializer.Deserialize<SignInResponse>(json)
            ?? throw new FirebaseAuthException("Unexpected sign-in response");
        return new FirebaseSession
        {
            IdToken = body.IdToken,
            RefreshToken = body.RefreshToken,
            LocalId = body.LocalId,
            Email = body.Email,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(double.Parse(body.ExpiresIn))
        };
    }

    /// <summary>
    /// Exchanges a third-party provider credential (Google id_token, GitHub access_token, or
    /// Twitter access_token+oauth_token_secret) for a Firebase session — the same
    /// accounts:signInWithIdp call the mobile app's OAuthProvider sign-in makes under the hood.
    /// </summary>
    public async Task<FirebaseSession> SignInWithIdpAsync(string providerId, IDictionary<string, string> postBodyParams, CancellationToken ct = default)
    {
        var postBody = string.Join("&", postBodyParams
            .Append(new KeyValuePair<string, string>("providerId", providerId))
            .Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));

        var response = await Http.PostAsJsonAsync(
            $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key={_apiKey}",
            new { postBody, requestUri = "http://localhost", returnSecureToken = true, returnIdpCredential = true },
            ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new FirebaseAuthException(ExtractErrorMessage(json));

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        return new FirebaseSession
        {
            IdToken = root.GetProperty("idToken").GetString()!,
            RefreshToken = root.GetProperty("refreshToken").GetString()!,
            LocalId = root.GetProperty("localId").GetString()!,
            Email = root.TryGetProperty("email", out var email) ? email.GetString() ?? "" : "",
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(double.Parse(root.GetProperty("expiresIn").GetString()!))
        };
    }

    public async Task<FirebaseSession> RefreshAsync(FirebaseSession session, CancellationToken ct = default) =>
        await RefreshFromTokenAsync(session.RefreshToken, session.Email, ct);

    /// <summary>Mints a fresh session from a saved refresh token alone — used to restore a
    /// signed-in state after a page reload without asking for the email/password again.</summary>
    public async Task<FirebaseSession> RefreshFromTokenAsync(string refreshToken, string emailHint = "", CancellationToken ct = default)
    {
        var response = await Http.PostAsync(
            $"https://securetoken.googleapis.com/v1/token?key={_apiKey}",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken
            }), ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new FirebaseAuthException(ExtractErrorMessage(json));

        var body = JsonSerializer.Deserialize<RefreshResponse>(json)
            ?? throw new FirebaseAuthException("Unexpected token refresh response");
        return new FirebaseSession
        {
            IdToken = body.IdToken,
            RefreshToken = body.RefreshToken,
            LocalId = body.UserId,
            Email = emailHint,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(double.Parse(body.ExpiresIn))
        };
    }

    /// <summary>Sends Firebase's standard "reset your password" email with a link — the same
    /// flow the website's "Forgot your password?" button already uses.</summary>
    public async Task SendPasswordResetEmailAsync(string email, CancellationToken ct = default)
    {
        var response = await Http.PostAsJsonAsync(
            $"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={_apiKey}",
            new { requestType = "PASSWORD_RESET", email },
            ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new FirebaseAuthException(ExtractErrorMessage(json));
    }

    private static string ExtractErrorMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var message = doc.RootElement.GetProperty("error").GetProperty("message").GetString();
            return message switch
            {
                "EMAIL_NOT_FOUND" or "INVALID_LOGIN_CREDENTIALS" or "INVALID_PASSWORD" => "Incorrect email or password.",
                "USER_DISABLED" => "This account has been disabled.",
                "TOO_MANY_ATTEMPTS_TRY_LATER" => "Too many attempts. Try again later.",
                _ => message ?? "Sign-in failed."
            };
        }
        catch
        {
            return "Sign-in failed.";
        }
    }

    private sealed class SignInResponse
    {
        [JsonPropertyName("idToken")] public required string IdToken { get; init; }
        [JsonPropertyName("refreshToken")] public required string RefreshToken { get; init; }
        [JsonPropertyName("localId")] public required string LocalId { get; init; }
        [JsonPropertyName("email")] public required string Email { get; init; }
        [JsonPropertyName("expiresIn")] public required string ExpiresIn { get; init; }
    }

    private sealed class RefreshResponse
    {
        [JsonPropertyName("id_token")] public required string IdToken { get; init; }
        [JsonPropertyName("refresh_token")] public required string RefreshToken { get; init; }
        [JsonPropertyName("user_id")] public required string UserId { get; init; }
        [JsonPropertyName("expires_in")] public required string ExpiresIn { get; init; }
    }
}

public sealed class FirebaseAuthException(string message) : Exception(message);
