namespace Zapp.Cloud;

public sealed class PasswordItem
{
    public string DocId { get; set; } = "";
    public string Platform { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string Domain { get; set; } = "";
    public string Notes { get; set; } = "";
    public string Category { get; set; } = "";
}

public sealed class CardItem
{
    public string DocId { get; set; } = "";
    public string Number { get; set; } = "";
    public string Cardholder { get; set; } = "";
    public string Expiry { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Bank { get; set; } = "";
    public string Nickname { get; set; } = "";
    public string Cvv { get; set; } = "";
    public string Cvv2 { get; set; } = "";
    public string Category { get; set; } = "";

    public string MaskedNumber => Number.Length <= 4
        ? Number
        : new string('•', Number.Length - 4) + Number[^4..];
}

public sealed class TotpItem
{
    public string DocId { get; set; } = "";
    public string Issuer { get; set; } = "";
    public string AccountName { get; set; } = "";
    public string Secret { get; set; } = "";
    public string Algorithm { get; set; } = "SHA1";
    public int Digits { get; set; } = 6;
    public int Period { get; set; } = 30;
}
