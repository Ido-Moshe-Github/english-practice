#!/usr/bin/env bash
# macOS / Linux launcher: installs what's needed the first time, then starts the app.
#
# Named .command, not .sh, so double-clicking it in Finder runs it in Terminal —
# macOS opens a .sh in a text editor instead.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but wasn't found."
  echo "Install the LTS version from https://nodejs.org and run this again."
  exit 1
fi

MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$MAJOR" -lt 20 ]; then
  echo "Node.js 20 or newer is required (found $(node -v))."
  echo "Update from https://nodejs.org and run this again."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies — this only happens the first time..."
  npm install --no-audit --no-fund
  echo
fi

echo "Starting… your browser will open automatically at http://localhost:5173"
echo "Press Ctrl-C to stop."
echo
npm run dev
