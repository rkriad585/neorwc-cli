#!/usr/bin/env pwsh
param(
  [string]$Filter = "all"
)

$ProjectName = "neorwc"
$RepoOwner = "rkriad585"
$RepoEmail = "rkriad585@gmail.com"

$VersionFile = ".version"
if (-not (Test-Path $VersionFile)) {
  Write-Host "ERROR: .version file not found" -ForegroundColor Red
  exit 1
}
$VersionTag = (Get-Content $VersionFile -Raw).Trim()
$Version = $VersionTag -replace "^v", ""

$CommitHash = "unknown"
try {
  $CommitHash = (git rev-parse --short HEAD 2>$null).Trim()
} catch {}

$BinDir = Join-Path $PWD "bin"
$DistDir = Join-Path $PWD "dist"
New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
New-Item -ItemType Directory -Path $DistDir -Force | Out-Null

$Targets = @(
  @{ Target = "bun-windows-x64";   Os = "windows"; Arch = "amd64"; Ext = ".exe" }
  # Windows ARM64: Bun doesn't support bun-windows-arm64 compile target
  @{ Target = "bun-linux-x64";     Os = "linux";   Arch = "amd64"; Ext = "" }
  @{ Target = "bun-linux-arm64";   Os = "linux";   Arch = "arm64"; Ext = "" }
  @{ Target = "bun-darwin-x64";    Os = "darwin";  Arch = "amd64"; Ext = "" }
  @{ Target = "bun-darwin-arm64";  Os = "darwin";  Arch = "arm64"; Ext = "" }
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗"
Write-Host "║        neorwc v$Version Cross-Platform Build     ║"
Write-Host "║        Commit: $CommitHash                         " -NoNewLine
Write-Host "║"
Write-Host "║        Publisher: $RepoOwner"
Write-Host "╚══════════════════════════════════════════════╝"
Write-Host ""

$Rcedit = Get-Command "rcedit" -ErrorAction SilentlyContinue

function Add-VersionInfo {
  param([string]$ExePath)
  if (-not $Rcedit) { return }
  try {
    & $Rcedit $ExePath --set-version-string "CompanyName" $RepoOwner
    & $Rcedit $ExePath --set-version-string "FileDescription" "neorwc - AI-powered documentation suite"
    & $Rcedit $ExePath --set-version-string "ProductName" "neorwc"
    & $Rcedit $ExePath --set-version-string "LegalCopyright" "Copyright (c) $RepoOwner"
    & $Rcedit $ExePath --set-file-version $Version
    & $Rcedit $ExePath --set-product-version $Version
    Write-Host "  Added version info to $ExePath" -ForegroundColor Gray
  } catch {}
}

foreach ($T in $Targets) {
  $OsFilter = $T.Os
  if ($Filter -ne "all" -and $Filter -ne $OsFilter) { continue }

  $OutName = "$ProjectName-$($T.Os)-$($T.Arch)$($T.Ext)"
  $OutPath = Join-Path $BinDir $OutName

  Write-Host "Building $OutName ..." -ForegroundColor Cyan

  $env:COMMIT_SHA = $CommitHash
  $env:PUBLISHER_NAME = $RepoOwner
  $env:PUBLISHER_EMAIL = $RepoEmail

  $Proc = Start-Process -FilePath "bun" -ArgumentList "run", "scripts/build.ts", "--target=$($T.Target)", "--outfile=$OutPath" -Wait -NoNewWindow -PassThru -Environment @{
    COMMIT_SHA = $CommitHash
    PUBLISHER_NAME = $RepoOwner
    PUBLISHER_EMAIL = $RepoEmail
  }
  if ($Proc.ExitCode -ne 0) {
    Write-Host "  FAILED (exit code $($Proc.ExitCode))" -ForegroundColor Red
    continue
  }

  if ($T.Ext -eq ".exe") {
    Add-VersionInfo -ExePath $OutPath
    Write-Host "  -> $OutName" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Done. Binaries in: $BinDir" -ForegroundColor Green
Get-ChildItem $BinDir | Select-Object Name, Length | Format-Table -AutoSize
