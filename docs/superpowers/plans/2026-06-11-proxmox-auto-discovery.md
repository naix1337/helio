# Proxmox LXC/VM Auto-Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic detection of LXC containers and QEMU VMs from a Proxmox VE server, creating corresponding Helio Agents automatically.

**Architecture:** A `ProxmoxCollector` in the backend polls the Proxmox REST API (port 8006) at a configurable interval, creates/updates Agents for each discovered container/VM, and broadcasts changes via WebSocket. Frontend integrates a connection management panel into the existing Nodes page.

**Tech Stack:** Node.js/Express/TypeScript, better-sqlite3, Zustand, React 18

---

### Task 1: DB Migration 006_proxmox.sql

**Files:**
- Create: `backend/src/db/migrations/006_proxmox.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Migration 006: Proxmox connection and resource tables
-- Supports automatic discovery of LXC containers and QEMU VMs

CREATE TABLE IF NOT EXISTS proxmox_connections (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  host             TEXT NOT NULL,
  port             INTEGER NOT NULL DEFAULT 8006,
  node_name        TEXT,
  api_token_id     TEXT NOT NULL,
  api_token_secret TEXT NOT NULL,
  verify_ssl       INTEGER NOT NULL DEFAULT 0,
  poll_interval_s  INTEGER NOT NULL DEFAULT 300,
  enabled          INTEGER NOT NULL DEFAULT 1,
  last_sync        INTEGER,
  created_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS proxmox_resources (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id   INTEGER NOT NULL REFERENCES proxmox_connections(id) ON DELETE CASCADE,
  resource_type   TEXT NOT NULL,
  vmid            INTEGER NOT NULL,
  name            TEXT NOT NULL,
  agent_id        TEXT REFERENCES agents(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'running',
  last_seen       INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  UNIQUE(connection_id, resource_type, vmid)
);
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/db/migrations/006_proxmox.sql
git commit -m "feat(db): add proxmox_connections and proxmox_resources tables"

Co-Authored-By: Claude Code <noreply@anthropic.com>
```

---

### Task 2: Proxmox Types

**Files:**
- Modify: `backend/src/types.ts` (add Proxmox types)
- Modify: `frontend/src/types.ts` (add matching Proxmox + WS types)

- [ ] **Step 1: Add Proxmox types to backend/types.ts**

Add before the closing of the file (before the existing `WsMessage` type, add these interfaces):

```ts
// ── Proxmox types ───────────────────────────────────────────────────────────

export interface ProxmoxConnection {
  id: number;
  name: string;
  host: string;
  port: number;
  nodeName: string | null;
  apiTokenId: string;
  apiTokenSecret: string;  // encrypted in DB
  verifySsl: boolean;
  pollIntervalS: number;
  enabled: boolean;
  lastSync: number | null;
  createdAt: number;
}

export interface ProxmoxResource {
  id: number;
  connectionId: number;
  resourceType: 'lxc' | 'qemu';
  vmid: number;
  name: string;
  agentId: string | null;
  status: string;
  lastSeen: number;
  createdAt: number;
}

export interface ProxmoxConnectionFormData {
  name: string;
  host: string;
  port: number;
  apiTokenId: string;
  apiTokenSecret: string;
  verifySsl: boolean;
  pollIntervalS: number;
}
```

Update `WsMessage.type` union to include the new types:

```ts
export interface WsMessage {
  type: 'metrics' | 'alert' | 'ping' | 'pong' 
      | 'agent_update' | 'agent_offline' | 'ping_update'
      | 'proxmox_update' | 'agent_created';
  data?: SystemSnapshot | AlertFireEvent;
}
```

- [ ] **Step 2: Add the same types to frontend/src/types.ts**

Copy all the Proxmox types above to `frontend/src/types.ts`, and update `WsMessage.type` the same way.

- [ ] **Step 3: Commit**

```bash
git add backend/src/types.ts frontend/src/types.ts
git commit -m "feat(types): add Proxmox connection and resource types"
```

---

### Task 3: Queries for Proxmox Tables (backend)

**Files:**
- Modify: `backend/src/db/queries.ts`

- [ ] **Step 1: Add Proxmox query functions inside buildQueries()**

Add these prepared statements and query functions inside the `buildQueries()` function. Place them after the Ping section and before the `return {` statement.

Prepared statements:

```ts
// ── Proxmox Connections ─────────────────────────────────────────────────────

const stmtListProxmoxConnections = db.prepare<[], {
  id: number; name: string; host: string; port: number; node_name: string | null;
  api_token_id: string; api_token_secret: string; verify_ssl: number;
  poll_interval_s: number; enabled: number; last_sync: number | null; created_at: number;
}>('SELECT * FROM proxmox_connections ORDER BY created_at DESC');

const stmtGetProxmoxConnection = db.prepare<[number], {
  id: number; name: string; host: string; port: number; node_name: string | null;
  api_token_id: string; api_token_secret: string; verify_ssl: number;
  poll_interval_s: number; enabled: number; last_sync: number | null; created_at: number;
}>('SELECT * FROM proxmox_connections WHERE id = ?');

const stmtInsertProxmoxConnection = db.prepare<{
  name: string; host: string; port: number; api_token_id: string; api_token_secret: string;
  verify_ssl: number; poll_interval_s: number; enabled: number; created_at: number;
}>(`INSERT INTO proxmox_connections (name, host, port, api_token_id, api_token_secret, verify_ssl, poll_interval_s, enabled, created_at)
    VALUES (@name, @host, @port, @api_token_id, @api_token_secret, @verify_ssl, @poll_interval_s, @enabled, @created_at)`);

const stmtUpdateProxmoxConnection = db.prepare<{
  id: number; name?: string; host?: string; port?: number; node_name?: string;
  api_token_id?: string; api_token_secret?: string; verify_ssl?: number;
  poll_interval_s?: number; enabled?: number;
}>(`UPDATE proxmox_connections SET
    name = COALESCE(@name, name),
    host = COALESCE(@host, host),
    port = COALESCE(@port, port),
    node_name = COALESCE(@node_name, node_name),
    api_token_id = COALESCE(@api_token_id, api_token_id),
    api_token_secret = COALESCE(@api_token_secret, api_token_secret),
    verify_ssl = COALESCE(@verify_ssl, verify_ssl),
    poll_interval_s = COALESCE(@poll_interval_s, poll_interval_s),
    enabled = COALESCE(@enabled, enabled)
  WHERE id = @id`);

const stmtDeleteProxmoxConnection = db.prepare<[number]>(
  'DELETE FROM proxmox_connections WHERE id = ?'
);

const stmtUpdateProxmoxSync = db.prepare<{ id: number; last_sync: number }>(
  'UPDATE proxmox_connections SET last_sync = @last_sync WHERE id = @id'
);

const stmtUpdateProxmoxNodeName = db.prepare<{ id: number; node_name: string }>(
  'UPDATE proxmox_connections SET node_name = @node_name WHERE id = @id'
);

const stmtGetEnabledConnections = db.prepare<[], {
  id: number; name: string; host: string; port: number; node_name: string | null;
  api_token_id: string; api_token_secret: string; verify_ssl: number;
  poll_interval_s: number; enabled: number; last_sync: number | null; created_at: number;
}>('SELECT * FROM proxmox_connections WHERE enabled = 1');

// ── Proxmox Resources ─────────────────────────────────────────────────────

const stmtListProxmoxResources = db.prepare<[number], {
  id: number; connection_id: number; resource_type: string; vmid: number;
  name: string; agent_id: string | null; status: string;
  last_seen: number; created_at: number;
}>('SELECT * FROM proxmox_resources WHERE connection_id = ? ORDER BY resource_type, vmid');

const stmtGetProxmoxResource = db.prepare<[number, string, number], {
  id: number; connection_id: number; resource_type: string; vmid: number;
  name: string; agent_id: string | null; status: string;
  last_seen: number; created_at: number;
}>('SELECT * FROM proxmox_resources WHERE connection_id = ? AND resource_type = ? AND vmid = ?');

const stmtUpsertProxmoxResource = db.prepare<{
  connection_id: number; resource_type: string; vmid: number; name: string;
  agent_id: string | null; status: string; last_seen: number; created_at: number;
}>(`INSERT INTO proxmox_resources (connection_id, resource_type, vmid, name, agent_id, status, last_seen, created_at)
    VALUES (@connection_id, @resource_type, @vmid, @name, @agent_id, @status, @last_seen, @created_at)
    ON CONFLICT(connection_id, resource_type, vmid) DO UPDATE SET
      name = excluded.name,
      agent_id = COALESCE(excluded.agent_id, agent_id),
      status = excluded.status,
      last_seen = excluded.last_seen`);

const stmtDeleteProxmoxResource = db.prepare<[number]>(
  'DELETE FROM proxmox_resources WHERE id = ?'
);

const stmtDeleteProxmoxResourcesByConnection = db.prepare<[number]>(
  'DELETE FROM proxmox_resources WHERE connection_id = ?'
);

const stmtDeleteProxmoxResourcesNotIn = db.prepare<{ connection_id: number; ids: string }>(
  `DELETE FROM proxmox_resources WHERE connection_id = @connection_id AND id NOT IN (@ids)`
);
```

Then add the corresponding methods in the return block. Since the `return {` is at the very end of the function, add these before it:

```ts
// ── Proxmox Connections ──────────────────────────────────────────────────

listProxmoxConnections() {
  return stmtListProxmoxConnections.all();
},

getProxmoxConnection(id: number) {
  return stmtGetProxmoxConnection.get(id) ?? undefined;
},

createProxmoxConnection(data: {
  name: string; host: string; port: number;
  apiTokenId: string; apiTokenSecret: string;
  verifySsl: boolean; pollIntervalS: number;
}): number {
  const result = stmtInsertProxmoxConnection.run({
    name: data.name,
    host: data.host,
    port: data.port,
    api_token_id: data.apiTokenId,
    api_token_secret: data.apiTokenSecret,
    verify_ssl: data.verifySsl ? 1 : 0,
    poll_interval_s: data.pollIntervalS,
    enabled: 1,
    created_at: Math.floor(Date.now() / 1000),
  });
  return Number(result.lastInsertRowid);
},

updateProxmoxConnection(id: number, fields: Record<string, unknown>): void {
  stmtUpdateProxmoxConnection.run({ id, ...fields });
},

deleteProxmoxConnection(id: number): void {
  stmtDeleteProxmoxConnection.run(id);
},

updateProxmoxSyncTime(id: number): void {
  stmtUpdateProxmoxSync.run({ id, last_sync: Math.floor(Date.now() / 1000) });
},

updateProxmoxNodeName(id: number, nodeName: string): void {
  stmtUpdateProxmoxNodeName.run({ id, node_name: nodeName });
},

getEnabledProxmoxConnections() {
  return stmtGetEnabledConnections.all();
},

// ── Proxmox Resources ────────────────────────────────────────────────────

listProxmoxResources(connectionId: number) {
  return stmtListProxmoxResources.all(connectionId);
},

getProxmoxResource(connectionId: number, type: string, vmid: number) {
  return stmtGetProxmoxResource.get(connectionId, type, vmid) ?? undefined;
},

upsertProxmoxResource(data: {
  connectionId: number; resourceType: string; vmid: number; name: string;
  agentId: string | null; status: string; lastSeen: number;
}): void {
  stmtUpsertProxmoxResource.run({
    connection_id: data.connectionId,
    resource_type: data.resourceType,
    vmid: data.vmid,
    name: data.name,
    agent_id: data.agentId,
    status: data.status,
    last_seen: data.lastSeen,
    created_at: Math.floor(Date.now() / 1000),
  });
},

deleteProxmoxResource(id: number): void {
  stmtDeleteProxmoxResource.run(id);
},

deleteProxmoxResourcesByConnection(connectionId: number): void {
  stmtDeleteProxmoxResourcesByConnection.run(connectionId);
},
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/db/queries.ts
git commit -m "feat(db): add proxmox CRUD queries"
```

---

### Task 4: Encryption Helper

**Files:**
- Create: `backend/src/crypto.ts`

- [ ] **Step 1: Create the encryption helper**

```ts
// helio-app/backend/src/crypto.ts
// AES-256-GCM encryption for sensitive values stored in DB
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function deriveKey(): Buffer {
  const envKey = process.env.HELIO_ENCRYPTION_KEY;
  if (envKey) {
    // Accept 64 hex chars (32 bytes) or use raw key
    if (envKey.length === 64 && /^[0-9a-f]{64}$/i.test(envKey)) {
      return Buffer.from(envKey, 'hex');
    }
    // Hash to 256 bits
    return crypto.createHash('sha256').update(envKey).digest();
  }
  // Fallback: derive from DB path (warning)
  const dbPath = process.env.HELIO_DB_PATH ?? './helio.db';
  console.warn('[crypto] HELIO_ENCRYPTION_KEY not set; using derived key from HELIO_DB_PATH (INSECURE)');
  return crypto.createHash('sha256').update(`helio-fallback-${dbPath}`).digest();
}

export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(encoded: string): string {
  const key = deriveKey();
  const parts = encoded.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  const [ivHex, tagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/crypto.ts
git commit -m "feat: add AES-256-GCM encryption helper for token storage"
```

---

### Task 5: ProxmoxCollector

**Files:**
- Create: `backend/src/collectors/proxmoxCollector.ts`

- [ ] **Step 1: Create the collector**

```ts
// helio-app/backend/src/collectors/proxmoxCollector.ts
// Polls Proxmox VE API to discover LXC containers and QEMU VMs,
// automatically creating/updating Agents in Helio.

import https from 'https';
import http from 'http';
import { queries } from '../db/index.js';
import { decrypt } from '../crypto.js';
import type { Queries } from '../db/queries.js';

interface ProxmoxVmStatus {
  vmid: number;
  name: string;
  status: string;
  type: 'lxc' | 'qemu';
  cpu?: number;
  mem?: number;
  maxmem?: number;
  uptime?: number;
  os_type?: string;
  arch?: string;
}

interface ConnectionConfig {
  id: number;
  host: string;
  port: number;
  nodeName: string | null;
  apiTokenId: string;
  apiTokenSecret: string;
  verifySsl: boolean;
  pollIntervalS: number;
}

function proxmoxApiCall(
  config: ConnectionConfig,
  path: string,
): Promise<{ data: ProxmoxVmStatus[] } | { error: string }> {
  return new Promise((resolve) => {
    const tokenSecret = decrypt(config.apiTokenSecret);
    const options = {
      hostname: config.host,
      port: config.port,
      path: `/api2/json${path}`,
      method: 'GET',
      headers: {
        Authorization: `PVEAPIToken=${config.apiTokenId}=${tokenSecret}`,
      },
      rejectUnauthorized: config.verifySsl,
      timeout: 10_000,
    };

    const mod = config.verifySsl ? https : https; // always https for Proxmox
    const req = mod.request(options, (res) => {
      let body = '';
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.data !== undefined) {
            resolve({ data: parsed.data });
          } else {
            resolve({ error: parsed.message ?? 'Unknown Proxmox API error' });
          }
        } catch {
          resolve({ error: 'Failed to parse Proxmox API response' });
          }
        });
    });

    req.on('error', (err: Error) => {
      resolve({ error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Proxmox API request timed out' });
    });

    req.end();
  });
}

export class ProxmoxCollector {
  private intervals = new Map<number, NodeJS.Timeout>();
  private broadcast: (msg: Record<string, unknown>) => void;
  private queries: Queries;

  constructor(q: Queries, broadcast: (msg: Record<string, unknown>) => void) {
    this.queries = q;
    this.broadcast = broadcast;
  }

  start(): void {
    const connections = this.queries.getEnabledProxmoxConnections() as Array<{
      id: number; host: string; port: number; node_name: string | null;
      api_token_id: string; api_token_secret: string; verify_ssl: number;
      poll_interval_s: number; name: string;
    }>;

    for (const row of connections) {
      this.startConnection(row);
    }
  }

  startConnection(row: {
    id: number; host: string; port: number; node_name: string | null;
    api_token_id: string; api_token_secret: string; verify_ssl: number;
    poll_interval_s: number; name: string;
  }): void {
    const config: ConnectionConfig = {
      id: row.id,
      host: row.host,
      port: row.port,
      nodeName: row.node_name,
      apiTokenId: row.api_token_id,
      apiTokenSecret: row.api_token_secret,
      verifySsl: row.verify_ssl !== 0,
      pollIntervalS: Math.max(20, Math.min(3600, row.poll_interval_s)),
    };

    // Run immediately, then on interval
    this.syncConnection(config);
    const interval = setInterval(() => this.syncConnection(config), config.pollIntervalS * 1000);
    this.intervals.set(config.id, interval);
  }

  stopConnection(connectionId: number): void {
    const existing = this.intervals.get(connectionId);
    if (existing) {
      clearInterval(existing);
      this.intervals.delete(connectionId);
    }
  }

  restartConnection(connectionId: number): void {
    this.stopConnection(connectionId);
    const row = this.queries.getProxmoxConnection(connectionId) as {
      id: number; host: string; port: number; node_name: string | null;
      api_token_id: string; api_token_secret: string; verify_ssl: number;
      poll_interval_s: number; name: string; enabled: number;
    } | undefined;
    if (row && row.enabled) {
      this.startConnection(row);
    }
  }

  async syncConnection(config: ConnectionConfig): Promise<void> {
    try {
      // Auto-detect node name if not set
      if (!config.nodeName) {
        const nodesResult = await proxmoxApiCall(config, '/nodes');
        if ('error' in nodesResult) {
          console.error(`[Proxmox] ${config.host}: node discovery failed: ${nodesResult.error}`);
          return;
        }
        const nodes = nodesResult.data as Array<{ node: string }>;
        if (nodes.length === 0) {
          console.error(`[Proxmox] ${config.host}: no nodes found`);
          return;
        }
        config.nodeName = nodes[0].node;
        this.queries.updateProxmoxNodeName(config.id, config.nodeName);
      }

      // Fetch LXC containers
      const lxcResult = await proxmoxApiCall(config, `/nodes/${config.nodeName}/lxc`);
      // Fetch QEMU VMs
      const qemuResult = await proxmoxApiCall(config, `/nodes/${config.nodeName}/qemu`);

      const allResources: ProxmoxVmStatus[] = [];

      if (!('error' in lxcResult)) {
        for (const vm of lxcResult.data) {
          allResources.push({ ...vm, type: 'lxc' });
        }
      }

      if (!('error' in qemuResult)) {
        for (const vm of qemuResult.data) {
          allResources.push({ ...vm, type: 'qemu' });
        }
      }

      if (allResources.length === 0) {
        console.warn(`[Proxmox] ${config.host}: no resources found`);
        return;
      }

      // Get existing resources from DB
      const existingResources = this.queries.listProxmoxResources(config.id) as Array<{
        id: number; resource_type: string; vmid: number; name: string;
        agent_id: string | null; status: string; last_seen: number;
      }>;

      const existingKeyed = new Map(
        existingResources.map(r => [`${r.resource_type}:${r.vmid}`, r])
      );

      const seenKeys = new Set<string>();
      const now = Math.floor(Date.now() / 1000);

      for (const res of allResources) {
        const key = `${res.type}:${res.vmid}`;
        seenKeys.add(key);
        const existing = existingKeyed.get(key);

        if (!existing) {
          // New resource — create agent + DB entry
          const agentId = `proxmox-${config.id}-${res.type}-${res.vmid}`;
          const tags = ['proxmox', res.type, `connection-${config.id}`];
          const osInfo = res.os_type ? { platform: 'proxmox', distro: res.os_type, arch: res.arch ?? 'amd64', hostname: res.name } : null;

          this.queries.upsertAgent(
            agentId,
            res.name,
            tags,
            null,       // tokenId
            null,       // version
            now,
            osInfo,
          );

          this.queries.upsertProxmoxResource({
            connectionId: config.id,
            resourceType: res.type,
            vmid: res.vmid,
            name: res.name,
            agentId,
            status: res.status,
            lastSeen: now,
          });

          // Broadcast agent_created event
          this.broadcast({
            type: 'agent_created',
            agentId,
            name: res.name,
            resourceType: res.type,
            vmid: res.vmid,
          });

          console.log(`[Proxmox] New ${res.type} ${res.vmid} (${res.name}) registered as agent ${agentId}`);
        } else {
          // Existing — update status and name
          const agentStatus = res.status === 'running' ? 'online' : 'offline';

          this.queries.upsertProxmoxResource({
            connectionId: config.id,
            resourceType: res.type,
            vmid: res.vmid,
            name: res.name,
            agentId: existing.agent_id,
            status: res.status,
            lastSeen: now,
          });

          if (existing.agent_id) {
            this.queries.setAgentStatus(existing.agent_id, agentStatus as 'online' | 'offline', now);
            this.queries.upsertAgent(
              existing.agent_id,
              res.name,
              ['proxmox', res.type, `connection-${config.id}`],
              null,
              null,
              now,
              res.os_type ? { platform: 'proxmox', distro: res.os_type, arch: res.arch ?? 'amd64', hostname: res.name } : null,
            );
          }
        }

        // Fetch and store metrics if available
        if (res.cpu !== undefined || res.mem !== undefined) {
          const agentId = existing?.agent_id ?? `proxmox-${config.id}-${res.type}-${res.vmid}`;
          this.queries.insertAgentMetricsBatch([{
            agent_id: agentId,
            ts: now,
            cpu_usage: res.cpu ?? null,
            mem_used: res.mem ?? null,
            mem_total: res.maxmem ?? null,
            disk_json: null,
            net_json: null,
            docker_json: null,
          }]);

          this.broadcast({
            type: 'agent_update',
            agentId,
            metrics: {
              timestamp: now,
              cpu: { usage: res.cpu },
              memory: { used: res.mem, total: res.maxmem },
            },
          });
        }
      }

      // Remove resources that no longer exist in Proxmox
      for (const existing of existingResources) {
        const key = `${existing.resource_type}:${existing.vmid}`;
        if (!seenKeys.has(key)) {
          if (existing.agent_id) {
            this.queries.setAgentStatus(existing.agent_id, 'offline', now);
            this.broadcast({
              type: 'agent_offline',
              agentId: existing.agent_id,
              reason: 'proxmox_removed',
            });
          }
          this.queries.deleteProxmoxResource(existing.id);
          console.log(`[Proxmox] Removed ${existing.resource_type} ${existing.vmid} — no longer in Proxmox`);
        }
      }

      // Update sync timestamp
      this.queries.updateProxmoxSyncTime(config.id);

      // Broadcast update
      const currentResources = this.queries.listProxmoxResources(config.id);
      this.broadcast({
        type: 'proxmox_update',
        connectionId: config.id,
        ts: now,
        resources: currentResources,
      });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Proxmox] Sync error for ${config.host}: ${message}`);
    }
  }

  stop(): void {
    for (const [id, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  // Force a manual scan
  async scanConnection(connectionId: number): Promise<void> {
    const row = this.queries.getProxmoxConnection(connectionId) as {
      id: number; host: string; port: number; node_name: string | null;
      api_token_id: string; api_token_secret: string; verify_ssl: number;
      poll_interval_s: number; name: string; enabled: number;
    } | undefined;

    if (!row) throw new Error('Connection not found');

    const config: ConnectionConfig = {
      id: row.id,
      host: row.host,
      port: row.port,
      nodeName: row.node_name,
      apiTokenId: row.api_token_id,
      apiTokenSecret: row.api_token_secret,
      verifySsl: row.verify_ssl !== 0,
      pollIntervalS: Math.max(20, Math.min(3600, row.poll_interval_s)),
    };

    await this.syncConnection(config);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/collectors/proxmoxCollector.ts
git commit -m "feat(collector): add ProxmoxCollector for auto-discovery of LXC/QEMU"
```

---

### Task 6: Proxmox API Routes

**Files:**
- Create: `backend/src/routes/proxmox.ts`

- [ ] **Step 1: Create the router**

```ts
// helio-app/backend/src/routes/proxmox.ts
import { Router } from 'express';
import { queries } from '../db/index.js';
import { encrypt } from '../crypto.js';
import type { ProxmoxCollector } from '../collectors/proxmoxCollector.js';

// Set via setProxmoxCollector()
let _collector: ProxmoxCollector | null = null;
export function setProxmoxCollector(c: ProxmoxCollector) { _collector = c; }

export const proxmoxRouter = Router();

// ── GET / — list all connections with resource counts ──────────────────────

proxmoxRouter.get('/', (_req, res) => {
  const rows = queries.listProxmoxConnections() as Array<{
    id: number; name: string; host: string; port: number; node_name: string | null;
    api_token_id: string; api_token_secret: string; verify_ssl: number;
    poll_interval_s: number; enabled: number; last_sync: number | null; created_at: number;
  }>;

  const result = rows.map((row) => {
    const resources = queries.listProxmoxResources(row.id) as Array<{ resource_type: string }>;
    const lxcCount = resources.filter((r) => r.resource_type === 'lxc').length;
    const qemuCount = resources.filter((r) => r.resource_type === 'qemu').length;

    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      nodeName: row.node_name,
      apiTokenId: row.api_token_id,
      apiTokenSecret: row.api_token_secret,
      verifySsl: row.verify_ssl !== 0,
      pollIntervalS: row.poll_interval_s,
      enabled: row.enabled !== 0,
      lastSync: row.last_sync,
      createdAt: row.created_at,
      resourceCounts: { lxc: lxcCount, qemu: qemuCount },
    };
  });

  res.json(result);
});

// ── POST / — create a new connection ───────────────────────────────────────

proxmoxRouter.post('/', (req, res) => {
  const { name, host, port, apiTokenId, apiTokenSecret, verifySsl, pollIntervalS } = req.body as {
    name?: string; host?: string; port?: number; apiTokenId?: string;
    apiTokenSecret?: string; verifySsl?: boolean; pollIntervalS?: number;
  };

  if (!name || !host || !apiTokenId || !apiTokenSecret) {
    res.status(400).json({ error: 'name, host, apiTokenId, and apiTokenSecret are required' });
    return;
  }

  const encrypted = encrypt(apiTokenSecret);
  const clampedInterval = Math.max(20, Math.min(3600, pollIntervalS ?? 300));

  const id = queries.createProxmoxConnection({
    name,
    host,
    port: port ?? 8006,
    apiTokenId,
    apiTokenSecret: encrypted,
    verifySsl: verifySsl ?? false,
    pollIntervalS: clampedInterval,
  });

  // Start collector for this connection
  if (_collector) {
    const row = queries.getProxmoxConnection(id) as { id: number; host: string; port: number; node_name: string | null; api_token_id: string; api_token_secret: string; verify_ssl: number; poll_interval_s: number; name: string; enabled: number };
    if (row) _collector.startConnection({
      id: row.id, host: row.host, port: row.port, node_name: row.node_name,
      api_token_id: row.api_token_id, api_token_secret: row.api_token_secret,
      verify_ssl: row.verify_ssl, poll_interval_s: row.poll_interval_s, name: row.name,
    });
  }

  res.status(201).json({ id });
});

// ── PUT /:id — update a connection ─────────────────────────────────────────

proxmoxRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = queries.getProxmoxConnection(id);
  if (!existing) {
    res.status(404).json({ error: 'Connection not found' });
    return;
  }

  const { name, host, port, apiTokenId, apiTokenSecret, verifySsl, pollIntervalS, enabled } = req.body as {
    name?: string; host?: string; port?: number; apiTokenId?: string;
    apiTokenSecret?: string; verifySsl?: boolean; pollIntervalS?: number; enabled?: boolean;
  };

  const fields: Record<string, unknown> = {};
  if (name !== undefined) fields.name = name;
  if (host !== undefined) fields.host = host;
  if (port !== undefined) fields.port = port;
  if (apiTokenId !== undefined) fields.api_token_id = apiTokenId;
  if (apiTokenSecret !== undefined) fields.api_token_secret = encrypt(apiTokenSecret);
  if (verifySsl !== undefined) fields.verify_ssl = verifySsl ? 1 : 0;
  if (pollIntervalS !== undefined) fields.poll_interval_s = Math.max(20, Math.min(3600, pollIntervalS));
  if (enabled !== undefined) fields.enabled = enabled ? 1 : 0;

  queries.updateProxmoxConnection(id, fields);

  // Restart collector if it changed
  if (_collector) _collector.restartConnection(id);

  res.json({ success: true });
});

// ── DELETE /:id — delete a connection ──────────────────────────────────────

proxmoxRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (_collector) _collector.stopConnection(id);
  queries.deleteProxmoxConnection(id);  // cascades to proxmox_resources
  res.status(204).send();
});

// ── POST /:id/test — test API connectivity ─────────────────────────────────

proxmoxRouter.post('/:id/test', async (req, res) => {
  const id = Number(req.params.id);
  const row = queries.getProxmoxConnection(id) as {
    host: string; port: number; api_token_id: string; api_token_secret: string; verify_ssl: number;
  } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Connection not found' });
    return;
  }

  try {
    const { decrypt } = await import('../crypto.js');
    const tokenSecret = decrypt(row.api_token_secret);

    // Simple API test
    const https = await import('https');
    const result = await new Promise<{ success: boolean; message?: string }>((resolve) => {
      const req2 = https.default.request(
        {
          hostname: row.host,
          port: row.port,
          path: '/api2/json/nodes',
          method: 'GET',
          headers: { Authorization: `PVEAPIToken=${row.api_token_id}=${tokenSecret}` },
          rejectUnauthorized: row.verify_ssl !== 0,
          timeout: 10_000,
        },
        (res2) => {
          let body = '';
          res2.on('data', (chunk: string) => { body += chunk; });
          res2.on('end', () => {
            if (res2.statusCode === 200) {
              resolve({ success: true, message: 'Connected successfully' });
            } else {
              resolve({ success: false, message: `HTTP ${res2.statusCode}: ${body}` });
            }
          });
        },
      );
      req2.on('error', (err: Error) => resolve({ success: false, message: err.message }));
      req2.on('timeout', () => { req2.destroy(); resolve({ success: false, message: 'Connection timed out' }); });
      req2.end();
    });

    res.json(result);
  } catch {
    res.status(500).json({ success: false, message: 'Test failed' });
  }
});

// ── POST /:id/scan — trigger manual scan ──────────────────────────────────

proxmoxRouter.post('/:id/scan', async (req, res) => {
  const id = Number(req.params.id);
  if (!_collector) {
    res.status(500).json({ error: 'Collector not initialized' });
    return;
  }

  try {
    await _collector.scanConnection(id);
    res.json({ success: true, message: 'Scan completed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// ── GET /:id/resources — list discovered resources ─────────────────────────

proxmoxRouter.get('/:id/resources', (req, res) => {
  const id = Number(req.params.id);
  const resources = queries.listProxmoxResources(id) as Array<{
    id: number; connection_id: number; resource_type: string; vmid: number;
    name: string; agent_id: string | null; status: string;
    last_seen: number; created_at: number;
  }>;

  const result = resources.map(r => ({
    id: r.id,
    connectionId: r.connection_id,
    resourceType: r.resource_type,
    vmid: r.vmid,
    name: r.name,
    agentId: r.agent_id,
    status: r.status,
    lastSeen: r.last_seen,
    createdAt: r.created_at,
  }));

  res.json(result);
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/proxmox.ts
git commit -m "feat(routes): add Proxmox CRUD API routes with test/scan endpoints"
```

---

### Task 7: Integrate into index.ts

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add imports and integrate ProxmoxCollector + routes**

Add these imports after the existing collectors/routes imports:

```ts
import { proxmoxRouter, setProxmoxCollector } from './routes/proxmox.js';
import { ProxmoxCollector } from './collectors/proxmoxCollector.js';
```

Add the route after the existing routes:

```ts
app.use('/api/proxmox', requireRole('admin'), proxmoxRouter);
```

Add collector initialization after ping collector:

```ts
const proxmoxCollector = new ProxmoxCollector(queries, wsBroadcast);
setProxmoxCollector(proxmoxCollector);
```

In the `server.listen` callback, start the proxmox collector:

```ts
pingCollector.start();
proxmoxCollector.start();  // Add this line
await collect();
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: integrate ProxmoxCollector and routes into server"
```

---

### Task 8: Frontend Proxmox Store

**Files:**
- Create: `frontend/src/store/proxmoxStore.ts`

- [ ] **Step 1: Create Zustand store**

```ts
// helio-app/frontend/src/store/proxmoxStore.ts
import { create } from 'zustand';
import type { ProxmoxConnection, ProxmoxResource, ProxmoxConnectionFormData } from '../types.ts';

interface ProxmoxStore {
  connections: ProxmoxConnection[];
  resources: Record<number, ProxmoxResource[]>;
  loading: boolean;
  fetchConnections: () => Promise<void>;
  fetchResources: (connectionId: number) => Promise<void>;
  createConnection: (data: ProxmoxConnectionFormData) => Promise<number>;
  updateConnection: (id: number, data: Partial<ProxmoxConnectionFormData & { enabled: boolean }>) => Promise<void>;
  deleteConnection: (id: number) => Promise<void>;
  testConnection: (id: number) => Promise<{ success: boolean; message?: string }>;
  scanNow: (id: number) => Promise<void>;
  setResources: (connectionId: number, resources: ProxmoxResource[]) => void;
}

const API = '/api/proxmox';

function headers(): Record<string, string> {
  const token = localStorage.getItem('helio-jwt') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export const useProxmoxStore = create<ProxmoxStore>((set) => ({
  connections: [],
  resources: {},
  loading: false,

  fetchConnections: async () => {
    try {
      const res = await fetch(API, { headers: headers() });
      if (!res.ok) return;
      const data = await res.json() as ProxmoxConnection[];
      set({ connections: data });
    } catch { /* ignore */ }
  },

  fetchResources: async (connectionId) => {
    try {
      const res = await fetch(`${API}/${connectionId}/resources`, { headers: headers() });
      if (!res.ok) return;
      const data = await res.json() as ProxmoxResource[];
      set((s) => ({ resources: { ...s.resources, [connectionId]: data } }));
    } catch { /* ignore */ }
  },

  createConnection: async (data) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create connection');
    const result = await res.json() as { id: number };
    await set((s) => s.fetchConnections());
    return result.id;
  },

  updateConnection: async (id, data) => {
    await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    });
    await set((s) => s.fetchConnections());
  },

  deleteConnection: async (id) => {
    await fetch(`${API}/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    set((s) => ({
      connections: s.connections.filter((c) => c.id !== id),
      resources: { ...s.resources, [id]: [] },
    }));
  },

  testConnection: async (id) => {
    try {
      const res = await fetch(`${API}/${id}/test`, {
        method: 'POST',
        headers: headers(),
      });
      return await res.json() as { success: boolean; message?: string };
    } catch {
      return { success: false, message: 'Network error' };
    }
  },

  scanNow: async (id) => {
    await fetch(`${API}/${id}/scan`, {
      method: 'POST',
      headers: headers(),
    });
    await set((s) => s.fetchResources(id));
  },

  setResources: (connectionId, resources) =>
    set((s) => ({ resources: { ...s.resources, [connectionId]: resources } })),
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/proxmoxStore.ts
git commit -m "feat(frontend): add Proxmox Zustand store"
```

---

### Task 9: Frontend Proxmox UI Components

**Files:**
- Create: `frontend/src/components/ProxmoxConnectionForm.tsx`
- Create: `frontend/src/components/ProxmoxConnectionCard.tsx`

- [ ] **Step 1: Create ProxmoxConnectionForm (modal)**

```tsx
// helio-app/frontend/src/components/ProxmoxConnectionForm.tsx
import React, { useState } from 'react';
import { useProxmoxStore } from '../store/proxmoxStore.ts';
import type { ProxmoxConnection } from '../types.ts';

interface Props {
  connection?: ProxmoxConnection | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProxmoxConnectionForm({ connection, onClose, onSuccess }: Props) {
  const { createConnection, updateConnection, testConnection } = useProxmoxStore();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [name, setName] = useState(connection?.name ?? '');
  const [host, setHost] = useState(connection?.host ?? '');
  const [port, setPort] = useState(String(connection?.port ?? 8006));
  const [apiTokenId, setApiTokenId] = useState(connection?.apiTokenId ?? '');
  const [apiTokenSecret, setApiTokenSecret] = useState('');
  const [verifySsl, setVerifySsl] = useState(connection?.verifySsl ?? false);
  const [pollInterval, setPollInterval] = useState(String(connection?.pollIntervalS ?? 300));

  async function handleSave() {
    if (!name.trim() || !host.trim() || !apiTokenId.trim()) return;
    if (!connection && !apiTokenSecret.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        host: host.trim(),
        port: Number(port) || 8006,
        apiTokenId: apiTokenId.trim(),
        apiTokenSecret: apiTokenSecret.trim() || connection?.apiTokenSecret ?? '',
        verifySsl,
        pollIntervalS: Math.max(20, Math.min(3600, Number(pollInterval) || 300)),
      };

      if (connection) {
        // Only send secret if changed
        const updatePayload: Record<string, unknown> = { ...payload };
        if (!apiTokenSecret.trim()) delete updatePayload.apiTokenSecret;
        await updateConnection(connection.id, updatePayload);
      } else {
        await createConnection(payload);
      }
      onSuccess();
    } catch {
      // error handled by store
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!connection) return;
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(connection.id);
    setTestResult(result);
    setTesting(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '24px', width: '480px', maxWidth: '90vw',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px' }}>
          {connection ? 'Proxmox Verbindung bearbeiten' : 'Proxmox Verbindung hinzufügen'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-dim)' }}>Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)' }}
              placeholder="z.B. Proxmox Hauptserver" />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-dim)' }}>Host *</label>
              <input value={host} onChange={(e) => setHost(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)' }}
                placeholder="192.168.1.10" />
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-dim)' }}>Port</label>
              <input value={port} onChange={(e) => setPort(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)' }}
                placeholder="8006" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-dim)' }}>API Token ID *</label>
            <input value={apiTokenId} onChange={(e) => setApiTokenId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)' }}
              placeholder="root@pam!helio" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-dim)' }}>
              API Token Secret {connection ? '(leer lassen = unverändert)' : '*'}
            </label>
            <input type="password" value={apiTokenSecret} onChange={(e) => setApiTokenSecret(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)' }}
              placeholder={connection ? '••••••••' : 'XXXXXXXX-...-XXXXXXXXXXXX'} />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-dim)' }}>
                Scan-Intervall (Sekunden, min 20 – max 3600)
              </label>
              <input type="number" min={20} max={3600} value={pollInterval}
                onChange={(e) => setPollInterval(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '20px' }}>
              <input type="checkbox" id="verifySsl" checked={verifySsl}
                onChange={(e) => setVerifySsl(e.target.checked)} />
              <label htmlFor="verifySsl" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>SSL verify</label>
            </div>
          </div>

          {testResult && (
            <div style={{
              padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.82rem',
              background: testResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: testResult.success ? 'var(--ok)' : '#ef4444',
            }}>
              {testResult.success ? '✅ ' : '❌ '}{testResult.message ?? (testResult.success ? 'Verbunden' : 'Fehler')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <div>
            {connection && (
              <button onClick={handleTest} disabled={testing}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem' }}>
                {testing ? 'Teste...' : 'Verbindung testen'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem' }}>
              Abbrechen
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--primary)', color: 'var(--primary-fg)', cursor: 'pointer', fontWeight: 540, fontSize: '0.82rem' }}>
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProxmoxConnectionCard**

```tsx
// helio-app/frontend/src/components/ProxmoxConnectionCard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProxmoxStore } from '../store/proxmoxStore.ts';
import { ProxmoxConnectionForm } from './ProxmoxConnectionForm.tsx';

function relativeTime(ts: number | null): string {
  if (!ts) return 'nie';
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

const pulseKeyframes = `
@keyframes helio-pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
}
`;

function StatusDot({ online }: { online: boolean }) {
  return (
    <span style={{
      width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0, display: 'inline-block',
      background: online ? 'var(--ok)' : 'var(--text-dim)',
      animation: online ? 'helio-pulse-green 2s infinite' : 'none',
    }} />
  );
}

export function ProxmoxConnectionCard() {
  const { connections, resources, fetchConnections, fetchResources, scanNow, deleteConnection } = useProxmoxStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingConn, setEditingConn] = useState<number | null>(null);
  const [scanning, setScanning] = useState<number | null>(null);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    for (const conn of connections) {
      fetchResources(conn.id);
    }
  }, [connections, fetchResources]);

  if (connections.length === 0) return null;

  return (
    <>
      <style>{pulseKeyframes}</style>

      {connections.map((conn) => {
        const connResources = resources[conn.id] ?? [];
        const lxcCount = connResources.filter((r) => r.resourceType === 'lxc').length;
        const qemuCount = connResources.filter((r) => r.resourceType === 'qemu').length;
        const isOnline = conn.lastSync && (Date.now() / 1000 - conn.lastSync) < conn.pollIntervalS * 3;

        return (
          <div key={conn.id} style={{
            border: '2px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '16px',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'var(--primary)', color: 'var(--primary-fg)',
              padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusDot online={isOnline} />
                🔗 Proxmox – {conn.name}
                <span style={{ fontSize: '0.72rem', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>
                  ({conn.host}:{conn.port})
                </span>
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={async () => {
                    setScanning(conn.id);
                    try { await scanNow(conn.id); } finally { setScanning(null); }
                  }}
                  disabled={scanning === conn.id}
                  style={{
                    fontSize: '0.72rem', padding: '3px 10px', borderRadius: 'var(--radius)',
                    border: 'none', background: 'rgba(255,255,255,0.2)', color: 'var(--primary-fg)',
                    cursor: 'pointer',
                  }}
                >
                  {scanning === conn.id ? 'Scanne...' : 'Jetzt scannen'}
                </button>
                <button
                  onClick={() => setEditingConn(conn.id)}
                  style={{
                    fontSize: '0.72rem', padding: '3px 10px', borderRadius: 'var(--radius)',
                    border: 'none', background: 'rgba(255,255,255,0.2)', color: 'var(--primary-fg)',
                    cursor: 'pointer',
                  }}
                >
                  Einstellungen
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Verbindung löschen?')) await deleteConnection(conn.id);
                  }}
                  style={{
                    fontSize: '0.72rem', padding: '3px 10px', borderRadius: 'var(--radius)',
                    border: 'none', background: 'rgba(239,68,68,0.3)', color: 'var(--primary-fg)',
                    cursor: 'pointer',
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-soft)' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.82rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>Letzter Sync: {relativeTime(conn.lastSync)}</span>
                <span style={{ color: 'var(--text-dim)' }}>Polling: alle {conn.pollIntervalS}s</span>
                <span style={{ color: 'var(--text-dim)' }}>
                  {lxcCount} LXC · {qemuCount} QEMU
                </span>
              </div>

              {connResources.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.82rem', padding: '8px 0' }}>
                  Keine Ressourcen gefunden. Scan ausführen...
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-dim)', fontWeight: 500, width: '60px' }}>VM/CT</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-dim)', fontWeight: 500 }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-dim)', fontWeight: 500, width: '60px' }}>Typ</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-dim)', fontWeight: 500, width: '80px' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-dim)', fontWeight: 500 }}>Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connResources.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{r.vmid}</td>
                        <td style={{ padding: '6px 8px' }}>{r.name}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{
                            background: r.resourceType === 'lxc' ? 'var(--primary-soft)' : '#8b5cf6',
                            color: r.resourceType === 'lxc' ? 'var(--primary)' : 'white',
                            padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem',
                          }}>
                            {r.resourceType === 'lxc' ? 'LXC' : 'QEMU'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {r.status === 'running' ? '🟢 running' : r.status === 'stopped' ? '🔴 stopped' : `⚪ ${r.status}`}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {r.agentId ? (
                            <span
                              onClick={() => navigate('/dashboard/agents/' + r.agentId)}
                              style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none' }}
                            >
                              {r.name} ↗
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Edit form modal */}
            {editingConn === conn.id && (
              <ProxmoxConnectionForm
                connection={conn}
                onClose={() => setEditingConn(null)}
                onSuccess={() => { setEditingConn(null); fetchConnections(); }}
              />
            )}
          </div>
        );
      })}

      {/* Add new form modal */}
      {showForm && (
        <ProxmoxConnectionForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchConnections(); }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ProxmoxConnectionForm.tsx frontend/src/components/ProxmoxConnectionCard.tsx
git commit -m "feat(frontend): add ProxmoxConnectionCard and ProxmoxConnectionForm components"
```

---

### Task 10: Integrate Proxmox into Nodes Page + WebSocket

**Files:**
- Modify: `frontend/src/pages/Nodes.tsx`
- Modify: `frontend/src/hooks/useMetrics.ts`

- [ ] **Step 1: Update Nodes.tsx to show Proxmox card**

Add import at top:
```tsx
import { ProxmoxConnectionCard } from '../components/ProxmoxConnectionCard.tsx';
```

Add the component before the node list:
```tsx
return (
  <>
    {/* ... existing page-header ... */}

    {/* Proxmox Connection Card - appears if connections are configured */}
    <ProxmoxConnectionCard />

    {/* ... existing node summary bar + node list ... */}
  </>
);
```

- [ ] **Step 2: Update useMetrics.ts to handle proxmox WS messages**

Add import:
```ts
import { useProxmoxStore } from '../store/proxmoxStore.ts';
```

Add store access:
```ts
const { setResources, fetchResources } = useProxmoxStore();
```

Add WS handlers in the useEffect:
```ts
} else if (type === 'proxmox_update') {
  const connectionId = msg.connectionId as number;
  const resources = msg.resources as ProxmoxResource[] | undefined;
  if (resources) {
    setResources(connectionId, resources);
  }
} else if (type === 'agent_created') {
  // Refresh agents list when a new agent is created by Proxmox
  const agentsStore = await import('../store/agentsStore.ts');
  agentsStore.useAgentsStore.getState().fetchAgents();
}
```

Note: Since we can't use top-level await, change the `agent_created` handler to just call fetchAgents imperatively. Actually, the simpler approach is to import useAgentsStore and call fetchAgents directly:

```ts
import { useAgentsStore } from '../store/agentsStore.ts';
```

And:
```ts
} else if (type === 'agent_created') {
  useAgentsStore.getState().fetchAgents();
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Nodes.tsx frontend/src/hooks/useMetrics.ts
git commit -m "feat(frontend): integrate Proxmox UI into Nodes page and WS handler"
```

---

### Task 11: Verify build

**Files:**
- Run: `cd helio-app/backend && npm run build`
- Run: `cd helio-app/frontend && npm run build`

- [ ] **Step 1: Build backend**
- [ ] **Step 2: Build frontend**
- [ ] **Step 3: Fix any TypeScript errors that arise**

---

### Task 12: Commit and push

- [ ] **Step 1: Commit all remaining changes and push**

```bash
git add -A
git commit -m "feat: complete Proxmox LXC/VM auto-discovery implementation"
git push origin main
```
