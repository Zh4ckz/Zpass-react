from pathlib import Path
p=Path('ZPass-Modern/Cloud/VaultRepository.cs');s=p.read_text();start=s.index('                result.Add(new CardItem',s.index('public async Task<List<CardItem>>'));end=s.index('                });',start)+len('                });');body=s[start:end].replace('                result.Add(new CardItem','        return new CardItem').replace('                });','        };');s=s[:start]+'                result.Add(ReadCardDocument(doc, cipher));'+s[end:];needle='    public async Task<List<CardItem>> GetCardsAsync';helper='''    public static CardItem ReadCardDocument(FirestoreDocument doc, VaultCipher cipher)
    {
        string decrypt(string value) => string.IsNullOrWhiteSpace(value) ? "" : cipher.DecryptValue(value);
'''+body+'\n    }\n\n';s=s.replace(needle,helper+needle);s=s.replace('        string decrypt(string value) => string.IsNullOrWhiteSpace(value) ? "" : cipher.DecryptValue(value);\n        var result = new List<CardItem>();','        var result = new List<CardItem>();');p.write_text(s)
p=Path('ZPass-Modern/verification/Program.cs');s=p.read_text();needle='        var coin = ZPassManager.Cloud.CryptoCurrencyCatalog.All.First();';s=s.replace(needle,'''        var cardDoc = new ZPassManager.Cloud.FirestoreDocument { Id = "android-card", Fields = new() { ["numberCipher"] = cipher.EncryptValue("4111111111111111"), ["cardholderCipher"] = cipher.EncryptValue("Fixture User"), ["expiryCipher"] = cipher.EncryptValue("12/30") } };
        var card = ZPassManager.Cloud.VaultRepository.ReadCardDocument(cardDoc,cipher);
        if(card.DocId!="android-card" || card.Number!="4111111111111111" || card.BankWebsite!="" || card.Cvv2!="")throw new Exception("Android card with missing optional fields failed to decrypt");
        cardDoc.Fields["cvvCipher"]=cipher.EncryptValue("123");
        if(ZPassManager.Cloud.VaultRepository.ReadCardDocument(cardDoc,cipher).Cvv!="123")throw new Exception("Card CVV decryption failed");
        Console.WriteLine("PASS: Android card ciphertext with missing website and optional fields loads in Windows");
'''+needle);p.write_text(s)
