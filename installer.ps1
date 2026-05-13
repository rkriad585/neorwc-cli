#!/usr/bin/env pwsh
# neorwc installer for Windows
# Install:  irm https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.ps1 | iex
# Uninstall: irm https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.ps1 | iex --selfuninstall
# Or: Invoke-RestMethod -Uri "https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.ps1" | Invoke-Expression -ArgumentList "--selfuninstall"

$ProjectName = "neorwc"
$RepoName = "neorwc-cli"
$RepoOwner = "rkriad585"
$ConfigDir = "$env:USERPROFILE\.config\neostore\$ProjectName"
$InstallDir = "$ConfigDir\bin"
$BinaryPath = "$InstallDir\$ProjectName.exe"

# ─── Self-uninstall mode ────────────────────────────────────────────────────
if ($args -contains "--selfuninstall") {
  Write-Host "Uninstalling $ProjectName..." -ForegroundColor Yellow

  # Remove the binary
  if (Test-Path -LiteralPath $BinaryPath) {
    Remove-Item -LiteralPath $BinaryPath -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed binary: $BinaryPath" -ForegroundColor Gray
  }

  # Remove the config directory
  if (Test-Path -LiteralPath $ConfigDir) {
    Remove-Item -LiteralPath $ConfigDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed config: $ConfigDir" -ForegroundColor Gray
  }

  # Remove from user PATH
  $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($UserPath -like "*$InstallDir*") {
    $NewPath = ($UserPath -split ';' | Where-Object { $_ -ne $InstallDir }) -join ';'
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    Write-Host "  Removed $InstallDir from PATH" -ForegroundColor Gray
  }

  Write-Host ""
  Write-Host "$ProjectName has been uninstalled." -ForegroundColor Green
  Write-Host "Restart your terminal for PATH changes to take effect." -ForegroundColor Yellow
  exit 0
}

# ─── Install mode ───────────────────────────────────────────────────────────

# Get latest version from the repo
$VersionUrl = "https://raw.githubusercontent.com/$RepoOwner/$RepoName/main/.version"
try {
  $Version = (Invoke-RestMethod -Uri $VersionUrl).Trim()
} catch {
  Write-Host "Failed to fetch latest version." -ForegroundColor Red
  exit 1
}

# Detect architecture using Win32_Processor
$Arch = (Get-CimInstance Win32_Processor).Architecture
$ArchName = switch ($Arch) {
  0  { "x86" }
  5  { "arm64" }
  9  { "amd64" }
  12 { "arm64" }
  default {
    Write-Host "Unsupported architecture (code: $Arch)" -ForegroundColor Red
    exit 1
  }
}

$BinaryName = "$ProjectName-windows-$ArchName.exe"
$DownloadUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/$Version/$BinaryName"

# Create install directory
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

Write-Host "Downloading $ProjectName $Version ($ArchName)..." -ForegroundColor Cyan
try {
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $BinaryPath -ErrorAction Stop
} catch {
  Write-Host "Download failed: $_" -ForegroundColor Red
  exit 1
}

# Add to user PATH if not already there
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
  Write-Host "Added $InstallDir to user PATH." -ForegroundColor Yellow
  Write-Host "Restart your terminal or run: `$env:Path += `";$InstallDir`"" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✔ $ProjectName $Version installed successfully!" -ForegroundColor Green
Write-Host "   Run: $ProjectName --help" -ForegroundColor Cyan
Write-Host "   Uninstall: $ProjectName --selfuninstall" -ForegroundColor Gray
