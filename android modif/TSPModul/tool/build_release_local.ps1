[CmdletBinding()]
param(
    [string]$LocalWorkspace = 'C:\BuildWorkspaces\TSPModul'
)

$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$localRoot = [System.IO.Path]::GetFullPath($LocalWorkspace)
$localBase = [System.IO.Path]::GetFullPath('C:\BuildWorkspaces')

if ($localRoot -eq $sourceRoot -or -not $localRoot.StartsWith($localBase + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Local workspace must be a child of $localBase and must not be the synced source folder."
}

New-Item -ItemType Directory -Path $localBase -Force | Out-Null
New-Item -ItemType Directory -Path $localRoot -Force | Out-Null

# /MIR is intentionally limited to the dedicated local workspace. Generated
# folders are excluded so Synology reparse points never enter the build.
& robocopy $sourceRoot $localRoot /MIR /XD .dart_tool build .gradle .idea .git /XF *.log
if ($LASTEXITCODE -gt 7) {
    throw "Source copy to local workspace failed (robocopy exit code $LASTEXITCODE)."
}

Push-Location $localRoot
try {
    flutter clean
    flutter pub get
    flutter analyze
    flutter test
    flutter build apk --release --no-pub
} finally {
    Pop-Location
}

$localApk = Join-Path $localRoot 'build\app\outputs\flutter-apk\app-release.apk'
if (-not (Test-Path -LiteralPath $localApk)) {
    throw "Release APK was not produced: $localApk"
}

$releaseDir = Join-Path $sourceRoot 'build\app\outputs\flutter-apk'
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

# Nama distribusi: "TSP Modul-v<versi>.apk", BUKAN app-release.apk.
#
# app-release.apk adalah nama teknis bawaan Flutter dan tidak berarti apa-apa bagi
# operator yang menerima file itu. Versi dibaca dari pubspec.yaml supaya dua build
# berbeda tidak pernah punya nama file yang sama.
#
# Hanya SATU apk dihasilkan di sini. update_checker.dart mengambil aset .apk PERTAMA
# yang ditemukan pada rilis GitHub, jadi menaruh dua apk di satu rilis membuat
# pilihannya ambigu.
$versionMatch = Select-String -Path (Join-Path $sourceRoot 'pubspec.yaml') -Pattern '^version:\s*([\d.]+)' | Select-Object -First 1
if (-not $versionMatch) { throw "Tidak bisa membaca version: dari pubspec.yaml." }
$versionLabel = $versionMatch.Matches[0].Groups[1].Value
$releaseApk = Join-Path $releaseDir "TSP Modul-v$versionLabel.apk"
Copy-Item -LiteralPath $localApk -Destination $releaseApk -Force
Write-Output "APK distribusi: $releaseApk"

# Salinan kedua di ROOT PROJECT. Path build/app/outputs/flutter-apk terlalu dalam untuk
# dicari manual setiap kali mau mengunggah rilis; di root, file-nya langsung terlihat.
# Aman dari git karena .gitignore sudah mengabaikan *.apk.
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $sourceRoot '..\..')).Path
$rootApk = Join-Path $projectRoot (Split-Path -Leaf $releaseApk)
Copy-Item -LiteralPath $releaseApk -Destination $rootApk -Force
Write-Output "Salinan siap ambil : $rootApk"
