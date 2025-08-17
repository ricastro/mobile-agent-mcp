import WebSocket from 'ws';

interface RpcRequest {
  id: number;
  method: string;
  params?: Record<string, any>;
}

let ws: WebSocket | null = null;
let nextId = 1;

async function sendRpc(method: string, params?: Record<string, any>): Promise<any> {
  if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('VM Service not connected');
  const id = nextId++;
  const req: RpcRequest = { id, method, params };
  return new Promise((resolve, reject) => {
    const handler = (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws?.off('message', handler);
          if (msg.error) reject(new Error(msg.error.message || 'RPC error'));
          else resolve(msg.result);
        }
      } catch (e) {
        ws?.off('message', handler);
        reject(e);
      }
    };
    ws!.on('message', handler);
    ws!.send(JSON.stringify(req));
  });
}

export async function connectVmService(url: string) {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  ws = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    ws!.once('open', () => resolve());
    ws!.once('error', (e) => reject(e));
  });
}

export async function getWidgetTree(): Promise<any> {
  // ext.flutter.inspector.getRootWidgetSummaryTree
  const res = await sendRpc('ext.flutter.inspector.getRootWidgetSummaryTree', { objectGroup: 'mcp' });
  return res;
}

export async function flutterScreenshot(): Promise<string> {
  // Some runtimes expose ext.flutter.screenshot; if not, fallback to empty
  try {
    const res = await sendRpc('ext.flutter.screenshot');
    // returns { data: <base64> }
    return res?.data as string;
  } catch {
    return '';
  }
}

