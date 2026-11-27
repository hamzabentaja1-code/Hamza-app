#!/usr/bin/env bash
# Credentials are passed only to this local signing step, not to Gradle or the emulator.
set -euo pipefail
umask 077
source_dir="${1:?unsigned release APK folder required}"
target_dir="${2:?signed APK output folder required}"
: "${RUNNER_TEMP:?}" "${ANDROID_HOME:?}" "${HAMZA_RELEASE_KEYSTORE_B64:?Missing protected signing key}"
: "${HAMZA_RELEASE_STORE_PASSWORD:?}" "${HAMZA_RELEASE_KEY_ALIAS:?}" "${HAMZA_RELEASE_KEY_PASSWORD:?}"
expected="${HAMZA_RELEASE_SIGNER_SHA256,,}"
[[ "$expected" =~ ^[0-9a-f]{64}$ ]] || { echo "Missing or invalid expected signing certificate fingerprint." >&2; exit 1; }
mapfile -d '' -t inputs < <(find "$source_dir" -maxdepth 1 -type f -name '*.apk' -print0)
[[ ${#inputs[@]} = 1 && "${inputs[0]}" == *-unsigned.apk ]] ||
  { echo "Expected one unsigned release APK; refusing a debug or already-signed build." >&2; exit 1; }
tool_dir="$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d -print | sort -V | tail -n 1)"
test -x "$tool_dir/apksigner" && test -x "$tool_dir/zipalign"
mkdir -p "$target_dir"
work="$(mktemp -d "$RUNNER_TEMP/hamza-sign.XXXXXXXX")"
trap 'rm -rf -- "$work"' EXIT
printf '%s' "$HAMZA_RELEASE_KEYSTORE_B64" | base64 --decode > "$work/signing.p12"
unset HAMZA_RELEASE_KEYSTORE_B64
"$tool_dir/zipalign" -P 16 -f 4 "${inputs[0]}" "$work/aligned.apk"
"$tool_dir/apksigner" sign --ks "$work/signing.p12" --ks-type PKCS12 --ks-key-alias "$HAMZA_RELEASE_KEY_ALIAS" \
  --ks-pass env:HAMZA_RELEASE_STORE_PASSWORD --key-pass env:HAMZA_RELEASE_KEY_PASSWORD \
  --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true --v4-signing-enabled false \
  --out "$work/HamZa.apk" "$work/aligned.apk"
rm -f -- "$work/signing.p12"
unset HAMZA_RELEASE_STORE_PASSWORD HAMZA_RELEASE_KEY_PASSWORD HAMZA_RELEASE_KEY_ALIAS
"$tool_dir/zipalign" -c -P 16 4 "$work/HamZa.apk"
"$tool_dir/apksigner" verify --verbose --print-certs "$work/HamZa.apk" > "$work/cert.txt"
mapfile -t signers < <(sed -n 's/^Signer #[0-9][0-9]* certificate SHA-256 digest: //p' "$work/cert.txt" | tr '[:upper:]' '[:lower:]')
if [[ ${#signers[@]} != 1 || "${signers[0]}" != "$expected" ]]; then
  echo "APK signer does not match the designated release signing identity." >&2
  exit 1
fi
install -m 600 "$work/HamZa.apk" "$target_dir/HamZa.apk"
printf '%s\n' "$expected" > "$target_dir/signer.sha256"
(cd "$target_dir" && sha256sum HamZa.apk > apk.sha256)
