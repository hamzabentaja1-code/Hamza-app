"""Check apksigner's successful verification output against one expected certificate."""
from pathlib import Path
import re
import sys

expected = sys.argv[1].lower()
output = Path(sys.argv[2]).read_text(encoding="utf-8")
counts = re.findall(r"(?m)^Number of signers:[ \t]*(\d+)[ \t]*$", output)
# Current Android tools may print a scheme-qualified signer instead of a number.
signers = re.findall(
    r"(?im)^(?:Signer #(\d+) certificate|V[234] Signer(?: #(\d+))?: certificate)"
    r" SHA-256 digest:[ \t]*([0-9a-f]{64})[ \t]*$", output,
)
numbered = {int(number or scheme) for number, scheme, _ in signers if number or scheme}
if (
    not re.fullmatch(r"[0-9a-f]{64}", expected)
    or counts != ["1"]
    or not signers
    or numbered - {1}
    or {digest.lower() for _, _, digest in signers} != {expected}
):
    sys.exit("APK verifier did not report exactly one designated signing identity.")
