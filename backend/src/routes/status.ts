// helio-app/backend/src/routes/status.ts
import { Router } from 'express';
import { queries } from '../db/index.js';

export const statusRouter = Router();

statusRouter.get('/', (_req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 90 * 24 * 3600;
  const rows = queries.getMetricsRange(from, now);

  const uptime = rows.length > 0
    ? (rows.filter(r => r.cpu < 100).length / rows.length) * 100
    : 100;

  res.json({
    nodes: [],
    uptime_percent: Math.round(uptime * 100) / 100,
    incidents: [],
  });
});
