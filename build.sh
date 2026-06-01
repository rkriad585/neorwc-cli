#!/bin/sh
set -eu

FILTER="${1:-all}"
PROJECT_NAME="neorwc"
REPO_OWNER="rkriad585"
REPO_EMAIL="rkriad585@gmail.com"

VERSION_FILE=".version"
if [ ! -f "$VERSION_FILE" ]; then
  echo "ERROR: .version file not found"
  exit 1
fi
VERSION_TAG=$(cat "$VERSION_FILE" | tr -d '[:space:]')
VERSION=$(echo "$VERSION_TAG" | sed 's/^v//')

COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

mkdir -p bin dist

build_target() {
  local TARGET="$1"
  local OS_NAME="$2"
  local ARCH_NAME="$3"
  local EXT="$4"

  local OUT_NAME="${PROJECT_NAME}-${OS_NAME}-${ARCH_NAME}${EXT}"
  local OUT_PATH="bin/${OUT_NAME}"

  if [ "$FILTER" != "all" ] && [ "$FILTER" != "$OS_NAME" ]; then
    return
  fi

  echo "Building ${OUT_NAME} ..."

  COMMIT_SHA="$COMMIT_HASH" \
  PUBLISHER_NAME="$REPO_OWNER" \
  PUBLISHER_EMAIL="$REPO_EMAIL" \
  bun run scripts/build.ts --target="${TARGET}" --outfile="${OUT_PATH}"

  chmod +x "${OUT_PATH}"
  echo "  -> ${OUT_NAME}"
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        neorwc v${VERSION} Cross-Platform Build    ║"
echo "║        Commit: ${COMMIT_HASH}"
echo "║        Publisher: ${REPO_OWNER}"
echo "╚══════════════════════════════════════════════╝"
echo ""

build_target "bun-windows-x64"   "windows" "amd64" ".exe"
build_target "bun-windows-arm64"  "windows" "arm64" ".exe"
build_target "bun-linux-x64"     "linux"   "amd64" ""
build_target "bun-linux-arm64"   "linux"   "arm64" ""
build_target "bun-darwin-x64"    "darwin"  "amd64" ""
build_target "bun-darwin-arm64"  "darwin"  "arm64" ""

echo ""
echo "Done. Binaries in: bin/"
ls -lh bin/
