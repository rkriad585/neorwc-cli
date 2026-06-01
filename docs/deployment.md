# Deployment Guide

## Release Workflow

This project uses GitHub Actions for automated builds and releases.

### Trigger a Release

```bash
# Push a version tag
git tag v1.1.0
git push --tags
```

The workflow (`.github/workflows/release.yml`) will:

1. Read the version from `.version` on the `main` branch
2. Build binaries for all 5 platforms in parallel
3. Generate a changelog from git commit history
4. Create a GitHub Release with all binaries and checksums

### Manual Release

```bash
# Build all binaries locally
make build-all

# Binaries are in bin/
ls -lh bin/
```

## Docker Deployment

### Build the Image

```bash
# Using Makefile
make docker

# Or manually
docker build -t neorwc:latest .
```

### Run in Production

```bash
docker run --rm \
  -v /path/to/project:/workspace \
  -e NEORWC_GOOGLE_KEY=${NEORWC_GOOGLE_KEY} \
  neorwc:latest
```

### Docker Compose

```yaml
services:
  neorwc:
    build: .
    image: neorwc:latest
    environment:
      - NEORWC_GOOGLE_KEY=${NEORWC_GOOGLE_KEY}
    volumes:
      - .:/workspace
    working_dir: /workspace
```

## CI/CD Integration

### GitHub Actions

The project already includes a full release workflow. For other CI providers:

**GitLab CI:**
```yaml
image: oven/bun:1.2
build:
  script:
    - bun install --frozen-lockfile
    - bun run scripts/build.ts --target=bun-linux-x64 --outfile=neorwc
  artifacts:
    paths:
      - neorwc
```

## Binary Distribution

All release binaries are published to GitHub Releases:

```
https://github.com/rkriad585/neorwc-cli/releases/download/v{version}/{binary}
```

Each binary is accompanied by a `.sha256` checksum file for verification.

## One-Line Install

Users can install directly from GitHub Releases:

**Windows:**
```powershell
irm https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.ps1 | iex
```

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.sh | sh
```
