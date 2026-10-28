from pathlib import Path
r=Path('C:/Users/rezan/source/repos/ZPassManager/ZPassManager')
(r/'Controls/RoundedSurface.cs').write_text('''using System.Windows;
using System.Windows.Media;
namespace ZPassManager.Controls;
public static class RoundedSurface
{
    public static readonly DependencyProperty RadiusProperty = DependencyProperty.RegisterAttached("Radius", typeof(double), typeof(RoundedSurface), new PropertyMetadata(0d, Changed));
    public static void SetRadius(DependencyObject obj, double value) => obj.SetValue(RadiusProperty, value);
    public static double GetRadius(DependencyObject obj) => (double)obj.GetValue(RadiusProperty);
    private static void Changed(DependencyObject obj, DependencyPropertyChangedEventArgs args)
    {
        if (obj is not FrameworkElement element) return;
        element.SizeChanged -= Resize;
        element.SizeChanged += Resize;
        Clip(element);
    }
    private static void Resize(object sender, SizeChangedEventArgs args) => Clip((FrameworkElement)sender);
    private static void Clip(FrameworkElement element) => element.Clip = new RectangleGeometry(new Rect(0, 0, System.Math.Max(0, element.ActualWidth), System.Math.Max(0, element.ActualHeight)), GetRadius(element), GetRadius(element));
}
''',encoding='utf-8')
p=r/'Styles/Theme.xaml'
s=p.read_text(encoding='utf-8').replace('xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">','xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" xmlns:controls="clr-namespace:ZPassManager.Controls">',1)
s=s.replace('<Style TargetType="DataGrid"><Setter','<Style TargetType="DataGrid"><Setter Property="controls:RoundedSurface.Radius" Value="16"/><Setter',1)
p.write_text(s,encoding='utf-8')
print('Rounded grid surfaces with resize-aware clipping')
