import { remote, Browser } from 'webdriverio';

export interface AppiumConfig {
  appiumUrl: string;
  deviceName: string;
  platformVersion?: string;
  app?: string;
  bundleId?: string;
}

let driver: Browser | null = null;

export async function getDriver(cfg: AppiumConfig): Promise<Browser> {
  if (driver) return driver;

  const url = new URL(cfg.appiumUrl || 'http://127.0.0.1:4723');
  const capabilities: Record<string, any> = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': cfg.deviceName,
  };
  if (cfg.platformVersion) capabilities['appium:platformVersion'] = cfg.platformVersion;
  if (cfg.app) capabilities['appium:app'] = cfg.app;
  if (cfg.bundleId) capabilities['appium:bundleId'] = cfg.bundleId;

  driver = await remote({
    hostname: url.hostname,
    port: parseInt(url.port || '4723', 10),
    path: url.pathname === '/' ? '/wd/hub' : url.pathname,
    capabilities,
    logLevel: 'error'
  });
  return driver;
}

export async function ensureSession(cfg: AppiumConfig) {
  await getDriver(cfg);
}

export async function screenshot(cfg: AppiumConfig): Promise<string> {
  const d = await getDriver(cfg);
  return d.takeScreenshot();
}

export async function getSource(cfg: AppiumConfig): Promise<string> {
  const d = await getDriver(cfg);
  return d.getPageSource();
}

export async function tap(cfg: AppiumConfig, params: { selector?: string; x?: number; y?: number }) {
  const d = await getDriver(cfg);
  if (params.selector) {
    const el = await d.$(`~${params.selector}`);
    await el.click();
    return;
  }
  if (params.x != null && params.y != null) {
    // WebdriverIO actions API
    await d.performActions([
      {
        type: 'pointer',
        id: 'touch',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: params.x!, y: params.y! },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
    await d.releaseActions();
    return;
  }
  throw new Error('tap: provide selector or x,y');
}

export async function typeText(cfg: AppiumConfig, text: string) {
  const d = await getDriver(cfg);
  await d.keys(text);
}

export async function waitFor(cfg: AppiumConfig, selector: string, timeoutMs = 10000) {
  const d = await getDriver(cfg);
  const el = await d.$(`~${selector}`);
  await el.waitForExist({ timeout: timeoutMs });
  return true;
}

export async function swipe(cfg: AppiumConfig, p: { fromX?: number; fromY?: number; toX?: number; toY?: number; direction?: 'up'|'down'|'left'|'right'; distance?: number }) {
  const d = await getDriver(cfg);
  let from = { x: p.fromX ?? 200, y: p.fromY ?? 600 };
  let to = { x: p.toX ?? 200, y: p.toY ?? 200 };
  if (p.direction) {
    const dist = p.distance ?? 300;
    switch (p.direction) {
      case 'up': to = { x: from.x, y: from.y - dist }; break;
      case 'down': to = { x: from.x, y: from.y + dist }; break;
      case 'left': to = { x: from.x - dist, y: from.y }; break;
      case 'right': to = { x: from.x + dist, y: from.y }; break;
    }
  }
  await d.performActions([
    {
      type: 'pointer', id: 'touch', parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: from.x, y: from.y },
        { type: 'pointerDown', button: 0 },
        { type: 'pointerMove', duration: 500, x: to.x, y: to.y },
        { type: 'pointerUp', button: 0 }
      ]
    }
  ]);
  await d.releaseActions();
}

export async function launchApp(cfg: AppiumConfig, bundleId: string) {
  const d = await getDriver(cfg);
  // @ts-ignore - execute driver script
  await d.execute('mobile: launchApp', { bundleId });
}

export async function terminateApp(cfg: AppiumConfig, bundleId: string) {
  const d = await getDriver(cfg);
  // @ts-ignore
  await d.execute('mobile: terminateApp', { bundleId });
}

