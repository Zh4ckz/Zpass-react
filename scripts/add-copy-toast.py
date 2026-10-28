from pathlib import Path
import json
r=Path('C:/Users/rezan/source/repos/ZPassManager/ZPassManager')
p=r/'Views/MainWindow.xaml'
s=p.read_text(encoding='utf-8')
needle='  <controls:ConfirmOverlay x:Name="Confirm" Grid.Column="0" Grid.ColumnSpan="3"/>'
replacement='''  <Border x:Name="CopyToast" Grid.ColumnSpan="3" Panel.ZIndex="10" HorizontalAlignment="Center" VerticalAlignment="Bottom" Margin="16,0,16,24"
          Visibility="Collapsed" Opacity="0" IsHitTestVisible="False" Background="#192A25" BorderBrush="#365E4C" BorderThickness="1" CornerRadius="12" Padding="18,12">
    <StackPanel Orientation="Horizontal">
      <Grid Width="23" Height="23" Margin="0,0,10,0">
        <Ellipse Stroke="#6EE7AB" StrokeThickness="1.7"/>
        <Path Data="M 6 11 L 10 15 L 17 8" Stroke="#6EE7AB" StrokeThickness="2" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>
      </Grid>
      <TextBlock x:Name="CopyToastText" FontWeight="Bold" FontSize="14" Foreground="#F3F5F8" VerticalAlignment="Center"/>
    </StackPanel>
  </Border>
  <controls:ConfirmOverlay x:Name="Confirm" Grid.Column="0" Grid.ColumnSpan="3" Panel.ZIndex="20"/>'''
assert needle in s
p.write_text(s.replace(needle,replacement,1),encoding='utf-8')
p=r/'Views/MainWindow.CopyFeedback.cs'
p.write_text('''using System.Windows;
using System.Windows.Media.Animation;
using System.Windows.Threading;
namespace ZPassManager.Views;
public partial class MainWindow
{
    private readonly DispatcherTimer _copyToastTimer = new() { Interval = TimeSpan.FromSeconds(2) };
    private int _copyToastGeneration;

    private void InstallCopyFeedback()
    {
        _copyToastTimer.Tick += (_, _) => {
            _copyToastTimer.Stop();
            var generation = _copyToastGeneration;
            var fade = new DoubleAnimation(0, TimeSpan.FromMilliseconds(160));
            fade.Completed += (_, _) => { if (generation == _copyToastGeneration) CopyToast.Visibility = Visibility.Collapsed; };
            CopyToast.BeginAnimation(UIElement.OpacityProperty, fade);
        };
        Closed += (_, _) => { _copyToastTimer.Stop(); _copyToastGeneration++; };
    }

    private void ShowCopiedToast()
    {
        _copyToastGeneration++;
        _copyToastTimer.Stop();
        CopyToastText.Text = Core.LocalizationService.Get("Copied!");
        CopyToast.Visibility = Visibility.Visible;
        CopyToast.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(1, TimeSpan.FromMilliseconds(140)));
        _copyToastTimer.Start();
    }

    private void CopyWithFeedback(string text)
    {
        if (string.IsNullOrEmpty(text)) return;
        try { Clipboard.SetText(text); ShowCopiedToast(); }
        catch (System.Runtime.InteropServices.COMException) {
            Confirm.Alert(Core.LocalizationService.Get("Could not copy. Please try again."), "Z Pass", isError: true);
        }
    }
}
''',encoding='utf-8')
for name in ['MainWindow.xaml.cs','MainWindow.Settings.cs']:
 p=r/'Views'/name
 s=p.read_text(encoding='utf-8').replace('Clipboard.SetText(', 'CopyWithFeedback(')
 if name=='MainWindow.xaml.cs':s=s.replace('        InitializeComponent();','        InitializeComponent();\n        InstallCopyFeedback();',1)
 p.write_text(s,encoding='utf-8')
translations={
'en-US':('Copied!','Could not copy. Please try again.'),
'tr-TR':('Kopyalandı!','Kopyalanamadı. Lütfen tekrar deneyin.'),
'de-DE':('Kopiert!','Kopieren fehlgeschlagen. Bitte versuchen Sie es erneut.'),
'fr-FR':('Copié !','Impossible de copier. Veuillez réessayer.'),
'es-ES':('¡Copiado!','No se pudo copiar. Inténtalo de nuevo.'),
'it-IT':('Copiato!','Impossibile copiare. Riprova.'),
'pt-BR':('Copiado!','Não foi possível copiar. Tente novamente.'),
'id-ID':('Disalin!','Tidak dapat menyalin. Silakan coba lagi.'),
'ar-AR':('تم النسخ!','تعذر النسخ. يرجى المحاولة مرة أخرى.'),
'hi-IN':('कॉपी हो गया!','कॉपी नहीं हो सका। कृपया फिर से प्रयास करें।'),
'ja-JP':('コピーしました！','コピーできませんでした。もう一度お試しください。'),
'ko-KR':('복사됨!','복사할 수 없습니다. 다시 시도해 주세요.'),
'ku-KU':('Hat kopîkirin!','Nehat kopîkirin. Ji kerema xwe dîsa biceribîne.')}
for locale,(copied,error) in translations.items():
 p=r/'resources/assets/lang/json'/f'{locale}.json'
 d=json.loads(p.read_text(encoding='utf-8'));d['Copied!']=copied;d['Could not copy. Please try again.']=error
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Added bottom-centered copy toast and connected desktop copy actions')
