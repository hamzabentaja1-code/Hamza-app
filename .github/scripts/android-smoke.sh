#!/usr/bin/env bash
set -uo pipefail

mkdir -p artifacts

collect_diagnostics() {
  if [[ -d "$HOME/.maestro/tests" ]]; then
    cp -R "$HOME/.maestro/tests" artifacts/maestro-debug 2>/dev/null || true
  fi
  adb logcat -d > artifacts/android-logcat.txt 2>&1 || true
  adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window.xml artifacts/android-ui.xml >/dev/null 2>&1 || true
  adb exec-out screencap -p > artifacts/android-screen.png 2>/dev/null || true
}

apk_path="$(find dist/apk -type f -name '*.apk' -print -quit)"
if [[ -z "$apk_path" ]]; then
  echo "No APK was downloaded."
  exit 2
fi

adb install "$apk_path"
install_status=$?
if [[ $install_status -ne 0 ]]; then
  collect_diagnostics
  exit "$install_status"
fi

curl -Ls "https://get.maestro.mobile.dev" | bash
install_status=$?
if [[ $install_status -ne 0 ]]; then
  collect_diagnostics
  exit "$install_status"
fi

"$HOME/.maestro/bin/maestro" --version
"$HOME/.maestro/bin/maestro" test .maestro
smoke_status=$?
collect_diagnostics
exit "$smoke_status"
