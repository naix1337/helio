// helio-app/backend/src/routes/settings.ts
import { Router } from 'express';
import { queries } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const settingsRouter = Router();

// GET is public — status page and setup wizard read settings without a token
settingsRouter.get('/', (_req, res) => {
  res.json(queries.getSettings());
});

// PUT requires admin — mutating app config is a privileged action
settingsRouter.put('/', requireAuth, requireRole('admin'), (req, res) => {
  const updates = req.body as Record<string, string>;
  const allowed = new Set([
    'app_title', 'status_title', 'status_subtitle',
    'status_show_uptime', 'dashboard_show_cpu',
    'dashboard_show_ram', 'dashboard_show_nodes',
  ]);
  for (const [key, value] of Object.entries(updates)) {
    if (allowed.has(key) && typeof value === 'string') {
      queries.setSetting(key, value);
    }
  }
  res.json(queries.getSettings());
});
