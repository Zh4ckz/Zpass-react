from pathlib import Path
p=Path('ZPass-Modern/Views/MainWindow.Responsive.cs');s=p.read_text();s=s.replace('sidebar.Padding = new Thickness(rail ? 6 : 18, 14, rail ? 6 : 18, 14);','''sidebar.Padding = new Thickness(0);
            if (sidebar.Child is Grid navigation) navigation.Margin = rail ? new Thickness(6, 14, 6, 12) : new Thickness(18, 20, 18, 16);
            AccountCard.Padding = new Thickness(rail ? 2 : 10);
            foreach (var button in Descendants<Button>(sidebar))
                if (button.Style == (Style)FindResource("NavButton")) button.Padding = rail ? new Thickness(8, 12, 8, 12) : new Thickness(14, 12, 14, 12);''');p.write_text(s)
p=Path('ZPass-Modern/Cloud/VaultRepository.cs');s=p.read_text();s=s.replace('firestore.DeleteDocumentAsync($"{VaultPath}/portableCards/{docId}", ct);','firestore.MergeDocumentAsync($"{VaultPath}/portableCards/{docId}", new Dictionary<string, object?> { ["deleted"] = true, ["updatedAt"] = DateTimeOffset.UtcNow }, ct);');s=s.replace('        await firestore.DeleteDocumentAsync(sourcePath, ct);','''        if (kind == "card") await firestore.MergeDocumentAsync(sourcePath, new Dictionary<string, object?> { ["deleted"] = true, ["updatedAt"] = DateTimeOffset.UtcNow }, ct);
        else await firestore.DeleteDocumentAsync(sourcePath, ct);''');s=s.replace('["numberCipher"] = encrypt(card.Number),','["deleted"] = false,\n            ["numberCipher"] = encrypt(card.Number),');p.write_text(s)
p=Path('ZPass-Modern/verification/Program.cs');s=p.read_text();s=s.replace('        window.Show();\n        var passwords=', '''        window.Show();
        var personal = (System.Collections.IDictionary)typeof(ZPassManager.Views.MainWindow).GetField("_personalFields",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic)!.GetValue(window)!;
        if(personal.Count!=11)throw new Exception("Personal information fields were not installed");
        Console.WriteLine("PASS: all 11 personal information fields installed");
        var passwords=''');s=s.replace('at 3 window sizes','at 5 window sizes').replace('at 3 sizes','at 5 sizes');p.write_text(s)
