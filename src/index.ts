import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Tool, CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as Appium from './appiumClient.js';
import * as Inspector from './flutterInspector.js';

function getConfig(): Appium.AppiumConfig {
  return {
    appiumUrl: process.env.APPIUM_URL || 'http://127.0.0.1:4723',
    deviceName: process.env.IOS_DEVICE_NAME || 'iPhone 15',
    platformVersion: process.env.IOS_PLATFORM_VERSION,
    app: process.env.IOS_APP,
    bundleId: process.env.IOS_BUNDLE_ID
  };
}

const tools: Tool[] = [
  { name: 'ios.get_screenshot', description: 'Take screenshot of current screen', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'ios.get_source', description: 'Get iOS UI XML source', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'ios.tap', description: 'Tap element by selector (~accessibilityId) or x,y', inputSchema: { type: 'object', properties: { selector: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' } }, additionalProperties: false } },
  { name: 'ios.type_text', description: 'Type text into focused element', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false } },
  { name: 'ios.wait_for', description: 'Wait for element with selector (~accessibilityId)', inputSchema: { type: 'object', properties: { selector: { type: 'string' }, timeoutMs: { type: 'number' } }, required: ['selector'], additionalProperties: false } },
  { name: 'ios.swipe', description: 'Swipe by direction or coordinates', inputSchema: { type: 'object', properties: { fromX: { type: 'number' }, fromY: { type: 'number' }, toX: { type: 'number' }, toY: { type: 'number' }, direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] }, distance: { type: 'number' } }, additionalProperties: false } },
  { name: 'ios.launch_app', description: 'Launch app by bundleId', inputSchema: { type: 'object', properties: { bundleId: { type: 'string' } }, required: ['bundleId'], additionalProperties: false } },
  { name: 'ios.terminate_app', description: 'Terminate app by bundleId', inputSchema: { type: 'object', properties: { bundleId: { type: 'string' } }, required: ['bundleId'], additionalProperties: false } },
  { name: 'flutter.get_widget_tree', description: 'Get Flutter widget summary tree via VM Service', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'flutter.screenshot', description: 'Take Flutter-rendered screenshot via VM Service', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }
  ,
  { name: 'orchestrate.bootstrap', description: 'Boot simulator, install app, start Appium, ensure session', inputSchema: { type: 'object', properties: { deviceName: { type: 'string' }, appPath: { type: 'string' }, bundleId: { type: 'string' }, platformVersion: { type: 'string' }, appiumUrl: { type: 'string' }, vmServiceUrl: { type: 'string' } }, additionalProperties: false } },
  { name: 'ios.health', description: 'Check simulator/Appium/session/VM Service health', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }
];

const server = new Server(
  {
    name: 'mobile-agent-mcp',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register tools list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const cfg = getConfig();
  try {
    switch (req.params.name) {
      case 'ios.get_screenshot': {
        await Appium.ensureSession(cfg);
        const base64Png = await Appium.screenshot(cfg);
        return { content: [{ type: 'text', text: JSON.stringify({ base64Png }) }] };
      }
      case 'ios.get_source': {
        await Appium.ensureSession(cfg);
        const xml = await Appium.getSource(cfg);
        return { content: [{ type: 'text', text: xml }] };
      }
      case 'ios.tap': {
        await Appium.ensureSession(cfg);
        const { selector, x, y } = (req.params.arguments || {}) as any;
        await Appium.tap(cfg, { selector, x, y });
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] };
      }
      case 'ios.type_text': {
        await Appium.ensureSession(cfg);
        const { text } = (req.params.arguments || {}) as any;
        await Appium.typeText(cfg, String(text));
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] };
      }
      case 'ios.wait_for': {
        await Appium.ensureSession(cfg);
        const { selector, timeoutMs } = (req.params.arguments || {}) as any;
        const found = await Appium.waitFor(cfg, String(selector), timeoutMs ? Number(timeoutMs) : 10000);
        return { content: [{ type: 'text', text: JSON.stringify({ found }) }] };
      }
      case 'ios.swipe': {
        await Appium.ensureSession(cfg);
        await Appium.swipe(cfg, (req.params.arguments || {}) as any);
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] };
      }
      case 'ios.launch_app': {
        await Appium.ensureSession(cfg);
        const { bundleId } = (req.params.arguments || {}) as any;
        await Appium.launchApp(cfg, String(bundleId));
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] };
      }
      case 'ios.terminate_app': {
        await Appium.ensureSession(cfg);
        const { bundleId } = (req.params.arguments || {}) as any;
        await Appium.terminateApp(cfg, String(bundleId));
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] };
      }
      case 'flutter.get_widget_tree': {
        const url = process.env.FLUTTER_VM_SERVICE_URL;
        if (!url) throw new Error('FLUTTER_VM_SERVICE_URL not set');
        await Inspector.connectVmService(url);
        const tree = await Inspector.getWidgetTree();
        return { content: [{ type: 'text', text: JSON.stringify(tree) }] };
      }
      case 'flutter.screenshot': {
        const url = process.env.FLUTTER_VM_SERVICE_URL;
        if (!url) throw new Error('FLUTTER_VM_SERVICE_URL not set');
        await Inspector.connectVmService(url);
        const base64Png = await Inspector.flutterScreenshot();
        return { content: [{ type: 'text', text: JSON.stringify({ base64Png }) }] };
      }
      case 'orchestrate.bootstrap': {
        const args = (req.params.arguments || {}) as any;
        if (args.deviceName) process.env.IOS_DEVICE_NAME = args.deviceName;
        if (args.appPath) process.env.IOS_APP = args.appPath;
        if (args.bundleId) process.env.IOS_BUNDLE_ID = args.bundleId;
        if (args.platformVersion) process.env.IOS_PLATFORM_VERSION = args.platformVersion;
        if (args.appiumUrl) process.env.APPIUM_URL = args.appiumUrl;
        if (args.vmServiceUrl) process.env.FLUTTER_VM_SERVICE_URL = args.vmServiceUrl;
        const result = await bootstrap();
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }
      case 'ios.health': {
        const result = await health();
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }
      default:
        throw new Error(`Unknown tool: ${req.params.name}`);
    }
  } catch (e: any) {
    return { isError: true, content: [{ type: 'text', text: `Error: ${e?.message || e}` }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

// ==== Orchestration & Health Helpers ====
import { exec as _exec } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(_exec);

let appiumChild: import('node:child_process').ChildProcess | null = null;

async function pingAppium(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const statusUrl = `${u.origin}${u.pathname === '/' ? '' : u.pathname}/status`;
    const res = await fetch(statusUrl, { method: 'GET' });
    return res.ok;
  } catch { return false; }
}

async function startAppiumIfNeeded(url: string) {
  const ok = await pingAppium(url);
  if (ok) return;
  const u = new URL(url);
  const args = ['--base-path', '/wd/hub', '--address', u.hostname, '--port', String(u.port || 4723)];
  appiumChild = await new Promise(async (resolve) => {
    const child = (await import('node:child_process')).spawn('appium', args, { stdio: 'ignore', detached: true });
    setTimeout(() => resolve(child), 1500);
  });
}

async function bootSimulator(deviceName: string) {
  try { await exec('open -a Simulator'); } catch {}
  try { await exec(`xcrun simctl boot "${deviceName}"`); } catch {}
}

async function installApp(appPath: string) {
  await exec(`xcrun simctl install booted "${appPath}"`);
}

async function isSimulatorBooted(): Promise<boolean> {
  try {
    const { stdout } = await exec('xcrun simctl list devices booted');
    return stdout.includes('Booted');
  } catch { return false; }
}

async function bootstrap() {
  const cfg = getConfig();
  await bootSimulator(cfg.deviceName);
  if (cfg.app) await installApp(cfg.app);
  await startAppiumIfNeeded(cfg.appiumUrl);
  // Ensure session ready
  await Appium.ensureSession(cfg);
  return { ok: true };
}

async function health() {
  const cfg = getConfig();
  const simulatorBooted = await isSimulatorBooted();
  const appiumReachable = await pingAppium(cfg.appiumUrl);
  let sessionOk = false;
  try { await Appium.ensureSession(cfg); sessionOk = true; } catch { sessionOk = false; }
  let vmServiceConnected = false;
  if (process.env.FLUTTER_VM_SERVICE_URL) {
    try { await Inspector.connectVmService(process.env.FLUTTER_VM_SERVICE_URL!); vmServiceConnected = true; } catch { vmServiceConnected = false; }
  }
  return { simulatorBooted, appiumReachable, sessionOk, vmServiceConnected };
}
