// helio-app/backend/src/routes/nodes.ts
import { Router } from 'express';
import { getDb } from '../db/index.js';
import type { Node } from '../types.js';

export const nodesRouter = Router();

nodesRouter.get('/', (_req, res) => {
  const db = getDb();
  const nodes = db.prepare('SELECT * FROM nodes').all() as Node[];
  res.json(nodes);
});
