from pathlib import Path
p=Path('ZPass-Modern/Views/MainWindow.Responsive.cs');s=p.read_text();s=s.replace('        Loaded += (_, _) => UpdateResponsiveLayout();','''        CardsGrid.SizeChanged += (_, _) => { var panel = Descendants<WrapPanel>(CardsGrid).FirstOrDefault(); if (panel is not null) panel.ItemWidth = Math.Min(368, Math.Max(160, CardsGrid.ActualWidth - 20)); };
        Loaded += (_, _) => UpdateResponsiveLayout();''');p.write_text(s)
p=Path('ZPass-Modern/Cloud/LoginApprovalClient.cs');s=p.read_text(encoding='utf-8');s=s.replace('        var codes = DistinctCodes(3);\n        await firestore.SetDocumentAsync', '''        var codes = DistinctCodes(3);
        var region = "Location unavailable";
        try { region = System.Globalization.RegionInfo.CurrentRegion.DisplayName + " (device region)"; } catch (System.Globalization.CultureNotFoundException) { }
        await firestore.SetDocumentAsync''',1).replace('["locationLabel"] = System.Globalization.RegionInfo.CurrentRegion.DisplayName + " (device region)",','["locationLabel"] = region,');s=s.replace('/// the request doc itself, so a Firestore rules misconfiguration would leak ciphertext, not the\n/// secret.','/// the request doc itself. Strict owner-only Firestore rules are therefore essential.');p.write_text(s,encoding='utf-8')
