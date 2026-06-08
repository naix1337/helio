// helio-app/backend/src/ws/metricsWs.ts
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { URL } from 'url';
import type { WsMessage } from '../types.js';
import { verifyToken } from '../middleware/auth.js';

const clients = new Set<WebSocket>();
let wss: WebSocketServer | null = null;

export function attachWebSocket(server: Server): void {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const raw = req.url ?? '';
    if (!raw.startsWith('/ws')) {
      socket.destroy();
      return;
    }

    // Validate JWT passed as ?token=<jwt> (browsers cannot send custom headers)
    const base = `http://${req.headers.host ?? 'localhost'}`;
    const { searchParams } = new URL(raw, base);
    const token = searchParams.get('token') ?? '';
    if (!verifyToken(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss!.handleUpgrade(req, socket, head, (ws) => {
      wss!.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsMessage;
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  setInterval(() => {
    for (const ws of clients) {
      if (ws.readyState !== WebSocket.OPEN) {
        clients.delete(ws);
      }
    }
  }, 30_000);
}

export function wsBroadcast(msg: { type: string; data?: unknown }): void {
  const payload = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function getClientCount(): number {
  return clients.size;
}
