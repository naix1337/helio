// helio-app/backend/tests/queries.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { buildQueries } from '../src/db/queries.js';

// Inline the schema so tests are self-contained
function buildTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL, cpu REAL NOT NULL,
      mem_used INTEGER NOT NULL, mem_total INTEGER NOT NULL,
      disk_json TEXT NOT NULL, net_json TEXT NOT NULL
    );
    CREATE INDEX idx_metrics_ts ON metrics(ts);
    CREATE TABLE alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, metric TEXT NOT NULL, operator TEXT NOT NULL,
      threshold REAL NOT NULL, channel TEXT NOT NULL, target TEXT NOT NULL,
      cooldown INTEGER DEFAULT 15, enabled INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE alert_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
      triggered_at INTEGER NOT NULL, resolved_at INTEGER,
      peak_value REAL NOT NULL
    );
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_login INTEGER
    );
    CREATE TABLE agent_tokens (
      id TEXT PRIMARY KEY,
      label TEXT,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      last_used INTEGER
    );
    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      token_id TEXT REFERENCES agent_tokens(id) ON DELETE SET NULL,
      version TEXT,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      os_info TEXT
    );
    CREATE TABLE agent_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      ts INTEGER NOT NULL,
      cpu_usage REAL,
      mem_used INTEGER,
      mem_total INTEGER,
      disk_json TEXT,
      net_json TEXT,
      docker_json TEXT
    );
    CREATE TABLE ping_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'icmp',
      port INTEGER,
      interval_ms INTEGER NOT NULL DEFAULT 10000,
      timeout_ms INTEGER NOT NULL DEFAULT 3000,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE ping_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_id INTEGER NOT NULL REFERENCES ping_targets(id) ON DELETE CASCADE,
      ts INTEGER NOT NULL,
      success INTEGER NOT NULL,
      latency_ms REAL,
      status_code INTEGER,
      error TEXT,
      icmp_fallback INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

describe('insertMetric', () => {
  it('inserts a metric row and reads it back', () => {
    const db = buildTestDb();
    const { insertMetric, getLatestMetric } = buildQueries(db);
    insertMetric({
      ts: 1000, cpu: 42.5, mem: { used: 4e9, total: 16e9, percent: 25 },
      disk: [{ mount: '/', used: 10e9, size: 100e9, percent: 10 }],
      net: [{ iface: 'eth0', rx_sec: 1000, tx_sec: 500 }],
      uptime: 3600, loadAvg: [0.5, 0.4, 0.3],
    });
    const row = getLatestMetric();
    expect(row).toBeDefined();
    expect(row!.cpu).toBe(42.5);
    expect(row!.mem_used).toBe(4e9);
    db.close();
  });
});

describe('getMetricsRange', () => {
  it('returns rows within ts range', () => {
    const db = buildTestDb();
    const { insertMetric, getMetricsRange } = buildQueries(db);
    for (let i = 1; i <= 5; i++) {
      insertMetric({ ts: i * 1000, cpu: i, mem: { used: 0, total: 0, percent: 0 },
        disk: [], net: [], uptime: 0, loadAvg: [0, 0, 0] });
    }
    const rows = getMetricsRange(2000, 4000);
    expect(rows).toHaveLength(3);
    expect(rows[0].cpu).toBe(2);
    db.close();
  });
});

describe('alert queries', () => {
  it('inserts and retrieves alerts', () => {
    const db = buildTestDb();
    const { insertAlert, getAlerts } = buildQueries(db);
    insertAlert({ name: 'High CPU', metric: 'cpu', operator: '>', threshold: 90,
      channel: 'webhook', target: 'http://hook', cooldown: 10 });
    const alerts = getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].name).toBe('High CPU');
    db.close();
  });

  it('inserts alert event and retrieves latest', () => {
    const db = buildTestDb();
    const { insertAlert, insertAlertEvent, getLatestAlertEvent } = buildQueries(db);
    insertAlert({ name: 'Test', metric: 'cpu', operator: '>', threshold: 80,
      channel: 'webhook', target: 'http://x', cooldown: 15 });
    const alerts = db.prepare('SELECT id FROM alerts').all() as { id: number }[];
    const alertId = alerts[0].id;
    insertAlertEvent(alertId, 95);
    const ev = getLatestAlertEvent(alertId);
    expect(ev).toBeDefined();
    expect(ev!.peak_value).toBe(95);
    db.close();
  });
});

describe('user queries', () => {
  function buildUserDb(): Database.Database {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL, cpu REAL NOT NULL,
        mem_used INTEGER NOT NULL, mem_total INTEGER NOT NULL,
        disk_json TEXT NOT NULL, net_json TEXT NOT NULL
      );
      CREATE TABLE alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, metric TEXT NOT NULL, operator TEXT NOT NULL,
        threshold REAL NOT NULL, channel TEXT NOT NULL, target TEXT NOT NULL,
        cooldown INTEGER DEFAULT 15, enabled INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE alert_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
        triggered_at INTEGER NOT NULL, resolved_at INTEGER,
        peak_value REAL NOT NULL
      );
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        last_login INTEGER
      );
      CREATE TABLE agent_tokens (
        id TEXT PRIMARY KEY,
        label TEXT,
        token_hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        last_used INTEGER
      );
      CREATE TABLE agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        token_id TEXT REFERENCES agent_tokens(id) ON DELETE SET NULL,
        version TEXT,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'offline',
        os_info TEXT
      );
      CREATE TABLE agent_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        ts INTEGER NOT NULL,
        cpu_usage REAL,
        mem_used INTEGER,
        mem_total INTEGER,
        disk_json TEXT,
        net_json TEXT,
        docker_json TEXT
      );
      CREATE TABLE ping_targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'icmp',
        port INTEGER,
        interval_ms INTEGER NOT NULL DEFAULT 10000,
        timeout_ms INTEGER NOT NULL DEFAULT 3000,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE ping_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_id INTEGER NOT NULL REFERENCES ping_targets(id) ON DELETE CASCADE,
        ts INTEGER NOT NULL,
        success INTEGER NOT NULL,
        latency_ms REAL,
        status_code INTEGER,
        error TEXT,
        icmp_fallback INTEGER NOT NULL DEFAULT 0
      );
    `);
    return db;
  }

  it('creates a user and retrieves by email', () => {
    const db = buildUserDb();
    const q = buildQueries(db);
    q.createUser('test@example.com', 'Test User', 'hash123', 'admin');
    const user = q.getUserByEmail('test@example.com');
    expect(user).toBeDefined();
    expect(user!.name).toBe('Test User');
    expect(user!.role).toBe('admin');
    db.close();
  });

  it('countUsers returns 0 when empty and 1 after insert', () => {
    const db = buildUserDb();
    const q = buildQueries(db);
    expect(q.countUsers()).toBe(0);
    q.createUser('a@b.com', 'A', 'hash', 'viewer');
    expect(q.countUsers()).toBe(1);
    db.close();
  });

  it('getAllUsers excludes password_hash', () => {
    const db = buildUserDb();
    const q = buildQueries(db);
    q.createUser('a@b.com', 'A', 'secret', 'editor');
    const users = q.getAllUsers();
    expect(users).toHaveLength(1);
    expect((users[0] as Record<string, unknown>).password_hash).toBeUndefined();
    db.close();
  });

  it('updateUserRole changes role', () => {
    const db = buildUserDb();
    const q = buildQueries(db);
    q.createUser('a@b.com', 'A', 'h', 'viewer');
    const user = q.getUserByEmail('a@b.com')!;
    q.updateUserRole(user.id, 'editor');
    const updated = q.getUserById(user.id)!;
    expect(updated.role).toBe('editor');
    db.close();
  });

  it('deleteUser removes the row', () => {
    const db = buildUserDb();
    const q = buildQueries(db);
    q.createUser('a@b.com', 'A', 'h', 'viewer');
    const user = q.getUserByEmail('a@b.com')!;
    q.deleteUser(user.id);
    expect(q.countUsers()).toBe(0);
    db.close();
  });
});
