#!/bin/sh
# neorwc installer for Linux / macOS
# Install:   curl -fsSL https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.sh | sh
# Uninstall: curl -fsSL https://raw.githubusercontent.com/rkriad585/neorwc-cli/main/installer.sh | sh -s -- --selfuninstall

set -eu

PROJECT_NAME="neorwc"
REPO_NAME="neorwc-cli"
REPO_OWNER="rkriad585"
CONFIG_DIR="$HOME/.config/neostore/$PROJECT_NAME"
INSTALL_DIR="$CONFIG_DIR/bin"
BINARY_PATH="$INSTALL_DIR/$PROJECT_NAME"

# ─── Self-uninstall mode ────────────────────────────────────────────────────
if [ "${1:-}" = "--selfuninstall" ]; then
  echo "Uninstalling $PROJECT_NAME..."

  # Remove binary
  if [ -f "$BINARY_PATH" ]; then
    rm -f "$BINARY_PATH"
    echo "  Removed binary: $BINARY_PATH"
  fi

  # Remove config directory
  if [ -d "$CONFIG_DIR" ]; then
    rm -rf "$CONFIG_DIR"
    echo "  Removed config: $CONFIG_DIR"
  fi

  # Remove PATH entry from shell rc
  remove_path() {
    local rc="$1"
    if [ -f "$rc" ]; then
      # Remove the export line and the comment above it
      sed -i '' '/# neorwc/d' "$rc" 2>/dev/null || sed -i '/# neorwc/d' "$rc" 2>/dev/null || true
      # Use a more robust pattern to match the PATH export line for neorwc
      sed -i '' "\|$INSTALL_DIR|d" "$rc" 2>/dev/null || sed -i "\|$INSTALL_DIR|d" "$rc" 2>/dev/null || true
      echo "  Cleaned PATH in $rc"
    fi
  }

  case "${SHELL:-}" in
    */zsh)  remove_path "$HOME/.zshrc"  ;;
    */bash) remove_path "$HOME/.bashrc" ;;
  esac

  echo ""
  echo "$PROJECT_NAME has been uninstalled."
  echo "Restart your shell for PATH changes to take effect."
  exit 0
fi

# ─── Install mode ───────────────────────────────────────────────────────────

# Get latest version from the repo
VERSION_URL="https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/main/.version"
VERSION=$(curl -sSL "$VERSION_URL" | tr -d '[:space:]')
if [ -z "$VERSION" ]; then
  echo "Failed to fetch latest version."
  exit 1
fi

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS" in
  linux)  OS_NAME="linux"  ;;
  darwin) OS_NAME="darwin" ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  x86_64|amd64) ARCH_NAME="amd64"   ;;
  aarch64|arm64) ARCH_NAME="arm64"  ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

BINARY_NAME="$PROJECT_NAME-$OS_NAME-$ARCH_NAME"
DOWNLOAD_URL="https://github.com/$REPO_OWNER/$REPO_NAME/releases/download/$VERSION/$BINARY_NAME"

mkdir -p "$INSTALL_DIR"

echo "Downloading $PROJECT_NAME $VERSION ($OS_NAME-$ARCH_NAME)..."
curl -sSL "$DOWNLOAD_URL" -o "$BINARY_PATH"
chmod +x "$BINARY_PATH"

# Add to PATH via shell rc file
add_to_path() {
  local rc="$1"
  local line="export PATH=\"\$PATH:$INSTALL_DIR\""
  if [ -f "$rc" ] && ! grep -qF "$INSTALL_DIR" "$rc" 2>/dev/null; then
    echo "" >> "$rc"
    echo "# neorwc" >> "$rc"
    echo "$line" >> "$rc"
    echo "Added to PATH in $rc"
  fi
}

case "${SHELL:-}" in
  */zsh)  add_to_path "$HOME/.zshrc"  ;;
  */bash) add_to_path "$HOME/.bashrc" ;;
  */fish)
    fish -c "fish_add_path $INSTALL_DIR" 2>/dev/null || true
    echo "Added to PATH via fish_add_path"
    ;;
esac

echo ""
echo "✔ $PROJECT_NAME $VERSION installed successfully!"
echo "   Run: $PROJECT_NAME --help"
echo "   Uninstall: $PROJECT_NAME --selfuninstall"
echo ""
echo "   If the command is not found, restart your shell or run:"
echo "   export PATH=\"\$PATH:$INSTALL_DIR\""
