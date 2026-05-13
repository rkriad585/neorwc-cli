#!/usr/bin/env pwsh
# neorwc cross-platform build script
# Builds binaries for all platforms and saves to bin/ folder
#
# Usage:
#   .\build.ps1              # Build all platforms
#   .\build.ps1 windows      # Windows only
#   .\build.ps1 linux        # Linux only
#   .\build.ps1 darwin       # macOS only
#
# Requirements: Bun, PowerShell 7+

param(
  [string]$Filter = "all"
)

$ProjectName = "neorwc"
$RepoOwner = "rkriad585"
$RepoEmail = "rkriad585@gmail.com"

# Read version
$VersionFile = ".version"
if (-not (Test-Path $VersionFile)) {
  Write-Host "ERROR: .version file not found" -ForegroundColor Red
  exit 1
}
$VersionTag = (Get-Content $VersionFile -Raw).Trim()
$Version = $VersionTag -replace "^v", ""

# Get latest commit hash
$CommitHash = "unknown"
try {
  $CommitHash = (git rev-parse --short HEAD 2>$null).Trim()
} catch {}

# Ensure bin/ and dist/ directories
$BinDir = Join-Path $PWD "bin"
$DistDir = Join-Path $PWD "dist"
New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
New-Item -ItemType Directory -Path $DistDir -Force | Out-Null

# Build targets: target-name, os-name, arch-name
$Targets = @(
  @{ Target = "bun-windows-x64";   Os = "windows"; Arch = "amd64"; Ext = ".exe" }
  @{ Target = "bun-linux-x64";     Os = "linux";   Arch = "amd64"; Ext = "" }
  @{ Target = "bun-linux-arm64";   Os = "linux";   Arch = "arm64"; Ext = "" }
  @{ Target = "bun-darwin-x64";    Os = "darwin";  Arch = "amd64"; Ext = "" }
  @{ Target = "bun-darwin-arm64";  Os = "darwin";  Arch = "arm64"; Ext = "" }
)

$BuildScript = Join-Path $PWD "scripts/build.ts"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗"
Write-Host "║        neorwc v$Version Cross-Platform Build     ║"
Write-Host "║        Commit: $CommitHash                         " -NoNewLine
Write-Host "║"
Write-Host "║        Publisher: $RepoOwner"
Write-Host "╚══════════════════════════════════════════════╝"
Write-Host ""

# Install rcedit for Windows version info (if available)
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
  } catch {
    # non-fatal
  }
}

foreach ($T in $Targets) {
  $OsFilter = $T.Os
  if ($Filter -ne "all" -and $Filter -ne $OsFilter) {
    continue
  }

  $OutName = "$ProjectName-$($T.Os)-$($T.Arch)$($T.Ext)"
  $OutPath = Join-Path $BinDir $OutName

  Write-Host "Building $OutName ..." -ForegroundColor Cyan

  # Run the build script
  $Proc = Start-Process -FilePath "bun" -ArgumentList "run", "scripts/build.ts", "--target=$($T.Target)" -Wait -NoNewWindow -PassThru
  if ($Proc.ExitCode -ne 0) {
    Write-Host "  FAILED (exit code $($Proc.ExitCode))" -ForegroundColor Red
    continue
  }

  # Find the output (build script outputs to dist/neorwc(.exe))
  $BuiltFile = Join-Path $DistDir "neorwc$($T.Ext)"
  if (Test-Path $BuiltFile) {
    Move-Item -LiteralPath $BuiltFile -Destination $OutPath -Force
    Write-Host "  -> $OutName" -ForegroundColor Green

    # Add version info (Windows only via rcedit)
    if ($T.Ext -eq ".exe") {
      Add-VersionInfo -ExePath $OutPath
    }
  } else {
    Write-Host "  Output not found: $BuiltFile" -ForegroundColor Red
  }

  # Clean up log
  $LogFile = Join-Path $DistDir "build.log"
  if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
}

Write-Host ""
Write-Host "Done. Binaries in: $BinDir" -ForegroundColor Green
Get-ChildItem $BinDir | Select-Object Name, Length | Format-Table -AutoSize
