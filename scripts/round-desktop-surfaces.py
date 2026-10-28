from pathlib import Path

root = Path(r'C:/Users/rezan/source/repos/ZPassManager/ZPassManager')
p = root / 'Styles/Theme.xaml'
s = p.read_text(encoding='utf-8-sig')
s = s.replace('CornerRadius="24"', 'CornerRadius="12"')
s = s.replace('<Setter Property="CornerRadius" Value="14"/>', '<Setter Property="CornerRadius" Value="20"/>')
s = s.replace('<Border x:Name="Bd" Padding=', '<Border x:Name="Bd" CornerRadius="10" Padding=')
s = s.replace('<Setter Property="Background" Value="#253B57"/><Setter Property="Foreground" Value="#F3F5F8"/><Setter Property="BorderBrush" Value="Transparent"/>', '<Setter Property="Background" Value="Transparent"/><Setter Property="Foreground" Value="#F3F5F8"/><Setter Property="BorderBrush" Value="Transparent"/>')
start = s.index('    <Style TargetType="DataGridRow">')
end = s.index('</Style>', start) + len('</Style>')
s = s[:start] + '''    <Style TargetType="DataGridRow">
      <Setter Property="Background" Value="#181D24"/><Setter Property="Foreground" Value="#F3F5F8"/>
      <Setter Property="Margin" Value="4,2"/><Setter Property="BorderThickness" Value="0"/>
      <Setter Property="Template"><Setter.Value><ControlTemplate TargetType="DataGridRow">
        <Border x:Name="RowSurface" Background="{TemplateBinding Background}" CornerRadius="12" Padding="4,0">
          <DataGridCellsPresenter ItemsPanel="{TemplateBinding ItemsPanel}" SnapsToDevicePixels="True"/>
        </Border>
        <ControlTemplate.Triggers>
          <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="RowSurface" Property="Background" Value="#202B39"/></Trigger>
          <Trigger Property="IsSelected" Value="True"><Setter TargetName="RowSurface" Property="Background" Value="#253B57"/></Trigger>
          <Trigger Property="IsKeyboardFocusWithin" Value="True"><Setter TargetName="RowSurface" Property="BorderBrush" Value="#58A6FF"/><Setter TargetName="RowSurface" Property="BorderThickness" Value="1"/></Trigger>
        </ControlTemplate.Triggers>
      </ControlTemplate></Setter.Value></Setter>
    </Style>''' + s[end:]
p.write_text(s, encoding='utf-8')
p = root / 'Views/MainWindow.xaml'
s = p.read_text(encoding='utf-8-sig').replace('CornerRadius="0" UseAeroCaptionButtons', 'CornerRadius="20" UseAeroCaptionButtons')
s = s.replace('<Border x:Name="Surface" Background="{TemplateBinding Background}">', '<Border x:Name="Surface" CornerRadius="8" Margin="3" Background="{TemplateBinding Background}">')
s = s.replace(' <DockPanel LastChildFill="True">', ' <Border x:Name="WindowSurface" CornerRadius="20" Padding="4" Background="#11151B" BorderBrush="#303946" BorderThickness="1">\n <DockPanel x:Name="WindowContent" LastChildFill="True">', 1)
s = s.replace(' </DockPanel>\n</Window>', ' </DockPanel>\n </Border>\n</Window>')
p.write_text(s, encoding='utf-8')
p = root / 'Views/MainWindow.xaml.cs'
s = p.read_text(encoding='utf-8-sig')
s = s.replace('        InitializeComponent();', '''        InitializeComponent();
        WindowContent.SizeChanged += (_, _) => UpdateWindowCorners();
        StateChanged += (_, _) => UpdateWindowCorners();
        SourceInitialized += (_, _) => {
            try {
                var preference = 2;
                DwmSetWindowAttribute(new System.Windows.Interop.WindowInteropHelper(this).Handle, 33, ref preference, sizeof(int));
            } catch (DllNotFoundException) { } catch (EntryPointNotFoundException) { }
            UpdateWindowCorners();
        };''', 1)
pos = s.index('    private void SettingsLanguagePicker_Loaded')
s = s[:pos] + '''    [System.Runtime.InteropServices.DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    private void UpdateWindowCorners()
    {
        var maximized = WindowState == WindowState.Maximized;
        WindowSurface.CornerRadius = new CornerRadius(maximized ? 0 : 20);
        WindowSurface.Padding = new Thickness(maximized ? 0 : 4);
        // Content inset includes the one-pixel frame: 20 - 4 - 1 = 15.
        var radius = maximized ? 0 : 15;
        WindowContent.Clip = new RectangleGeometry(new Rect(0, 0, Math.Max(0, WindowContent.ActualWidth), Math.Max(0, WindowContent.ActualHeight)), radius, radius);
    }

''' + s[pos:]
p.write_text(s, encoding='utf-8')
print('Updated desktop frame, rows, cards, tabs and add buttons')
