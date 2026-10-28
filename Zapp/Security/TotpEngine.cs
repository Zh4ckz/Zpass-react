using System.Security.Cryptography;

namespace Zapp.Security;

/// <summary>C# port of com.zpass.security.TotpEngine — standard RFC 6238 TOTP, Base32 secrets.</summary>
public static class TotpEngine
{
    private static readonly int[] Pow10 = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];
    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static string CodeForSecret(string secretBase32, string algorithm = "SHA1", int digits = 6, int period = 30, long? nowMillis = null)
    {
        var key = Base32Decode(secretBase32);
        var now = nowMillis ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var counter = now / 1000L / period;

        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian) Array.Reverse(counterBytes);

        using HMAC mac = algorithm.ToUpperInvariant() switch
        {
            "SHA256" => new HMACSHA256(key),
            "SHA512" => new HMACSHA512(key),
            _ => new HMACSHA1(key)
        };
        var hash = mac.ComputeHash(counterBytes);
        var offset = hash[^1] & 0x0f;
        var binary = ((hash[offset] & 0x7f) << 24) |
                     ((hash[offset + 1] & 0xff) << 16) |
                     ((hash[offset + 2] & 0xff) << 8) |
                     (hash[offset + 3] & 0xff);
        var modulus = digits >= 0 && digits < Pow10.Length ? Pow10[digits] : 1_000_000;
        return (binary % modulus).ToString().PadLeft(digits, '0');
    }

    /// <summary>Matches the website's verifyTotpCode: accepts the current step plus the
    /// previous/next step, to tolerate clock drift between the phone and this device.</summary>
    public static bool VerifyCode(string secretBase32, string codeInput, int digits = 6, int period = 30)
    {
        var code = codeInput.Trim();
        if (code.Length != digits || !code.All(char.IsAsciiDigit)) return false;
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        foreach (var stepOffset in new[] { 0, -1, 1 })
        {
            var shifted = now + stepOffset * period * 1000L;
            if (CodeForSecret(secretBase32, "SHA1", digits, period, shifted) == code) return true;
        }
        return false;
    }

    public static string GenerateSecret(int byteLength = 20)
    {
        var random = new byte[byteLength];
        RandomNumberGenerator.Fill(random);
        return Base32Encode(random);
    }

    public static int SecondsRemaining(int period = 30, long? nowMillis = null)
    {
        var now = nowMillis ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        return (int)(period - now / 1000L % period);
    }

    private static byte[] Base32Decode(string input)
    {
        var buffer = 0;
        var bits = 0;
        var output = new List<byte>();
        foreach (var rawChar in input.ToUpperInvariant())
        {
            if (rawChar == '=' || char.IsWhiteSpace(rawChar)) continue;
            var value = Base32Alphabet.IndexOf(rawChar);
            if (value < 0) throw new ArgumentException("Invalid Base32 secret");
            buffer = (buffer << 5) | value;
            bits += 5;
            if (bits >= 8)
            {
                bits -= 8;
                output.Add((byte)((buffer >> bits) & 0xff));
            }
        }
        return output.ToArray();
    }

    private static string Base32Encode(byte[] input)
    {
        var buffer = 0;
        var bits = 0;
        var output = new System.Text.StringBuilder();
        foreach (var b in input)
        {
            buffer = (buffer << 8) | b;
            bits += 8;
            while (bits >= 5)
            {
                bits -= 5;
                output.Append(Base32Alphabet[(buffer >> bits) & 0x1f]);
            }
        }
        if (bits > 0) output.Append(Base32Alphabet[(buffer << (5 - bits)) & 0x1f]);
        return output.ToString();
    }
}
