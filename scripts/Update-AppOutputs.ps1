param(
    [Parameter(Mandatory=$true)][ValidateSet('Android','Windows')][string]$Platform,
    [Parameter(Mandatory=$true)][string]$Source,
    [string]$WebsiteRoot='',
    [string]$VersionConfig,
    [int]$VersionCode=0,
    [string]$VersionName,
    [switch]$Deploy
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($WebsiteRoot)) { $WebsiteRoot = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..' }
if ($VersionConfig) { $VersionConfig = [IO.Path]::GetFullPath($VersionConfig) }
$WebsiteRoot = [IO.Path]::GetFullPath($WebsiteRoot)
$destination = Join-Path $WebsiteRoot 'artifacts\releases'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$name = if ($Platform -eq 'Android') { 'ZPass-Android.apk' } else { 'ZPass-Setup.exe' }
$output = Join-Path $destination $name
$stage = Join-Path $destination ('.' + [Guid]::NewGuid().ToString('N') + '.tmp')
$previous = $stage + '.old'

function Set-JsonProperty($Object, [string]$Name, $Value) {
    if ($Object.PSObject.Properties[$Name]) {
        $Object.$Name = $Value
    } else {
        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    }
}

function Write-JsonAtomic([string]$Path, $Value) {
    $temporary = Join-Path (Split-Path -Parent $Path) ('.' + [Guid]::NewGuid().ToString('N') + '.tmp')
    $backup = $temporary + '.old'
    try {
        $json = ConvertTo-Json -InputObject $Value -Depth 30
        [IO.File]::WriteAllText($temporary, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
        if (Test-Path -LiteralPath $Path) {
            [IO.File]::Replace($temporary, $Path, $backup)
        } else {
            [IO.File]::Move($temporary, $Path)
        }
    } finally {
        if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
        if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
    }
}

try {
    if ($Platform -eq 'Android') {
        if (!(Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw 'APK source missing' }
        if ($VersionCode -le 0 -or [string]::IsNullOrWhiteSpace($VersionName)) {
            throw 'Android VersionCode and VersionName are required'
        }
        if ([string]::IsNullOrWhiteSpace($VersionConfig) -or !(Test-Path -LiteralPath $VersionConfig -PathType Leaf)) {
            throw 'Android version configuration template missing'
        }
        if ($Deploy -and $sourcePath.Contains('unsigned')) { throw 'An unsigned APK cannot be deployed' }
        Copy-Item -LiteralPath $sourcePath -Destination $stage
    } else {
        if ($Deploy) { throw 'Hosting deployment is supported only for Android releases' }
        if (!(Test-Path -LiteralPath (Join-Path $sourcePath 'Z Pass.exe')) -or !(Test-Path -LiteralPath (Join-Path $sourcePath 'resources'))) {
            throw 'Complete Windows publish folder required'
        }
        $repo = 'C:\Users\rezan\source\repos\ZPassManager'
        $payload = Join-Path $repo 'installer\assets\zpass-payload.zip'
        New-Item -ItemType Directory -Path (Split-Path $payload) -Force | Out-Null
        Add-Type -AssemblyName System.IO.Compression
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zipStage = $payload + '.new'
        if (Test-Path -LiteralPath $zipStage) { Remove-Item -LiteralPath $zipStage -Force }
        $archive = [IO.Compression.ZipFile]::Open($zipStage, [IO.Compression.ZipArchiveMode]::Create)
        try {
            foreach ($file in Get-ChildItem -LiteralPath $sourcePath -File -Recurse) {
                if ($file.Name -eq 'oauth-config.json' -or $file.Extension -eq '.pdb') { continue }
                $relative = $file.FullName.Substring($sourcePath.TrimEnd('\\').Length + 1).Replace('\\', '/')
                [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relative, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
            }
        } finally { $archive.Dispose() }
        Move-Item -LiteralPath $zipStage -Destination $payload -Force
        $installerOutput = Join-Path $repo 'artifacts\Installer'
        dotnet publish (Join-Path $repo 'ZPassInstaller\ZPassInstaller.csproj') -c Release -r win-x64 -p:NuGetAudit=false -o $installerOutput
        if ($LASTEXITCODE -ne 0) { throw 'Installer build failed; previous download retained' }
        Copy-Item -LiteralPath (Join-Path $installerOutput 'ZPass-Installer.exe') -Destination $stage
    }

    if ((Get-Item -LiteralPath $stage).Length -le 0) { throw 'Empty build output' }
    if (Test-Path -LiteralPath $output) { [IO.File]::Replace($stage, $output, $previous) } else { [IO.File]::Move($stage, $output) }
    $oldNames = if ($Platform -eq 'Android') { @() } else { @('ZPass-Windows.zip') }
    foreach ($oldName in $oldNames) {
        $old = Join-Path $destination $oldName
        if ($old -ne $output -and (Test-Path -LiteralPath $old)) { Remove-Item -LiteralPath $old -Force }
    }
    Write-Output "Updated local download: $output"

    if ($Platform -eq 'Android') {
        $downloadUrl = ''
        $versionMetadata = Get-Content -LiteralPath $VersionConfig -Raw | ConvertFrom-Json
        Set-JsonProperty $versionMetadata 'latestVersionCode' $VersionCode
        Set-JsonProperty $versionMetadata 'latestVersionName' $VersionName
        Set-JsonProperty $versionMetadata 'updateUrl' $downloadUrl
        Set-JsonProperty $versionMetadata 'forceUpdate' $false
        Write-JsonAtomic $VersionConfig $versionMetadata

        $apiDirectory = Join-Path $WebsiteRoot 'public\api'
        New-Item -ItemType Directory -Path $apiDirectory -Force | Out-Null
        Write-JsonAtomic (Join-Path $apiDirectory 'zpass-version.json') $versionMetadata

        $releasePath = Join-Path $apiDirectory 'app-releases.json'
        $releaseMetadata = Get-Content -LiteralPath $releasePath -Raw | ConvertFrom-Json
        if (!$releaseMetadata.platforms) { Set-JsonProperty $releaseMetadata 'platforms' ([PSCustomObject]@{}) }
        if (!$releaseMetadata.platforms.android) { Set-JsonProperty $releaseMetadata.platforms 'android' ([PSCustomObject]@{}) }
        Set-JsonProperty $releaseMetadata.platforms.android 'version' $VersionName
        Set-JsonProperty $releaseMetadata.platforms.android 'releasedAt' ([DateTime]::UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"))
        Set-JsonProperty $releaseMetadata.platforms.android 'downloadUrl' $downloadUrl
        Write-JsonAtomic $releasePath $releaseMetadata
        Write-Output "Updated Android version metadata: $releasePath"
    }

    $releasePath = Join-Path $WebsiteRoot 'public\api\app-releases.json'
    $releaseMetadata = Get-Content -LiteralPath $releasePath -Raw | ConvertFrom-Json
    $platformKey = $Platform.ToLowerInvariant()
    if ($Platform -eq 'Windows' -and [string]::IsNullOrWhiteSpace($VersionName)) {
        [xml]$projectXml = Get-Content -LiteralPath 'C:\Users\rezan\source\repos\ZPassManager\ZPassManager\ZPassManager.csproj' -Raw
        $VersionName = ($projectXml.Project.PropertyGroup | Where-Object { $_.Version } | Select-Object -First 1).Version
    }
    $entry = $releaseMetadata.platforms.$platformKey
    Set-JsonProperty $entry 'version' $VersionName
    Set-JsonProperty $entry 'releasedAt' ([DateTime]::UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"))
    Set-JsonProperty $entry 'downloadUrl' ''
    $hashStream = [IO.File]::OpenRead($output)
    $hashAlgorithm = [Security.Cryptography.SHA256]::Create()
    try { $fileHash = ([BitConverter]::ToString($hashAlgorithm.ComputeHash($hashStream))).Replace('-', '').ToLowerInvariant() } finally { $hashStream.Dispose(); $hashAlgorithm.Dispose() }
    Set-JsonProperty $entry 'sha256' $fileHash
    Set-JsonProperty $entry 'sizeBytes' ((Get-Item -LiteralPath $output).Length)
    Write-JsonAtomic $releasePath $releaseMetadata

    if ($Deploy) {
        $firebaseConfig = Join-Path $WebsiteRoot 'firebase.json'
        if (!(Test-Path -LiteralPath $firebaseConfig -PathType Leaf)) { throw 'Firebase Hosting configuration missing' }
        $firebaseCli = Join-Path $env:APPDATA 'npm\node_modules\firebase-tools\lib\bin\firebase.js'
        if (!(Test-Path -LiteralPath $firebaseCli -PathType Leaf)) { throw 'Firebase CLI is not installed at the expected location' }
        $node = (Get-Command node -ErrorAction Stop).Source
        & $node $firebaseCli deploy --only hosting --project zpasss --config $firebaseConfig --non-interactive
        if ($LASTEXITCODE -ne 0) { throw "Firebase Hosting deployment failed with exit code $LASTEXITCODE" }
        Write-Output 'Deployed website and release metadata. The app package remains outside the public Hosting directory.'
    }
} finally {
    foreach ($temp in @($stage, $previous)) {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
    }
}
