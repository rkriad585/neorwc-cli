#!/bin/sh
# neorwc cross-platform build script
# Builds binaries for all platforms and saves to bin/ folder
#
# Usage:
#   ./build.sh              # Build all platforms
#   ./build.sh windows      # Windows only
#   ./build.sh linux        # Linux only
#   ./build.sh darwin       # macOS only
#
# Requirements: Bun

set -eu

FILTER="${1:-all}"
PROJECT_NAME="neorwc"
REPO_OWNER="rkriad585"

# Read version
VERSION_FILE=".version"
if [ ! -f "$VERSION_FILE" ]; then
  echo "ERROR: .version file not found"
  exit 1
fi
VERSION_TAG=$(cat "$VERSION_FILE" | tr -d '[:space:]')
VERSION=$(echo "$VERSION_TAG" | sed 's/^v//')

# Get latest commit hash
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Ensure bin/ and dist/ directories
mkdir -p bin dist

# Build targets
build_target() {
  local TARGET="$1"
  local OS_NAME="$2"
  local ARCH_NAME="$3"
  local EXT="$4"

  local OUT_NAME="${PROJECT_NAME}-${OS_NAME}-${ARCH_NAME}${EXT}"
  local OUT_PATH="bin/${OUT_NAME}"

  # Skip if filtering by platform
  if [ "$FILTER" != "all" ] && [ "$FILTER" != "$OS_NAME" ]; then
    return
  fi

  echo "Building ${OUT_NAME} ..."

  # Run the build script
  bun run scripts/build.ts --target="${TARGET}" 2>&1

  # Find the output (build script outputs to dist/neorwc(.exe))
  local BUILT_FILE="dist/neorwc${EXT}"
  if [ -f "$BUILT_FILE" ]; then
    mv -f "$BUILT_FILE" "$OUT_PATH"
    chmod +x "$OUT_PATH"
    echo "  -> ${OUT_NAME}"
  else
    echo "  Output not found: ${BUILT_FILE}"
  fi

  # Clean up log
  rm -f dist/build.log
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        neorwc v${VERSION} Cross-Platform Build    ║"
echo "║        Commit: ${COMMIT_HASH}"
echo "║        Publisher: ${REPO_OWNER}"
echo "╚══════════════════════════════════════════════╝"
echo ""

build_target "bun-windows-x64"   "windows" "amd64" ".exe"
build_target "bun-linux-x64"     "linux"   "amd64" ""
build_target "bun-linux-arm64"   "linux"   "arm64" ""
build_target "bun-darwin-x64"    "darwin"  "amd64" ""
build_target "bun-darwin-arm64"  "darwin"  "arm64" ""

echo ""
echo "Done. Binaries in: bin/"
ls -lh bin/
