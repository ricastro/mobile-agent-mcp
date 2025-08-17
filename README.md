# Mobile Agent MCP (iOS Simulator)

An MCP server that lets an agent “see” and drive an iOS Simulator app, similar to Playwright for the web. It wraps:

- Appium 2 + XCUITest for UI control (tap/type/swipe, get source, screenshot)
- Optional Flutter VM Service Inspector for deep layout/widget tree analysis (dev builds)

This lives in its own folder so you can extract it to a separate repo later.

## Features
- get_screenshot: PNG (base64) of current simulator screen
- get_source: XML accessibility tree (XCUITest)
- tap: by accessibility id or coordinates
- type_text: type into the focused element
- wait_for: wait for selector presence
- swipe: basic directional or coordinate swipe
- launch_app / terminate_app: manage app lifecycle by bundleId
- flutter.get_widget_tree: fetch Flutter widget summary tree (dev builds)
- flutter.screenshot: Flutter-rendered screenshot (dev builds)

## Requirements
- macOS with Xcode + iOS Simulator
- Node 18+
- Appium 2: `npm i -g appium @appium/driver-xcuitest`
- Your app built for Simulator (Flutter or native)

## Install

```
cd mobile-agent-mcp
npm install
```

## Configure
Set environment variables (or create a `.env` and load as you prefer):

- APPIUM_URL: default `http://127.0.0.1:4723`
- IOS_DEVICE_NAME: e.g. `iPhone 15`
- IOS_PLATFORM_VERSION: optional (e.g. `17.5`)
- IOS_APP: path to .app for Simulator (e.g. `/path/to/Runner.app`) OR
- IOS_BUNDLE_ID: bundle id for an already installed app (e.g. `com.nutridose.app`)

Optional (Flutter inspector):
- FLUTTER_VM_SERVICE_URL: e.g. `ws://127.0.0.1:55555/xxxxxxxx=/ws`

## Run
1) Boot simulator and start Appium
```
open -a Simulator
appium
```

2) Build your app for Simulator and install (examples):
```
# Flutter
flutter build ios --simulator
# Then open Xcode or `xcrun simctl install booted /path/to/Runner.app`
```

3) Start MCP server
```
./scripts/run_ios_mcp.sh
```
The server prints a JSON object with MCP transport details to stdout (stdio transport).

## Tools (MCP)
- ios.get_screenshot: -> { base64Png }
- ios.get_source: -> { xml }
- ios.tap: { selector?: string, x?: number, y?: number } -> { ok }
- ios.type_text: { text: string } -> { ok }
- ios.wait_for: { selector: string, timeoutMs?: number } -> { found: boolean }
- ios.swipe: { fromX?: number, fromY?: number, toX?: number, toY?: number, direction?: 'up'|'down'|'left'|'right', distance?: number } -> { ok }
- ios.launch_app: { bundleId: string } -> { ok }
- ios.terminate_app: { bundleId: string } -> { ok }
- flutter.get_widget_tree: -> { tree }
- flutter.screenshot: -> { base64Png }
- orchestrate.bootstrap: { deviceName?, appPath?, bundleId?, platformVersion?, appiumUrl?, vmServiceUrl? } -> { ok }
- ios.health: -> { simulatorBooted, appiumReachable, sessionOk, vmServiceConnected }

Selectors
- Prefer accessibilityId: prefix with `~` when using WebdriverIO directly; in tools, pass raw id (we normalize to `~id`).

## Notes
- For Flutter Inspector tools, run a dev build with `flutter run` so the VM Service is available; pass its ws URL via FLUTTER_VM_SERVICE_URL.
- For reliability, only one session is managed at a time. The server lazily starts a session on first tool call.

## Roadmap
- Android support via Appium UIAutomator2
- Richer Flutter inspector actions (node selection, diagnostics, layout bounds)

## Support

If this project helps your mobile automation workflows, consider buying me a coffee! ☕

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support%20my%20work-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/ricastro)

Your support helps maintain and improve this project for the community.
