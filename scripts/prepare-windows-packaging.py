from pathlib import Path
r=Path('C:/Users/rezan/source/repos/ZPassManager')
p=r/'ZPassInstaller/ZPassInstaller.csproj'
s=p.read_text(encoding='utf-8')
if '<EnableCompressionInSingleFile>' not in s:
 s=s.replace('<PublishSingleFile>true</PublishSingleFile>', '<PublishSingleFile>true</PublishSingleFile>\n    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>\n    <SatelliteResourceLanguages>en-US</SatelliteResourceLanguages>',1)
p.write_text(s,encoding='utf-8')
p=r/'ZPassManager/AppxManifest.xml'
s=p.read_text(encoding='utf-8').replace('Name="Zh4ckz.ZPassManager"','Name="Zpass"').replace('Publisher="CN=Zh4ckz"','Publisher="CN=Zpass"').replace('<PublisherDisplayName>Zh4ckz</PublisherDisplayName>','<PublisherDisplayName>Zpass</PublisherDisplayName>')
p.write_text(s,encoding='utf-8')
p=r/'ZPassManager/ZPassManager.csproj'
s=p.read_text(encoding='utf-8').replace('<Company>Zh4ckz</Company>','<Company>Zpass</Company>')
p.write_text(s,encoding='utf-8')
p=r/'ZPassManager/Core/InstallationMaintenance.cs'
p.parent.mkdir(parents=True,exist_ok=True)
p.write_text('''using System.IO;
using System.Security.Cryptography;
namespace ZPassManager.Core;
public static class InstallationMaintenance
{
    public static string GetInstallationId(string directory)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, "installation-id.txt");
        for (var attempt = 0; attempt < 3; attempt++) {
            if (File.Exists(path)) {
                var saved = File.ReadAllText(path).Trim();
                if (saved.Length == 15 && saved.All(c => char.IsAsciiLetterOrDigit(c))) return saved;
                throw new InvalidDataException("Invalid installation identifier.");
            }
            const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            var id = new string(Enumerable.Range(0, 15).Select(_ => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)]).ToArray());
            try {
                using var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                using var writer = new StreamWriter(output); writer.Write(id); return id;
            } catch (IOException) { Thread.Sleep(20); }
        }
        throw new IOException("Unable to save installation identifier.");
    }

    public static void Initialize()
    {
        try { GetInstallationId(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ZPass", "Installation")); } catch { }
        // Only our obsolete uninstall helpers, never other Windows/user temporary files.
        foreach (var path in Directory.EnumerateFiles(Path.GetTempPath(), "ZPass-Uninstall-*.exe", SearchOption.TopDirectoryOnly)) {
            var name = Path.GetFileNameWithoutExtension(path);
            if (!Guid.TryParseExact(name["ZPass-Uninstall-".Length..], "N", out _)) continue;
            try {
                if ((File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0) continue;
                if (File.GetLastWriteTimeUtc(path) < DateTime.UtcNow.AddDays(-7)) File.Delete(path);
            } catch (IOException) { } catch (UnauthorizedAccessException) { }
        }
    }
}
''',encoding='utf-8')
p=r/'ZPassManager/App.xaml.cs'
s=p.read_text(encoding='utf-8').replace('        base.OnStartup(e);','        base.OnStartup(e);\n        try { Core.InstallationMaintenance.Initialize(); } catch { }',1)
p.write_text(s,encoding='utf-8')
print('Enabled setup compression; prepared Zpass MSIX identity, stable 15-character installation ID and scoped obsolete-temp cleanup')
