using Zapp.Security;

namespace Zapp.Cloud;

public sealed class VaultUnlockException(string message) : Exception(message);

public sealed class VaultCipher
{
    public required Func<string, Task<string>> EncryptValue { get; init; }
    public required Func<string, Task<string>> DecryptValue { get; init; }
    public required string DocumentIdKey { get; init; }
    public required Dictionary<string, object?> MetadataFields { get; init; }
}

public sealed class VaultRepository(FirestoreClient firestore, PortableCloudCrypto crypto, string uid)
{
    private string VaultPath => $"vaults/{uid}";

    public async Task<VaultCipher> ResolveCipherAsync(string recoveryPassword, CancellationToken ct = default)
    {
        var metadata = await firestore.GetDocumentAsync(VaultPath, ct);
        var existingEncryption = metadata?.GetString("encryption");
        if (existingEncryption is not null
            && existingEncryption != PortableCloudCrypto.EncryptionV1
            && existingEncryption != PortableCloudCrypto.EncryptionV2)
        {
            throw new VaultUnlockException(
                "This account has only a device-bound backup, not an encrypted (E2E) recovery vault yet. " +
                "On your phone, open Z Pass → Profile → Backup, set a recovery password, and back up the vault once — " +
                "then try unlocking here again. If this is a brand-new account, just enter a new recovery password " +
                "below and it will be created.");
        }

        var existingSaltB64 = metadata?.GetString("recoverySalt");
        var existingSalt2B64 = metadata?.GetString("recoverySalt2");
        var existingCheck = metadata?.GetString("recoveryKeyCheck");
        var salt = string.IsNullOrEmpty(existingSaltB64) ? PortableCloudCrypto.NewSalt() : PortableCloudCrypto.Decode(existingSaltB64);

        if (existingEncryption is null or PortableCloudCrypto.EncryptionV2)
        {
            var salt2 = string.IsNullOrEmpty(existingSalt2B64) ? PortableCloudCrypto.NewSalt() : PortableCloudCrypto.Decode(existingSalt2B64);
            var key1 = await crypto.DeriveKeyArgon2idBase64Async(recoveryPassword, salt);
            var key2 = await crypto.DeriveKeySecondLayerBase64Async(recoveryPassword, salt2);
            if (!string.IsNullOrEmpty(existingCheck) && !await crypto.VerifyKeyV2Async(key1, key2, existingCheck))
                throw new VaultUnlockException("Recovery password is incorrect");

            return new VaultCipher
            {
                EncryptValue = value => crypto.EncryptV2Async(value, key1, key2),
                DecryptValue = value => crypto.DecryptV2Async(value, key1, key2),
                DocumentIdKey = key2,
                MetadataFields = new Dictionary<string, object?>
                {
                    ["encryption"] = PortableCloudCrypto.EncryptionV2,
                    ["recoverySalt"] = PortableCloudCrypto.Encode(salt),
                    ["recoverySalt2"] = PortableCloudCrypto.Encode(salt2),
                    ["recoveryKeyCheck"] = string.IsNullOrEmpty(existingCheck) ? await crypto.CreateKeyCheckV2Async(key1, key2) : existingCheck,
                    ["kdf"] = PortableCloudCrypto.KdfLabelV2
                }
            };
        }
        else
        {
            var key = await crypto.DeriveKeyBase64Async(recoveryPassword, salt);
            if (!string.IsNullOrEmpty(existingCheck) && !await crypto.VerifyKeyAsync(key, existingCheck))
                throw new VaultUnlockException("Recovery password is incorrect");

            return new VaultCipher
            {
                EncryptValue = value => crypto.EncryptAsync(value, key).AsTask(),
                DecryptValue = value => crypto.DecryptAsync(value, key).AsTask(),
                DocumentIdKey = key,
                MetadataFields = new Dictionary<string, object?>
                {
                    ["encryption"] = PortableCloudCrypto.EncryptionV1,
                    ["recoverySalt"] = PortableCloudCrypto.Encode(salt),
                    ["recoveryKeyCheck"] = string.IsNullOrEmpty(existingCheck) ? await crypto.CreateKeyCheckAsync(key) : existingCheck,
                    ["kdf"] = "PBKDF2-HMAC-SHA256-210000"
                }
            };
        }
    }

    // ---- Passwords ----

    public async Task<List<PasswordItem>> GetPasswordsAsync(VaultCipher cipher, CancellationToken ct = default)
    {
        var docs = await firestore.ListDocumentsAsync($"{VaultPath}/portableItems", ct);
        var result = new List<PasswordItem>();
        foreach (var doc in docs)
        {
            try
            {
                result.Add(new PasswordItem
                {
                    DocId = doc.Id,
                    Platform = await cipher.DecryptValue(doc.GetString("platformCipher")),
                    Username = await cipher.DecryptValue(doc.GetString("usernameCipher")),
                    Password = await cipher.DecryptValue(doc.GetString("passwordCipher")),
                    Domain = await cipher.DecryptValue(doc.GetString("domainCipher")),
                    Notes = await cipher.DecryptValue(doc.GetString("notesCipher")),
                    Category = await cipher.DecryptValue(doc.GetString("categoryCipher"))
                });
            }
            catch { /* undecryptable item — skip rather than crash the whole list */ }
        }
        return result;
    }

    public async Task SavePasswordAsync(VaultCipher cipher, PasswordItem item, CancellationToken ct = default)
    {
        var newId = PortableCloudCrypto.DocumentId($"{item.Platform} {item.Username}", cipher.DocumentIdKey);
        var payload = new Dictionary<string, object?>
        {
            ["platformCipher"] = await cipher.EncryptValue(item.Platform),
            ["usernameCipher"] = await cipher.EncryptValue(item.Username),
            ["passwordCipher"] = await cipher.EncryptValue(item.Password),
            ["domainCipher"] = await cipher.EncryptValue(item.Domain),
            ["notesCipher"] = await cipher.EncryptValue(item.Notes),
            ["categoryCipher"] = await cipher.EncryptValue(item.Category),
            ["cryptoVersion"] = 1L,
            ["updatedAt"] = DateTimeOffset.UtcNow
        };
        await firestore.SetDocumentAsync($"{VaultPath}/portableItems/{newId}", payload, ct);
        if (!string.IsNullOrEmpty(item.DocId) && item.DocId != newId)
            await firestore.DeleteDocumentAsync($"{VaultPath}/portableItems/{item.DocId}", ct);
        item.DocId = newId;
    }

    public Task DeletePasswordAsync(string docId, CancellationToken ct = default) =>
        firestore.DeleteDocumentAsync($"{VaultPath}/portableItems/{docId}", ct);

    // ---- Cards ----

    public async Task<List<CardItem>> GetCardsAsync(VaultCipher cipher, CancellationToken ct = default)
    {
        var docs = await firestore.ListDocumentsAsync($"{VaultPath}/portableCards", ct);
        var result = new List<CardItem>();
        foreach (var doc in docs)
        {
            try
            {
                result.Add(new CardItem
                {
                    DocId = doc.Id,
                    Number = await cipher.DecryptValue(doc.GetString("numberCipher")),
                    Cardholder = await cipher.DecryptValue(doc.GetString("cardholderCipher")),
                    Expiry = await cipher.DecryptValue(doc.GetString("expiryCipher")),
                    Brand = await cipher.DecryptValue(doc.GetString("brandCipher")),
                    Bank = await cipher.DecryptValue(doc.GetString("bankCipher")),
                    Nickname = await cipher.DecryptValue(doc.GetString("nicknameCipher")),
                    Cvv = await cipher.DecryptValue(doc.GetString("cvvCipher")),
                    Cvv2 = await cipher.DecryptValue(doc.GetString("cvv2Cipher")),
                    Category = await cipher.DecryptValue(doc.GetString("categoryCipher"))
                });
            }
            catch { /* skip undecryptable */ }
        }
        return result;
    }

    public async Task SaveCardAsync(VaultCipher cipher, CardItem card, CancellationToken ct = default)
    {
        var newId = PortableCloudCrypto.DocumentId($"card {card.Number}", cipher.DocumentIdKey);
        var payload = new Dictionary<string, object?>
        {
            ["numberCipher"] = await cipher.EncryptValue(card.Number),
            ["cardholderCipher"] = await cipher.EncryptValue(card.Cardholder),
            ["expiryCipher"] = await cipher.EncryptValue(card.Expiry),
            ["brandCipher"] = await cipher.EncryptValue(card.Brand),
            ["bankCipher"] = await cipher.EncryptValue(card.Bank),
            ["nicknameCipher"] = await cipher.EncryptValue(card.Nickname),
            ["cvvCipher"] = await cipher.EncryptValue(card.Cvv),
            ["cvv2Cipher"] = await cipher.EncryptValue(card.Cvv2),
            ["categoryCipher"] = await cipher.EncryptValue(card.Category),
            ["cryptoVersion"] = 1L,
            ["updatedAt"] = DateTimeOffset.UtcNow
        };
        await firestore.SetDocumentAsync($"{VaultPath}/portableCards/{newId}", payload, ct);
        if (!string.IsNullOrEmpty(card.DocId) && card.DocId != newId)
            await firestore.DeleteDocumentAsync($"{VaultPath}/portableCards/{card.DocId}", ct);
        card.DocId = newId;
    }

    public Task DeleteCardAsync(string docId, CancellationToken ct = default) =>
        firestore.DeleteDocumentAsync($"{VaultPath}/portableCards/{docId}", ct);

    // ---- Authenticators (2FA / TOTP) ----

    public async Task<List<TotpItem>> GetTotpsAsync(VaultCipher cipher, CancellationToken ct = default)
    {
        var docs = await firestore.ListDocumentsAsync($"{VaultPath}/portableAuthenticators", ct);
        var result = new List<TotpItem>();
        foreach (var doc in docs)
        {
            try
            {
                var digits = (int)doc.GetLong("digits");
                var period = (int)doc.GetLong("period");
                result.Add(new TotpItem
                {
                    DocId = doc.Id,
                    Issuer = await cipher.DecryptValue(doc.GetString("issuerCipher")),
                    AccountName = await cipher.DecryptValue(doc.GetString("accountCipher")),
                    Secret = await cipher.DecryptValue(doc.GetString("secretCipher")),
                    Algorithm = await cipher.DecryptValue(doc.GetString("algorithmCipher")),
                    Digits = digits > 0 ? digits : 6,
                    Period = period > 0 ? period : 30
                });
            }
            catch { /* skip undecryptable */ }
        }
        return result;
    }

    public async Task SaveTotpAsync(VaultCipher cipher, TotpItem totp, CancellationToken ct = default)
    {
        var newId = PortableCloudCrypto.DocumentId($"totp {totp.Issuer} {totp.AccountName}", cipher.DocumentIdKey);
        var payload = new Dictionary<string, object?>
        {
            ["issuerCipher"] = await cipher.EncryptValue(totp.Issuer),
            ["accountCipher"] = await cipher.EncryptValue(totp.AccountName),
            ["secretCipher"] = await cipher.EncryptValue(totp.Secret),
            ["algorithmCipher"] = await cipher.EncryptValue(totp.Algorithm),
            ["digits"] = (long)totp.Digits,
            ["period"] = (long)totp.Period,
            ["cryptoVersion"] = 1L,
            ["updatedAt"] = DateTimeOffset.UtcNow
        };
        await firestore.SetDocumentAsync($"{VaultPath}/portableAuthenticators/{newId}", payload, ct);
        if (!string.IsNullOrEmpty(totp.DocId) && totp.DocId != newId)
            await firestore.DeleteDocumentAsync($"{VaultPath}/portableAuthenticators/{totp.DocId}", ct);
        totp.DocId = newId;
    }

    public Task DeleteTotpAsync(string docId, CancellationToken ct = default) =>
        firestore.DeleteDocumentAsync($"{VaultPath}/portableAuthenticators/{docId}", ct);

    // ---- Metadata ----

    public Task RefreshCountsAsync(VaultCipher cipher, int passwordCount, int cardCount, int totpCount, CancellationToken ct = default)
    {
        var fields = new Dictionary<string, object?>(cipher.MetadataFields)
        {
            ["itemCount"] = (long)passwordCount,
            ["cardCount"] = (long)cardCount,
            ["authenticatorCount"] = (long)totpCount,
            ["lastSyncAt"] = DateTimeOffset.UtcNow
        };
        return firestore.MergeDocumentAsync(VaultPath, fields, ct);
    }
}
