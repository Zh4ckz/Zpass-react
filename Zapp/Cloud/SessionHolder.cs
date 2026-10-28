namespace Zapp.Cloud;

/// <summary>Keeps the current Firebase session fresh, refreshing the ID token shortly before
/// it expires so long-running windows don't start failing Firestore calls mid-session.</summary>
public sealed class SessionHolder(FirebaseAuthClient auth, FirebaseSession initialSession)
{
    private FirebaseSession _session = initialSession;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public string Uid => _session.LocalId;
    public string Email => _session.Email;
    public string RefreshToken => _session.RefreshToken;

    public async Task<string> GetValidIdTokenAsync(CancellationToken ct = default)
    {
        if (DateTimeOffset.UtcNow < _session.ExpiresAt - TimeSpan.FromMinutes(5))
            return _session.IdToken;

        await _lock.WaitAsync(ct);
        try
        {
            if (DateTimeOffset.UtcNow >= _session.ExpiresAt - TimeSpan.FromMinutes(5))
                _session = await auth.RefreshAsync(_session, ct);
            return _session.IdToken;
        }
        finally
        {
            _lock.Release();
        }
    }
}
