#!/usr/bin/env bash
set -euo pipefail

TOOLS_DIR="$HOME/.local/hamza-tools"
BIN_DIR="$HOME/.local/bin"
mkdir -p "$TOOLS_DIR" "$BIN_DIR"

sudo apt-get update
sudo apt-get install -y --no-install-recommends curl wget unzip zip jq adb

# JADX: Android APK/Dex decompiler
JADX_VERSION="1.5.6"
JADX_ARCHIVE="$TOOLS_DIR/jadx-$JADX_VERSION.zip"
if [[ ! -x "$TOOLS_DIR/jadx/bin/jadx" ]]; then
  curl -fL "https://github.com/skylot/jadx/releases/download/v$JADX_VERSION/jadx-$JADX_VERSION.zip" -o "$JADX_ARCHIVE"
  rm -rf "$TOOLS_DIR/jadx"
  mkdir -p "$TOOLS_DIR/jadx"
  unzip -q "$JADX_ARCHIVE" -d "$TOOLS_DIR/jadx"
fi
ln -sf "$TOOLS_DIR/jadx/bin/jadx" "$BIN_DIR/jadx"
ln -sf "$TOOLS_DIR/jadx/bin/jadx-gui" "$BIN_DIR/jadx-gui"

# APKTool: APK resource and manifest inspection
APKTOOL_VERSION="3.0.3"
curl -fL "https://github.com/iBotPeaches/Apktool/releases/download/v$APKTOOL_VERSION/apktool_$APKTOOL_VERSION.jar" -o "$TOOLS_DIR/apktool.jar"
cat > "$BIN_DIR/apktool" <<'WRAPPER'
#!/usr/bin/env bash
exec java -jar "$HOME/.local/hamza-tools/apktool.jar" "$@"
WRAPPER
chmod +x "$BIN_DIR/apktool"

# Maestro CLI: Android end-to-end UI automation
if ! command -v maestro >/dev/null 2>&1; then
  curl -Ls "https://get.maestro.mobile.dev" | bash
fi
export PATH="$HOME/.maestro/bin:$BIN_DIR:$PATH"

echo "HamZa tools ready:"
java -version
jadx --version
apktool --version
maestro --version
adb version
