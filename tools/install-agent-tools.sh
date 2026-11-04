#!/usr/bin/env bash
set -euo pipefail

# Run from the HamZa repository root inside the development VM/Codespace.
command -v node >/dev/null 2>&1 || { echo "Node.js is required."; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<22 || (a===22 && b<20)) { console.error("Node.js 22.20+ is required by the current skills CLI."); process.exit(1); }'
command -v uv >/dev/null 2>&1 || { echo "Install uv first: https://docs.astral.sh/uv/"; exit 1; }

echo "Installing official Superpowers skills for Codex..."
npx -y skills add obra/superpowers --skill '*' --agent codex --copy --yes

echo "Installing official Strix security-testing skills for Codex..."
npx -y skills add usestrix/strix --skill '*' --agent codex --copy --yes

echo "Installing Graphify and its Codex project skill..."
uv tool install --upgrade graphifyy
graphify install --project --platform codex

echo
echo "Agent skills installed. Verify with: npx skills list --agent codex"
echo "Graphify installed. Build the local code graph by asking the agent to run: /graphify ."
echo
echo "21st MCP requires your own API key and browser sign-in."
echo "When ready, run: npx @21st-dev/cli@latest init --client codex"
echo "Get a key at https://21st.dev/mcp. Do not commit your key."
echo
echo "Strix scanner is NOT installed or executed by this script."
echo "For a security scan, install Docker and configure your own LLM login/API key first."
