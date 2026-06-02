// helio-app/backend/src/routes/ping.ts
import { Router } from 'express';
import { createConnection } from 'net';
import https from 'https';
import type { PingRequest, PingResult } from '../types.js';

export const pingRouter = Router();

function tcpPing(host: string, port: number, timeoutMs: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const socket = createConnection({ host, port });
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(Date.now() - start);
    });
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('timeout'));
    });
    socket.on('error', reject);
  });
}

function httpsPing(url: string, timeoutMs: number): Promise<{ latency: number; status: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = https.request(url, { method: 'HEAD', rejectUnauthorized: false }, (res) => {
      resolve({ latency: Date.now() - start, status: res.statusCode ?? 0 });
      res.resume();
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function httpPing(url: string, timeoutMs: number): Promise<{ latency: number; status: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    return { latency: Date.now() - start, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

pingRouter.post('/', async (req, res) => {
  const { type, host, port, path: urlPath = '/' } = req.body as PingRequest;

  if (!type || !host || !port) {
    res.status(400).json({ error: 'type, host, and port are required' });
    return;
  }

  const TIMEOUT = 5000;
  const result: PingResult = { reachable: false, latency_ms: 0 };

  try {
    if (type === 'tcp') {
      result.latency_ms = await tcpPing(host, port, TIMEOUT);
      result.reachable = true;
    } else if (type === 'https') {
      const url = `https://${host}:${port}${urlPath}`;
      const { latency, status } = await httpsPing(url, TIMEOUT);
      result.latency_ms = latency;
      result.status = status;
      result.reachable = status > 0;
    } else {
      const url = `http://${host}:${port}${urlPath}`;
      const { latency, status } = await httpPing(url, TIMEOUT);
      result.latency_ms = latency;
      result.status = status;
      result.reachable = status > 0;
    }
  } catch (err) {
    result.reachable = false;
    result.error = err instanceof Error ? err.message : 'unknown error';
  }

  res.json(result);
});
