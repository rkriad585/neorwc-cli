# Build Guide

## Prerequisites

- [Bun](https://bun.sh) v1.2+
- Git

## Quick Build

```bash
# Install dependencies
bun install

# Build for current platform
bun run build
```

Output is written to `bin/neorwc` (or `bin/neorwc.exe` on Windows).

## Cross-Platform Builds

Build all 5 supported targets at once:

**Windows:**
```powershell
.\build.ps1
```

**Linux / macOS:**
```bash
./build.sh
```

Build a single platform:

```powershell
.\build.ps1 linux        # Windows: Linux only
```

```bash
./build.sh darwin         # macOS only
```

### Target Matrix

| Binary Name | Bun Target | Platform |
|------------|------------|----------|
| `neorwc-windows-amd64.exe` | `bun-windows-x64` | Windows x64 |
| `neorwc-linux-amd64` | `bun-linux-x64` | Linux x64 |
| `neorwc-linux-arm64` | `bun-linux-arm64` | Linux ARM64 |
| `neorwc-darwin-amd64` | `bun-darwin-x64` | macOS Intel |
| `neorwc-darwin-arm64` | `bun-darwin-arm64` | macOS Apple Silicon |

> Windows ARM64 is not supported by Bun's compile target.

## Makefile

```bash
make build       # Build current platform
make build-all   # Build all targets
make run         # Run from source
make test        # Type-check
make lint        # Strict type-check
make clean       # Remove artifacts
make install     # Install dependencies
make release     # Build all binaries
make docker      # Build Docker image
```

## Docker

```bash
# Build
docker build --build-arg VERSION=$(cat .version) -t neorwc .

# Run
docker run --rm -it \
  -v $(PWD):/workspace \
  -e NEORWC_GOOGLE_KEY=your_key \
  neorwc

# Docker Compose
docker compose up
```

## Manual Build with Version Injection

```bash
COMMIT_SHA=$(git rev-parse --short HEAD) \
PUBLISHER_NAME="rkriad585" \
PUBLISHER_EMAIL="rkriad585@gmail.com" \
bun run scripts/build.ts --target=bun-linux-x64 --outfile=neorwc
```

## Type Checking

```bash
bunx tsc --noEmit
```
