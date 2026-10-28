from pathlib import Path
import json
r=Path('C:/Users/rezan/source/repos/ZPassManager/ZPassManager')
p=r/'Styles/Theme.xaml'
s=p.read_text(encoding='utf-8')
style='''
    <Style x:Key="WebsiteLinkButton" TargetType="Button">
      <Setter Property="Background" Value="Transparent"/><Setter Property="Foreground" Value="#58A6FF"/>
      <Setter Property="BorderThickness" Value="0"/><Setter Property="Padding" Value="0"/><Setter Property="Cursor" Value="Hand"/>
      <Setter Property="HorizontalAlignment" Value="Left"/>
      <Setter Property="Template"><Setter.Value><ControlTemplate TargetType="Button">
        <Border x:Name="LinkSurface" Background="Transparent" CornerRadius="6" BorderBrush="Transparent" BorderThickness="1" Padding="2">
          <ContentPresenter HorizontalAlignment="Left" VerticalAlignment="Center"/>
        </Border>
        <ControlTemplate.Triggers>
          <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="LinkSurface" Property="Background" Value="#202F42"/></Trigger>
          <Trigger Property="IsKeyboardFocused" Value="True"><Setter TargetName="LinkSurface" Property="BorderBrush" Value="#58A6FF"/></Trigger>
          <Trigger Property="IsPressed" Value="True"><Setter TargetName="LinkSurface" Property="Background" Value="#253B57"/></Trigger>
        </ControlTemplate.Triggers>
      </ControlTemplate></Setter.Value></Setter>
    </Style>
'''
s=s.replace('</ResourceDictionary>',style+'</ResourceDictionary>')
p.write_text(s,encoding='utf-8')
p=r/'Views/MainWindow.xaml'
s=p.read_text(encoding='utf-8')
s=s.replace('<Button Background="Transparent" BorderThickness="0" Padding="0" HorizontalAlignment="Left" Cursor="Hand" ToolTip="{DynamicResource Loc.345173567BC61C248D0F2BACFCE42126F34081A570474B698710C1C3F4877EFC}" Click="OpenDetailWebsite_Click">','<Button Style="{StaticResource WebsiteLinkButton}" ToolTip="{DynamicResource Loc.345173567BC61C248D0F2BACFCE42126F34081A570474B698710C1C3F4877EFC}" Click="OpenDetailWebsite_Click">')
p.write_text(s,encoding='utf-8')
p=r/'Controls/ConfirmOverlay.xaml.cs'
s=p.read_text(encoding='utf-8').replace('bool destructive = false)','bool destructive = false, string? acceptLabel = null, string? cancelLabel = null)',1)
s=s.replace('        TitleText.Text = title;', '''        if (acceptLabel is null) YesButton.SetResourceReference(ContentControl.ContentProperty, "Loc.85A39AB345D672FF8CA9B9C6876F3ADCACF45EE7C1E2DBD2408FD338BD55E07E");
        else YesButton.Content = acceptLabel;
        if (cancelLabel is null) NoButton.SetResourceReference(ContentControl.ContentProperty, "Loc.1EA442A134B2A184BD5D40104401F2A37FBC09CCF3F4BC9DA161C6099BE3691D");
        else NoButton.Content = cancelLabel;
        TitleText.Text = title;''',1)
p.write_text(s,encoding='utf-8')
p=r/'Views/MainWindow.xaml.cs'
s=p.read_text(encoding='utf-8')
old='        Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });'
new='''        if (!string.IsNullOrEmpty(uri.UserInfo)) return;
        if (!Confirm.Confirm(Core.LocalizationService.Format("This link opens outside Z Pass in your browser. Do you want to continue?\\n\\n{0}", uri.AbsoluteUri),
            Core.LocalizationService.Get("Open website"), acceptLabel: Core.LocalizationService.Get("Open website"), cancelLabel: Core.LocalizationService.Get("Cancel"))) return;
        try { Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true }); }
        catch { Confirm.Alert(Core.LocalizationService.Get("Unable to open the website. Please try again."), Core.LocalizationService.Get("Open website"), isError: true); }'''
assert old in s
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
translations={
'en-US': ('This link opens outside Z Pass in your browser. Do you want to continue?', 'Unable to open the website. Please try again.'),
'tr-TR': ('Bu bağlantı Z Pass dışında tarayıcınızda açılacak. Devam etmek istiyor musunuz?', 'Web sitesi açılamadı. Lütfen tekrar deneyin.'),
'de-DE': ('Dieser Link wird außerhalb von Z Pass in Ihrem Browser geöffnet. Möchten Sie fortfahren?', 'Die Website konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.'),
'fr-FR': ('Ce lien s’ouvrira dans votre navigateur, en dehors de Z Pass. Voulez-vous continuer ?', 'Impossible d’ouvrir le site. Veuillez réessayer.'),
'es-ES': ('Este enlace se abrirá en tu navegador, fuera de Z Pass. ¿Quieres continuar?', 'No se pudo abrir el sitio web. Inténtalo de nuevo.'),
'it-IT': ('Questo link si aprirà nel browser, fuori da Z Pass. Vuoi continuare?', 'Impossibile aprire il sito web. Riprova.'),
'pt-BR': ('Este link será aberto no seu navegador, fora do Z Pass. Deseja continuar?', 'Não foi possível abrir o site. Tente novamente.'),
'id-ID': ('Tautan ini akan dibuka di browser Anda, di luar Z Pass. Ingin melanjutkan?', 'Situs web tidak dapat dibuka. Silakan coba lagi.'),
'ar-AR': ('سيفتح هذا الرابط في متصفحك خارج Z Pass. هل تريد المتابعة؟', 'تعذر فتح الموقع. يرجى المحاولة مرة أخرى.'),
'hi-IN': ('यह लिंक Z Pass के बाहर आपके ब्राउज़र में खुलेगा। क्या आप जारी रखना चाहते हैं?', 'वेबसाइट नहीं खुल सकी। कृपया फिर से प्रयास करें।'),
'ja-JP': ('このリンクは Z Pass の外部のブラウザーで開きます。続行しますか？', 'ウェブサイトを開けませんでした。もう一度お試しください。'),
'ko-KR': ('이 링크는 Z Pass 외부의 브라우저에서 열립니다. 계속하시겠습니까?', '웹사이트를 열 수 없습니다. 다시 시도해 주세요.'),
'ku-KU': ('Ev girêdan dê li derveyî Z Pass di geroka te de vebe. Tu dixwazî bidomînî?', 'Malper nehat vekirin. Ji kerema xwe dîsa biceribîne.')}
key=translations['en-US'][0]+'\n\n{0}'
error=translations['en-US'][1]
for locale,(message,failure) in translations.items():
 p=r/'resources/assets/lang/json'/f'{locale}.json'
 data=json.loads(p.read_text(encoding='utf-8-sig'));data[key]=message+'\n\n{0}';data[error]=failure
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Added browser confirmation, dark link hover and 13 translations')
