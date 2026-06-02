// helio-app/backend/src/db/index.ts
import { getDb } from './connection.js';
import { buildQueries } from './queries.js';

const db = getDb();
export const queries = buildQueries(db);
export { getDb };
