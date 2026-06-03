// helio-app/backend/src/db/connection.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.HELIO_DB_PATH ?? path.join(process.cwd(), 'helio.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  try {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    applySchema(_db);
    return _db;
  } catch (err) {
    console.error(`[DB] Cannot open database at ${DB_PATH}:`, err);
    process.exit(1);
  }
}

function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ts        INTEGER NOT NULL,
      cpu       REAL NOT NULL,
      mem_used  INTEGER NOT NULL,
      mem_total INTEGER NOT NULL,
      disk_json TEXT NOT NULL,
      net_json  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts);

    CREATE TRIGGER IF NOT EXISTS metrics_cleanup
      AFTER INSERT ON metrics
      BEGIN
        DELETE FROM metrics WHERE id NOT IN (
          SELECT id FROM metrics ORDER BY ts DESC LIMIT 17280
        );
      END;

    CREATE TABLE IF NOT EXISTS nodes (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      addr      TEXT NOT NULL,
      token     TEXT NOT NULL,
      last_seen INTEGER,
      status    TEXT DEFAULT 'unknown'
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      metric     TEXT NOT NULL,
      operator   TEXT NOT NULL,
      threshold  REAL NOT NULL,
      channel    TEXT NOT NULL,
      target     TEXT NOT NULL,
      cooldown   INTEGER DEFAULT 15,
      enabled    INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS alert_events (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id     INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
      triggered_at INTEGER NOT NULL,
      resolved_at  INTEGER,
      peak_value   REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('app_title',            'Helio'),
      ('status_title',         'System Status'),
      ('status_subtitle',      'Echtzeit-Überwachung aller Systeme'),
      ('status_show_uptime',   'true'),
      ('dashboard_show_cpu',   'true'),
      ('dashboard_show_ram',   'true'),
      ('dashboard_show_nodes', 'true');

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'viewer',
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      last_login    INTEGER
    );
  `);
}
