// helio-app/backend/src/db/connection.ts
import Database from 'better-sqlite3';
import path from 'path';
import { runMigrations } from './migrations/runner.js';

const DB_PATH = process.env.HELIO_DB_PATH ?? path.join(process.cwd(), 'helio.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  try {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runMigrations(_db);
    return _db;
  } catch (err) {
    console.error(`[DB] Cannot open database at ${DB_PATH}:`, err);
    process.exit(1);
  }
}
