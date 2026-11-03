#!/usr/bin/env bash
set -euo pipefail

# Install Android reverse-engineering utilities on Debian/Ubuntu.
if ! command -v apt-get >/dev/null 2>&1; then
  echo "This installer supports Debian/Ubuntu Linux only." >&2
  exit 1
fi

sudo apt-get update
sudo apt-get install -y jadx apktool

echo
echo "Installed tools:"
jadx --version
apktool --version
