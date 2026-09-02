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
$releaseApk = Join-Path $releaseDir 'app-release.apk'
Copy-Item -LiteralPath $localApk -Destination $releaseApk -Force
Write-Output "Release APK copied to: $releaseApk"

# Salinan berlabel jelas ("TSP Modul", bukan nama teknis default Flutter "app-release") --
# ini yang dibagikan/diupload ke rilis, bukan pengganti $releaseApk (path itu tetap dipakai
# tooling internal seperti BUILD_RELEASE_LOCAL.cmd/dokumentasi yang mengharapkan nama tetap).
$versionMatch = Select-String -Path (Join-Path $sourceRoot 'pubspec.yaml') -Pattern '^version:\s*([\d.]+)' | Select-Object -First 1
$versionLabel = if ($versionMatch) { $versionMatch.Matches[0].Groups[1].Value } else { 'unknown' }
$friendlyApk = Join-Path $releaseDir "TSP Modul-v$versionLabel.apk"
Copy-Item -LiteralPath $localApk -Destination $friendlyApk -Force
Write-Output "Release APK (nama distribusi) disalin ke: $friendlyApk"
