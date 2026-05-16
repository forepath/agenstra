# Build a Windows NSIS installer from a pre-packaged Electron app directory (electron-builder --prepackaged).
param(
    [string]$BundleRoot = $(if ($env:WINDOWS_BUNDLE_DIR) { $env:WINDOWS_BUNDLE_DIR } else { 'windows-electron-bundle' }),
    [string]$ProjectDir = $(if ($env:NATIVE_AGENT_CONSOLE_DIR) { $env:NATIVE_AGENT_CONSOLE_DIR } else { 'apps/native-agent-console' })
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $BundleRoot)) {
    Write-Host "Bundle root '$BundleRoot' not found; skipping Windows installer build."
    exit 0
}

$exe = Get-ChildItem -Path $BundleRoot -Recurse -Filter 'native-agent-console.exe' -File -ErrorAction SilentlyContinue |
    Select-Object -First 1

if (-not $exe) {
    Write-Host "No native-agent-console.exe under '$BundleRoot'; skipping Windows installer build."
    exit 0
}

$appDirectory = $exe.Directory.FullName
$packageJsonPath = Join-Path $appDirectory 'package.json'

if (Test-Path -LiteralPath $packageJsonPath) {
    # Install dir uses package.json name; artifactName uses version (electron-builder reads project package.json).
    $releaseVersion = $env:RELEASE_VERSION
    node -e @"
const fs = require('fs');
const path = process.argv[1];
const releaseVersion = process.argv[2] || '';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.name = 'Agenstra';
if (releaseVersion) {
  pkg.version = releaseVersion;
}
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"@ $packageJsonPath $releaseVersion
}

$configPath = Join-Path $ProjectDir 'electron-builder.installer.yml'

if (-not (Test-Path -LiteralPath $configPath)) {
    throw "electron-builder config not found: $configPath"
}

Write-Host "Building NSIS installer from prepackaged app: $appDirectory"

# Pin version: matches apps/native-agent-console devDependency; avoids npx pulling latest (e.g. 26.x).
$electronBuilderVersion = '25.1.8'

$electronBuilderArgs = @(
    '--prepackaged', $appDirectory,
    '--config', 'electron-builder.installer.yml',
    '--win', 'nsis',
    '--publish', 'never'
)
if ($env:RELEASE_VERSION) {
    Write-Host "Using RELEASE_VERSION=$($env:RELEASE_VERSION) for installer artifact name."
    # Project package.json stays 0.0.0 in git; electron-builder reads version from config, not prepackaged app.
    $electronBuilderArgs += "--config.version=$($env:RELEASE_VERSION)"
}

Push-Location $ProjectDir
try {
    npx --yes "electron-builder@$electronBuilderVersion" @electronBuilderArgs
}
finally {
    Pop-Location
}

$installerOut = Join-Path $ProjectDir 'installer-out'
if (Test-Path -LiteralPath $installerOut) {
    Get-ChildItem -Path $installerOut -Recurse -File | ForEach-Object { Write-Host "Installer artifact: $($_.FullName)" }
}
