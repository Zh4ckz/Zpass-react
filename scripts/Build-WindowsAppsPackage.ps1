param([string]$Publisher='CN=Zpass', [string]$BaseUrl='https://zpass.web.app/apps')
$ErrorActionPreference='Stop'
$repo='C:\Users\rezan\source\repos\ZPassManager'
$source=Join-Path $repo 'artifacts\Windows'
$output=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\public\apps'))
$stage=Join-Path $repo ('artifacts\msix-stage-'+[Guid]::NewGuid().ToString('N'))
$sdk=Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin\10.0.26100.0\x64'
if(!(Test-Path -LiteralPath (Join-Path $source 'Z Pass.exe'))){throw 'Publish the current desktop app first'}
New-Item -ItemType Directory -Path $stage -Force | Out-Null
foreach($file in Get-ChildItem -LiteralPath $source -Recurse -File){
    if($file.Name -eq 'oauth-config.json' -or $file.Extension -eq '.pdb'){continue}
    $relative=$file.FullName.Substring($source.TrimEnd('\').Length+1)
    $target=Join-Path $stage $relative
    New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $target
}
[xml]$manifest=Get-Content (Join-Path $repo 'ZPassManager\AppxManifest.xml') -Raw
$manifest.Package.Identity.Publisher=$Publisher
$version=$manifest.Package.Identity.Version
$manifest.Save((Join-Path $stage 'AppxManifest.xml'))
& (Join-Path $sdk 'makepri.exe') new /pr $stage /cf (Join-Path $repo 'ZPassManager\priconfig.xml') /of (Join-Path $stage 'resources.pri') /in 'Zpass' /o *> (Join-Path $repo 'artifacts\msix-makepri.log')
if($LASTEXITCODE -ne 0){throw 'PRI generation failed'}
$package=Join-Path $output "Zpass-$version-x64.msix"
& (Join-Path $sdk 'makeappx.exe') pack /d $stage /p $package /o *> (Join-Path $repo 'artifacts\msix-makeappx.log')
if($LASTEXITCODE -ne 0){throw 'MSIX validation failed'}
$escapePublisher=[Security.SecurityElement]::Escape($Publisher)
$url=$BaseUrl.TrimEnd('/')
@"
<?xml version="1.0" encoding="utf-8"?>
<AppInstaller xmlns="http://schemas.microsoft.com/appx/appinstaller/2018" Uri="$url/Zpass.appinstaller" Version="$version">
  <MainPackage Name="Zpass" Publisher="$escapePublisher" Version="$version" ProcessorArchitecture="x64" Uri="$url/Zpass-$version-x64.msix" />
  <UpdateSettings>
    <OnLaunch HoursBetweenUpdateChecks="0" ShowPrompt="true" UpdateBlocksActivation="false" />
    <AutomaticBackgroundTask />
  </UpdateSettings>
</AppInstaller>
"@ | Set-Content -LiteralPath (Join-Path $output 'Zpass.appinstaller') -Encoding utf8
Write-Output "UNSIGNED package: $package"
Write-Output 'Signing and HTTPS publication are required before installing or updating. No certificate has been trusted and nothing has been deployed.'
$stagePath=[IO.Path]::GetFullPath($stage)
$artifactRoot=[IO.Path]::GetFullPath((Join-Path $repo 'artifacts')).TrimEnd('\')+'\'
if(!$stagePath.StartsWith($artifactRoot,[StringComparison]::OrdinalIgnoreCase) -or (Split-Path $stagePath -Leaf) -notmatch '^msix-stage-[a-f0-9]{32}$'){throw 'Refusing to remove an unexpected staging path'}
Remove-Item -LiteralPath $stagePath -Recurse -Force
