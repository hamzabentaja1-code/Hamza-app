#!/usr/bin/env bash
set -euo pipefail

# Run from the HamZa repository root inside the development VM/Codespace.
command -v node >/dev/null 2>&1 || { echo "Node.js is required."; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<22 || (a===22 && b<20)) { console.error("Node.js 22.20+ is required by the current skills CLI."); process.exit(1); }'

echo "Installing official Superpowers skills for Codex..."
npx -y skills add obra/superpowers --skill '*' --agent codex --copy --yes

echo "Installing official Strix security-testing skills for Codex..."
npx -y skills add usestrix/strix --skill '*' --agent codex --copy --yes

echo "Installed skills:"
npx -y skills list --agent codex || npx -y skills list

echo
echo "NOTE: This installs agent instructions only. It does NOT install/run the Strix scanner."
echo "To run Strix, Docker and an LLM provider login/API key are required."
