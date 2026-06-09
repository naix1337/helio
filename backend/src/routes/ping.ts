// helio-app/backend/src/routes/ping.ts
import { Router } from 'express';
import { createConnection } from 'net';
import https from 'https';
import type { PingRequest, PingResult } from '../types.js';
import type { PingCollector } from '../collectors/pingCollector.js';
import { computePingStatus } from '../collectors/pingCollector.js';
import { queries } from '../db/index.js';

// ── PingCollector singleton reference ────────────────────────────────────────

let _collector: PingCollector | null = null;

export function setPingCollector(collector: PingCollector): void {
  _collector = collector;
}

function getPingCollector(): PingCollector {
  if (!_collector) throw new Error('PingCollector not initialized');
  return _collector;
}

// ── One-shot helpers (kept for the existing POST /) ──────────────────────────

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

// ── Routers ───────────────────────────────────────────────────────────────────

export const pingRouter = Router();
const targetsRouter = Router();

// Existing one-shot endpoint (unchanged)
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

// Mount targets sub-router
pingRouter.use('/targets', targetsRouter);

// ── GET /targets ──────────────────────────────────────────────────────────────

targetsRouter.get('/', (_req, res) => {
  const rows = queries.listPingTargets();

  const enriched = rows.map((target) => {
    const last5 = queries.getLastNPingResults(target.id, 5);
    const status = computePingStatus(last5.map((r) => ({ success: r.success === 1 })));
    const last1 = queries.getLastNPingResults(target.id, 1);
    const lastPing = last1[0] ?? null;
    const stats24h = queries.getPingStats24h(target.id);

    return {
      ...target,
      tags: (() => {
        try {
          return JSON.parse(target.tags) as string[];
        } catch {
          return [] as string[];
        }
      })(),
      status,
      lastPing,
      stats24h,
    };
  });

  res.json(enriched);
});

// ── POST /targets ─────────────────────────────────────────────────────────────

targetsRouter.post('/', async (req, res) => {
  const {
    name,
    host,
    type = 'icmp',
    port = null,
    interval_ms = 60000,
    timeout_ms = 5000,
    tags = [],
  } = req.body as {
    name?: string;
    host?: string;
    type?: string;
    port?: number | null;
    interval_ms?: number;
    timeout_ms?: number;
    tags?: string[];
  };

  if (!name || !host) {
    res.status(400).json({ error: 'name and host are required' });
    return;
  }

  if (!['icmp', 'http', 'tcp'].includes(type)) {
    res.status(400).json({ error: 'type must be icmp, http, or tcp' });
    return;
  }

  if (interval_ms < 5000) {
    res.status(400).json({ error: 'interval_ms must be at least 5000' });
    return;
  }

  const newId = queries.insertPingTarget(name, host, type, port, interval_ms, timeout_ms, tags);
  const newTarget = queries.getPingTarget(newId);

  if (!newTarget) {
    res.status(500).json({ error: 'Failed to retrieve created target' });
    return;
  }

  try {
    getPingCollector().addTarget(newTarget);
  } catch {
    // Collector not yet initialized — target will be picked up on next start
  }

  res.status(201).json({
    ...newTarget,
    tags: (() => {
      try {
        return JSON.parse(newTarget.tags) as string[];
      } catch {
        return [] as string[];
      }
    })(),
  });
});

// ── PUT /targets/:id ──────────────────────────────────────────────────────────

targetsRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const existing = queries.getPingTarget(id);
  if (!existing) {
    res.status(404).json({ error: 'Target not found' });
    return;
  }

  const {
    name,
    host,
    type,
    port,
    interval_ms,
    timeout_ms,
    enabled,
    tags,
  } = req.body as Partial<{
    name: string;
    host: string;
    type: string;
    port: number | null;
    interval_ms: number;
    timeout_ms: number;
    enabled: number;
    tags: string[] | string;
  }>;

  // Validate type if provided
  if (type !== undefined && !['icmp', 'http', 'tcp'].includes(type)) {
    res.status(400).json({ error: 'type must be icmp, http, or tcp' });
    return;
  }

  // Validate interval_ms if provided
  if (interval_ms !== undefined && interval_ms < 5000) {
    res.status(400).json({ error: 'interval_ms must be at least 5000' });
    return;
  }

  // Serialize tags array to JSON string if provided as array
  const tagsField: string | undefined =
    tags !== undefined
      ? Array.isArray(tags)
        ? JSON.stringify(tags)
        : tags
      : undefined;

  const fields: Parameters<typeof queries.updatePingTarget>[1] = {};
  if (name !== undefined) fields.name = name;
  if (host !== undefined) fields.host = host;
  if (type !== undefined) fields.type = type;
  if (port !== undefined) fields.port = port;
  if (interval_ms !== undefined) fields.interval_ms = interval_ms;
  if (timeout_ms !== undefined) fields.timeout_ms = timeout_ms;
  if (enabled !== undefined) fields.enabled = enabled;
  if (tagsField !== undefined) fields.tags = tagsField;

  queries.updatePingTarget(id, fields);

  const updated = queries.getPingTarget(id);
  if (!updated) {
    res.status(500).json({ error: 'Failed to retrieve updated target' });
    return;
  }

  // If interval changed, restart the collector cycle for this target
  if (interval_ms !== undefined && interval_ms !== existing.interval_ms) {
    try {
      getPingCollector().removeTarget(id);
      getPingCollector().addTarget(updated);
    } catch {
      // Collector not yet initialized — interval change will apply on next start
    }
  }

  res.json({
    ...updated,
    tags: (() => {
      try {
        return JSON.parse(updated.tags) as string[];
      } catch {
        return [] as string[];
      }
    })(),
  });
});

// ── DELETE /targets/:id ───────────────────────────────────────────────────────

targetsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const existing = queries.getPingTarget(id);
  if (!existing) {
    res.status(404).json({ error: 'Target not found' });
    return;
  }

  queries.deletePingTarget(id);

  try {
    getPingCollector().removeTarget(id);
  } catch {
    // Collector not yet initialized — no interval to clear
  }

  res.status(204).send();
});

// ── GET /targets/:id/history ──────────────────────────────────────────────────

targetsRouter.get('/:id/history', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const target = queries.getPingTarget(id);
  if (!target) {
    res.status(404).json({ error: 'Target not found' });
    return;
  }

  const range = (req.query.range as string) ?? '24h';
  const rangeSeconds: Record<string, number> = {
    '1h': 3600,
    '6h': 21600,
    '24h': 86400,
  };
  const seconds = rangeSeconds[range] ?? rangeSeconds['24h'];
  const now = Math.floor(Date.now() / 1000);
  const from = now - seconds;

  let results = queries.getPingResultsRange(id, from, now);

  // Downsample to max 500 points
  const MAX_POINTS = 500;
  if (results.length > MAX_POINTS) {
    const step = results.length / MAX_POINTS;
    results = Array.from({ length: MAX_POINTS }, (_, i) => results[Math.floor(i * step)]);
  }

  res.json(results);
});

// ── GET /targets/:id/stats ────────────────────────────────────────────────────

targetsRouter.get('/:id/stats', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const target = queries.getPingTarget(id);
  if (!target) {
    res.status(404).json({ error: 'Target not found' });
    return;
  }

  const stats = queries.getPingStats24h(id);
  res.json(stats);
});

// ── POST /targets/:id/test ────────────────────────────────────────────────────

targetsRouter.post('/:id/test', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const target = queries.getPingTarget(id);
  if (!target) {
    res.status(404).json({ error: 'Target not found' });
    return;
  }

  try {
    const result = await getPingCollector().probe(target);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Probe failed',
    });
  }
});
