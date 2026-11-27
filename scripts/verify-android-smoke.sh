#!/usr/bin/env bash
# Validate and test the exact release artifact; never rebuild it for the emulator.
set -euo pipefail
directory="${1:?Expected APK directory}"
expected="${2:?Expected Android ABI}"
mode="${3:-}"
if [[ "$mode" != "" && "$mode" != "--run" ]]; then
  echo "Invalid mode: $mode" >&2
  exit 2
fi
mapfile -d '' -t apks < <(find "$directory" -type f -name '*.apk' -print0)
if (( ${#apks[@]} != 1 )); then
  echo "Expected one release APK, found ${#apks[@]}" >&2
  exit 1
fi
apk="${apks[0]}"
python3 - "$apk" "$expected" <<'PY'
import sys
import zipfile

apk, expected = sys.argv[1:]
try:
    with zipfile.ZipFile(apk) as artifact:
        abis = {
            name.split("/")[1]
            for name in artifact.namelist()
            if name.startswith("lib/") and name.count("/") == 2 and name.endswith(".so")
        }
except (OSError, zipfile.BadZipFile) as error:
    sys.exit(f"Unreadable APK: {error}")
print("Native APK ABIs:", ", ".join(sorted(abis)) or "none")
if expected not in abis:
    sys.exit(f"Release APK does not contain native libraries for {expected}.")
PY
sha256sum "$apk"
if [[ "$mode" != "--run" ]]; then
  exit 0
fi
actual="$(adb shell getprop ro.product.cpu.abilist | tr -d '\r\n')"
case ",$actual," in
  *",$expected,"*) ;;
  *) echo "Emulator ABIs ($actual) do not include $expected." >&2; exit 1 ;;
esac
test "$(adb shell getprop sys.boot_completed | tr -d '\r\n')" = 1
adb install "$apk"
adb shell pm path com.hamza.app | grep '^package:'
installer="$(mktemp)"
cleanup(){
  rm -f "$installer"
  if [[ "${offline_enabled:-}" = 1 ]]; then
    adb shell cmd connectivity airplane-mode disable >/dev/null 2>&1 || true
    adb shell svc wifi enable >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
curl --fail --silent --show-error --location --retry 3 https://get.maestro.mobile.dev -o "$installer"
bash "$installer"
export PATH="$HOME/.maestro/bin:$PATH"
maestro --version
# The disposable Android emulator must pass without mobile data or Wi-Fi.
offline_enabled=1
adb shell cmd connectivity airplane-mode enable >/dev/null
adb shell svc wifi disable >/dev/null
test "$(adb shell settings get global airplane_mode_on | tr -d '\r\n')" = 1
test "$(adb shell settings get global wifi_on | tr -d '\r\n')" = 0
maestro test .maestro/smoke.yaml
