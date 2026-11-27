#!/usr/bin/env bash
# Public Actions artifacts contain only authenticated ciphertext, never an APK or keystore.
set -euo pipefail
umask 077
input_dir="${1:?tested release folder required}"
artifact="${2:?encrypted artifact output path required}"
: "${RUNNER_TEMP:?}" "${HAMZA_APK_RECIPIENT_CERT_B64:?Protected recipient certificate not configured}"
: "${GITHUB_SHA:?}" "${GITHUB_RUN_ID:?}"
work="$(mktemp -d "$RUNNER_TEMP/hamza-encrypt.XXXXXXXX")"
trap 'rm -rf -- "$work"' EXIT
printf '%s' "$HAMZA_APK_RECIPIENT_CERT_B64" | base64 --decode > "$work/recipient.der"
openssl x509 -inform DER -in "$work/recipient.der" -out "$work/recipient.pem"
openssl x509 -in "$work/recipient.pem" -noout -checkend 0 >/dev/null
(cd "$input_dir" && sha256sum --check --strict apk.sha256)
[[ "$(cat "$input_dir/signer.sha256")" =~ ^[0-9a-f]{64}$ ]]
printf 'source=%s\nrun=%s\n' "$GITHUB_SHA" "$GITHUB_RUN_ID" > "$work/source.txt"
tar -cf "$work/release.tar" -C "$input_dir" HamZa.apk apk.sha256 signer.sha256 -C "$work" source.txt
openssl cms -encrypt -binary -aes-256-gcm -in "$work/release.tar" -outform DER \
  -out "$work/output.cms" -recip "$work/recipient.pem" -keyopt rsa_padding_mode:oaep -keyopt rsa_oaep_md:sha256
test -s "$work/output.cms"
mkdir -p "$(dirname "$artifact")"
install -m 600 "$work/output.cms" "$artifact"
