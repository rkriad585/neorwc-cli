#!/usr/bin/env pwsh
param(
  [string]$Filter = "all"
)

$ErrorActionPreference = "Stop"

# ── Configuration ────────────────────────────────────────────────────────────
$BinaryName    = "neorwc"
$PublisherName = "rkriad585"
$PublisherEmail = "rkriad585@gmail.com"

# ── Resolve version ─────────────────────────────────────────────────────────
$VersionFile = Join-Path $PSScriptRoot ".version"
if (Test-Path $VersionFile) {
    $VersionTag = (Get-Content $VersionFile -Raw).Trim()
    $Version = $VersionTag -replace "^v", ""
} else {
    $Version = "0.0.0"
    Write-Warning ".version file not found, defaulting to $Version"
}

# ── Resolve Git commit ──────────────────────────────────────────────────────
try {
    $Commit = (git rev-parse --short HEAD 2>$null).Trim()
} catch {
    $Commit = "unknown"
}
if ([string]::IsNullOrWhiteSpace($Commit)) { $Commit = "unknown" }

# ── Detect host architecture ────────────────────────────────────────────────
$procArch = (Get-CimInstance Win32_Processor | Select-Object -First 1).Architecture
switch ($procArch) {
    0  { $HostArch = "x86"   }
    9  { $HostArch = "amd64" }
    12 { $HostArch = "arm64" }
    5  { $HostArch = "arm"   }
    default { $HostArch = "unknown" }
}

# ── Banner ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          neorwc Cross-Platform Builder          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Version  : $VersionTag" -ForegroundColor Yellow
Write-Host "  Commit   : $Commit" -ForegroundColor Yellow
Write-Host "  Publisher: $PublisherName <$PublisherEmail>" -ForegroundColor Yellow
Write-Host "  Host Arch: $HostArch (Win32_Processor=$procArch)" -ForegroundColor Yellow
Write-Host ""

# ── Target matrix ────────────────────────────────────────────────────────────
# Bun compile targets: bun-{os}-{arch}
# Binary output:       {project}-{os}-{arch}[.exe]
$Targets = @(
    @{ BunTarget = "bun-windows-x64";   OS = "windows"; Arch = "amd64"; Ext = ".exe" }
    @{ BunTarget = "bun-linux-x64";     OS = "linux";   Arch = "amd64"; Ext = ""     }
    @{ BunTarget = "bun-linux-arm64";   OS = "linux";   Arch = "arm64"; Ext = ""     }
    @{ BunTarget = "bun-darwin-x64";    OS = "darwin";  Arch = "amd64"; Ext = ""     }
    @{ BunTarget = "bun-darwin-arm64";  OS = "darwin";  Arch = "arm64"; Ext = ""     }
)

# ── Prepare output directory ─────────────────────────────────────────────────
$OutDir = Join-Path $PSScriptRoot "bin"
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

# ── Build loop ───────────────────────────────────────────────────────────────
$Built   = 0
$Failed  = 0
$Total   = $Targets.Count
$StartTime = Get-Date

foreach ($t in $Targets) {
    if ($Filter -ne "all" -and $Filter -ne $t.OS) { continue }

    $OutName = "$BinaryName-$($t.OS)-$($t.Arch)$($t.Ext)"
    $OutPath = Join-Path $OutDir $OutName

    $idx = $Built + $Failed + 1
    Write-Host "  [$idx/$Total] Building $OutName ... " -NoNewline -ForegroundColor White

    $env:COMMIT_SHA = $Commit
    $env:PUBLISHER_NAME = $PublisherName
    $env:PUBLISHER_EMAIL = $PublisherEmail

    try {
        $proc = Start-Process -FilePath "bun" -ArgumentList "run", "scripts/build.ts", "--target=$($t.BunTarget)", "--outfile=$OutPath" -Wait -NoNewWindow -PassThru
        if ($proc.ExitCode -ne 0) { throw "bun build exited with code $($proc.ExitCode)" }

        $size = [math]::Round((Get-Item $OutPath).Length / 1MB, 2)
        Write-Host "OK (${size} MB)" -ForegroundColor Green
        $Built++
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Warning "  $($_.Exception.Message)"
        $Failed++
    }
}

# ── Cleanup environment ─────────────────────────────────────────────────────
Remove-Item Env:COMMIT_SHA -ErrorAction SilentlyContinue
Remove-Item Env:PUBLISHER_NAME -ErrorAction SilentlyContinue
Remove-Item Env:PUBLISHER_EMAIL -ErrorAction SilentlyContinue

# ── Summary ──────────────────────────────────────────────────────────────────
$Duration = (Get-Date) - $StartTime
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Build complete in $([math]::Round($Duration.TotalSeconds, 1))s" -ForegroundColor Cyan
Write-Host "  Success: $Built / $Total" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Yellow" })
if ($Failed -gt 0) {
    Write-Host "  Failed : $Failed / $Total" -ForegroundColor Red
}
Write-Host "  Output : $OutDir" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($Failed -gt 0) { exit 1 }
