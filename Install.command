#!/bin/sh
cd "$(dirname "$0")" || exit 1
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export PATH
NODE_EXECUTABLE="$(command -v node 2>/dev/null || true)"

# Codex includes a Node runtime on many installations. It is a fallback only:
# a normal system Node installation remains the preferred, documented route.
if [ -z "$NODE_EXECUTABLE" ] && [ -d "$HOME/.cache/codex-runtimes" ]; then
  NODE_EXECUTABLE="$(find "$HOME/.cache/codex-runtimes" -path '*/dependencies/node/bin/node' -type f -perm -111 2>/dev/null | head -n 1)"
fi

if [ -z "$NODE_EXECUTABLE" ]; then
  echo "CFA needs Node.js 20 or newer to install its AI skills."
  echo "Install it from https://nodejs.org, then open this file again."
  exit 1
fi
INSTALL_ARGUMENTS=""
if [ -d "$HOME/plugins/ios-app-development-cfa" ]; then
  INSTALL_ARGUMENTS="--replace"
fi

"$NODE_EXECUTABLE" scripts/install.mjs $INSTALL_ARGUMENTS
status=$?
printf '\nPress Return to close. '
read -r answer
exit "$status"
