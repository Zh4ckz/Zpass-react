from pathlib import Path
r=Path('C:/Users/rezan/source/repos/ZPassManager/ZPassManager')
p=r/'Views/MainWindow.xaml'
s=p.read_text(encoding='utf-8').replace('MinWidth="360" MinHeight="420"','MinWidth="960" MinHeight="680"',1)
p.write_text(s,encoding='utf-8')
p=r/'Views/MainWindow.Responsive.cs'
s=p.read_text(encoding='utf-8')
s=s.replace('var contentWidth = Math.Max(0, ActualWidth - (rail ? 79 : 231));','var contentWidth = Math.Max(0, ActualWidth - (rail ? 79 : 231) - 58);')
s=s.replace('VaultPage.ColumnDefinitions[0].MinWidth = 0; VaultPage.ColumnDefinitions[2].MinWidth = 0;', 'VaultPage.ColumnDefinitions[0].MinWidth = vertical ? 0 : 360; VaultPage.ColumnDefinitions[2].MinWidth = vertical ? 0 : 400;\n            children[2].MinWidth = 400;')
p.write_text(s,encoding='utf-8')
p=r/'verification/Program.cs'
s=p.read_text(encoding='utf-8')
old='foreach(var size in new[] { new Size(480,640),new Size(640,720),new Size(944,600),new Size(1320,840),new Size(1920,1040) })'
new='''if(window.MinWidth != 960 || window.MinHeight != 680)throw new Exception("Desktop minimum size is not protected");
        window.Width=480;window.Height=420;window.UpdateLayout();
        if(window.ActualWidth < 960 || window.ActualHeight < 680)throw new Exception("Window shrank below its minimum size");
        Console.WriteLine("PASS: native window refuses resize below 960 x 680");
        foreach(var size in new[] { new Size(960,680),new Size(1024,720),new Size(1120,760),new Size(1320,840),new Size(1920,1040) })'''
assert old in s
s=s.replace(old,new)
needle='var visual=(FrameworkElement)window.Content;visual.Measure(size);visual.Arrange(new Rect(size));visual.UpdateLayout();'
replacement=needle+'''
            if(page=="Vault") {
                var vault=(Grid)window.FindName("VaultPage");
                var detail=vault.Children.OfType<FrameworkElement>().ElementAt(2);
                if(detail.ActualWidth<399)throw new Exception("Details panel collapsed below 400 pixels");
                if(vault.ColumnDefinitions[2].Width.Value>0 && vault.ColumnDefinitions[2].MinWidth<400)throw new Exception("Splitter can collapse detail column");
            }'''
assert needle in s
s=s.replace(needle,replacement)
p.write_text(s,encoding='utf-8')
print('Protected desktop minimum size and splitter widths; added regression checks')
