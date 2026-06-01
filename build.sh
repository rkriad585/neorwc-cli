#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
BINARY_NAME="neorwc"
PUBLISHER_NAME="rkriad585"
PUBLISHER_EMAIL="rkriad585@gmail.com"
FILTER="${1:-all}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Resolve version ─────────────────────────────────────────────────────────
VERSION_FILE="${SCRIPT_DIR}/.version"
if [[ -f "$VERSION_FILE" ]]; then
    VERSION_TAG="$(tr -d '[:space:]' < "$VERSION_FILE")"
    VERSION="${VERSION_TAG#v}"
else
    VERSION="0.0.0"
    echo "⚠  .version file not found, defaulting to ${VERSION}" >&2
fi

# ── Resolve Git commit ──────────────────────────────────────────────────────
COMMIT="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"

# ── Detect host architecture ────────────────────────────────────────────────
HOST_ARCH="$(uname -m)"
case "$HOST_ARCH" in
    x86_64|amd64) HOST_ARCH="amd64" ;;
    aarch64|arm64) HOST_ARCH="arm64" ;;
    *) HOST_ARCH="unknown" ;;
esac

# ── Banner ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║          neorwc Cross-Platform Builder          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Version  : ${VERSION_TAG}"
echo "  Commit   : ${COMMIT}"
echo "  Publisher: ${PUBLISHER_NAME} <${PUBLISHER_EMAIL}>"
echo "  Host Arch: ${HOST_ARCH}"
echo ""

# ── Target matrix ────────────────────────────────────────────────────────────
TARGETS=(
    "bun-windows-x64 windows amd64 .exe"
    "bun-linux-x64 linux amd64"
    "bun-linux-arm64 linux arm64"
    "bun-darwin-x64 darwin amd64"
    "bun-darwin-arm64 darwin arm64"
)

# ── Prepare output directory ─────────────────────────────────────────────────
OUT_DIR="${SCRIPT_DIR}/bin"
mkdir -p "$OUT_DIR"

# ── Build loop ───────────────────────────────────────────────────────────────
BUILT=0
FAILED=0
TOTAL=${#TARGETS[@]}
START_TIME=$(date +%s)

for entry in "${TARGETS[@]}"; do
    # shellcheck disable=SC2086
    set -- $entry
    BUN_TARGET="$1"
    GOOS="$2"
    GOARCH="$3"
    EXT="${4:-}"

    # Filter by OS
    if [[ "$FILTER" != "all" && "$FILTER" != "$GOOS" ]]; then
        TOTAL=$(( TOTAL - 1 ))
        continue
    fi

    OUT_NAME="${BINARY_NAME}-${GOOS}-${GOARCH}${EXT}"
    OUT_PATH="${OUT_DIR}/${OUT_NAME}"

    IDX=$(( BUILT + FAILED + 1 ))
    printf "  [%d/%d] Building %s ... " "$IDX" "$TOTAL" "$OUT_NAME"

    export COMMIT_SHA="${COMMIT}"
    export PUBLISHER_NAME="${PUBLISHER_NAME}"
    export PUBLISHER_EMAIL="${PUBLISHER_EMAIL}"

    if bun run scripts/build.ts --target="${BUN_TARGET}" --outfile="${OUT_PATH}"; then
        SIZE=$(du -h "$OUT_PATH" | cut -f1)
        echo "OK (${SIZE})"
        BUILT=$(( BUILT + 1 ))
    else
        echo "FAILED"
        FAILED=$(( FAILED + 1 ))
    fi
done

# ── Summary ──────────────────────────────────────────────────────────────────
END_TIME=$(date +%s)
DURATION=$(( END_TIME - START_TIME ))

echo ""
echo "══════════════════════════════════════════════════"
echo "  Build complete in ${DURATION}s"
echo "  Success: ${BUILT} / ${TOTAL}"
if [[ $FAILED -gt 0 ]]; then
    echo "  Failed : ${FAILED} / ${TOTAL}"
fi
echo "  Output : ${OUT_DIR}"
echo "══════════════════════════════════════════════════"
echo ""

if [[ $FAILED -gt 0 ]]; then
    exit 1
fi
