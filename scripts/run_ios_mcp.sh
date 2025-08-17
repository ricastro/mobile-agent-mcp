#!/usr/bin/env bash
set -euo pipefail

# Mobile Agent MCP launcher for iOS Simulator
# - Boots simulator
# - Installs app (if IOS_APP provided)
# - Starts Appium
# - Starts MCP server (stdio)

### Config ###
: "${APPIUM_URL:=http://127.0.0.1:4723}"
: "${IOS_DEVICE_NAME:=iPhone 15}"
: "${IOS_PLATFORM_VERSION:=}"
# One of these must be provided
: "${IOS_APP:=}"
: "${IOS_BUNDLE_ID:=}"

# Optional (Flutter dev only)
: "${FLUTTER_VM_SERVICE_URL:=}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

log() { echo "[mcp-ios] $*"; }
die() { echo "[mcp-ios] ERROR: $*" >&2; exit 1; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"; }

require_cmd xcrun
require_cmd node
require_cmd npm

if ! command -v appium >/dev/null 2>&1; then
  die "Appium not found. Install: npm i -g appium @appium/driver-xcuitest"
fi

# Boot simulator
log "Booting iOS Simulator: ${IOS_DEVICE_NAME}"
BOOTED_ID=$(xcrun simctl list devices | awk -v name="$IOS_DEVICE_NAME" '$0 ~ name {print $2}' | tr -d '()' | head -n1)
if [[ -z "${BOOTED_ID}" ]]; then
  # Create a new device (fallback)
  RUNTIME=$(xcrun simctl list runtimes | awk '/iOS/ && /available/ {print $2}' | sort | tail -n1)
  [[ -z "$RUNTIME" ]] && die "No iOS runtime found"
  BOOTED_ID=$(xcrun simctl create "$IOS_DEVICE_NAME" "com.apple.CoreSimulator.SimDeviceType.${IOS_DEVICE_NAME// /-}" "$RUNTIME")
fi

# Try boot; ignore error if already booted
open -a Simulator || true
xcrun simctl boot "$BOOTED_ID" || true

# Install app if path provided
if [[ -n "$IOS_APP" ]]; then
  [[ -d "$IOS_APP" ]] || die "IOS_APP does not exist or is not a .app bundle: $IOS_APP"
  log "Installing app: $IOS_APP"
  xcrun simctl install booted "$IOS_APP" || die "Failed to install app"
fi

# Build server if needed
cd "$ROOT_DIR"
if [[ ! -d node_modules ]]; then
  log "Installing npm dependencies"
  npm ci || npm install
fi
if [[ ! -d dist ]]; then
  log "Building TypeScript"
  npm run build
fi

# Start Appium (if not already listening)
APPIUM_HOST=$(python3 - <<PY
import os,sys
from urllib.parse import urlparse
u=urlparse(os.environ.get('APPIUM_URL','http://127.0.0.1:4723'))
print(u.hostname or '127.0.0.1')
PY
)
APPIUM_PORT=$(python3 - <<PY
import os,sys
from urllib.parse import urlparse
u=urlparse(os.environ.get('APPIUM_URL','http://127.0.0.1:4723'))
print(u.port or 4723)
PY
)

if ! nc -z "$APPIUM_HOST" "$APPIUM_PORT" >/dev/null 2>&1; then
  log "Starting Appium at $APPIUM_HOST:$APPIUM_PORT"
  (appium --base-path /wd/hub --address "$APPIUM_HOST" --port "$APPIUM_PORT" >/dev/null 2>&1 & echo $! > .appium.pid)
  sleep 2
fi

export APPIUM_URL IOS_DEVICE_NAME IOS_PLATFORM_VERSION IOS_APP IOS_BUNDLE_ID FLUTTER_VM_SERVICE_URL

log "Starting MCP server (stdio)"
node --enable-source-maps dist/index.js

