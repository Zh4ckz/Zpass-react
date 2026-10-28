from pathlib import Path
p=Path('ZPass-Modern/Cloud/LoginApprovalClient.cs');s=p.read_text(encoding='utf-8');s=s.replace('System.Globalization.RegionInfo.CurrentRegion.DisplayName + " (device region)"','System.Globalization.RegionInfo.CurrentRegion.DisplayName');s=s.replace('["locationLabel"] = region,','["locationLabel"] = region, ["locationKind"] = region == "Location unavailable" ? "unavailable" : "device-region",');s=s.replace('            ["uid"] = uid,\n            ["deviceLabel"] = deviceLabel,','            ["uid"] = uid, ["purpose"] = "LOGIN",\n            ["locationLabel"] = DeviceRegion(), ["locationKind"] = "device-region",\n            ["deviceLabel"] = deviceLabel,')
s=s.replace('                if (doc?.GetString("purpose") != "CARD_VIEW") return false;','                if (doc?.GetString("purpose") != "CARD_VIEW") return false;\n                deadline = EffectiveDeadline(doc, deadline);\n                if (DateTimeOffset.UtcNow >= deadline) return false;')
s=s.replace('                switch (doc?.GetString("status"))','                if (doc is null) return new LoginApprovalOutcome(LoginApprovalStatus.TimedOut, null);\n                deadline = EffectiveDeadline(doc, deadline);\n                if (DateTimeOffset.UtcNow >= deadline) return new LoginApprovalOutcome(LoginApprovalStatus.TimedOut, null);\n                switch (doc.GetString("status"))')
s=s.replace('    private static string[] DistinctCodes(int count)','''    private static string DeviceRegion()
    {
        try { return System.Globalization.RegionInfo.CurrentRegion.DisplayName; }
        catch (System.Globalization.CultureNotFoundException) { return ""; }
    }
    private static DateTimeOffset EffectiveDeadline(FirestoreDocument doc, DateTimeOffset deadline)
    {
        if (DateTimeOffset.TryParse(doc.GetString("createdAt"), out var created) && created.AddSeconds(60) < deadline) deadline = created.AddSeconds(60);
        if (DateTimeOffset.TryParse(doc.GetString("expiresAt"), out var expires) && expires < deadline) deadline = expires;
        return deadline;
    }
    private static string[] DistinctCodes(int count)''');p.write_text(s,encoding='utf-8')
p=Path('ZPass-Modern/Views/ApprovalWaitWindow.xaml');s=p.read_text(encoding='utf-8');s=s.replace('<TextBlock Style="{StaticResource Muted}" HorizontalAlignment="Center" TextWrapping="Wrap"','<TextBlock x:Name="ApprovalInstruction" Style="{StaticResource Muted}" HorizontalAlignment="Center" TextWrapping="Wrap"');s=s.replace('Open Z Pass on your phone. When it shows this number, tap it to approve this sign-in.','');s=s.replace('Click="UseRecoveryPassword_Click"','Visibility="Collapsed" Click="UseRecoveryPassword_Click"');p.write_text(s,encoding='utf-8')
p=Path('ZPass-Modern/Views/ApprovalWaitWindow.xaml.cs');s=p.read_text(encoding='utf-8');s=s.replace('    private CancellationTokenSource? _pollCts;','    private CancellationTokenSource? _pollCts;\n    private readonly System.Windows.Threading.DispatcherTimer _countdown = new() { Interval = TimeSpan.FromMilliseconds(250) };\n    private DateTimeOffset _codeDeadline;');s=s.replace('        InitializeComponent();','''        InitializeComponent();
        ApprovalInstruction.Text = Core.LocalizationService.Get("Confirm this code in Z Pass on your phone.");
        RetryButton.Content = Core.LocalizationService.Get("Request a new code");
        _countdown.Tick += (_, _) => {
            var remaining = Math.Max(0, (int)Math.Ceiling((_codeDeadline - DateTimeOffset.UtcNow).TotalSeconds));
            StatusText.Text = Core.LocalizationService.Format("Expires in {0}s", remaining);
            if (remaining == 0) { _countdown.Stop(); CodeText.Text = "--"; }
        };''');s=s.replace('Closed += (_, _) => _pollCts?.Cancel();','Closed += (_, _) => { _pollCts?.Cancel(); _countdown.Stop(); };');s=s.replace('        RetryButton.Visibility = Visibility.Collapsed;','        _countdown.Stop();\n        RetryButton.Visibility = Visibility.Collapsed;',1);s=s.replace('            CodeText.Text = displayCode;','            CodeText.Text = displayCode;\n            _codeDeadline = DateTimeOffset.UtcNow.AddSeconds(60); _countdown.Start();');s=s.replace('            switch (outcome.Status)','            _countdown.Stop();\n            switch (outcome.Status)');s=s.replace('        StatusText.Text = "";','        _countdown.Stop(); CodeText.Text = "--";\n        StatusText.Text = "";');p.write_text(s,encoding='utf-8')
p=Path('ZPass-Modern/Views/MainWindow.CardAccess.cs');s=p.read_text(encoding='utf-8');s=s.replace('        Window? prompt = null;','        Window? prompt = null;\n        System.Windows.Threading.DispatcherTimer? countdown = null;');s=s.replace('Select this number on your phone, then confirm with your device PIN or biometrics.','Confirm this code in Z Pass on your phone.');s=s.replace('            content.Children.Add(new TextBlock { Text = Core.LocalizationService.Get("Keep Z Pass open on your phone. This request expires in 60 seconds."), TextWrapping = TextWrapping.Wrap, FontSize = 12 });','''            var lifetime = new TextBlock { Text = Core.LocalizationService.Get("This code expires in 60 seconds."), TextWrapping = TextWrapping.Wrap, FontSize = 12 };
            content.Children.Add(lifetime);
            var deadline = DateTimeOffset.UtcNow.AddSeconds(60);
            countdown = new() { Interval = TimeSpan.FromMilliseconds(250) };
            countdown.Tick += (_, _) => lifetime.Text = Core.LocalizationService.Format("Expires in {0}s", Math.Max(0,(int)Math.Ceiling((deadline-DateTimeOffset.UtcNow).TotalSeconds)));
            countdown.Start();''');s=s.replace('finally { cancel.Cancel(); _cardAuthBusy = false; }','finally { countdown?.Stop(); cancel.Cancel(); _cardAuthBusy = false; }');p.write_text(s,encoding='utf-8')
