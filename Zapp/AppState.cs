using Zapp.Cloud;

namespace Zapp;

/// <summary>Holds the signed-in session and unlocked vault handle for the lifetime of the SPA
/// (one browser tab = one app instance, so a singleton is equivalent to per-user state here).</summary>
public sealed class AppState
{
    public SessionHolder? SessionHolder { get; set; }
    public FirestoreClient? Firestore { get; set; }
    public VaultRepository? Repository { get; set; }
    public VaultCipher? Cipher { get; set; }

    /// <summary>The recovery password (or the vault-unlock-code secret standing in for one) that
    /// unlocked the current session — kept in memory only so "set a local passcode" can protect it
    /// for quick-unlock. Cleared on sign-out.</summary>
    public string? RecoveryPassword { get; set; }

    public bool IsSignedIn => SessionHolder is not null;
    public bool IsUnlocked => Cipher is not null;

    public void Clear()
    {
        SessionHolder = null;
        Firestore = null;
        Repository = null;
        Cipher = null;
        RecoveryPassword = null;
    }
}
