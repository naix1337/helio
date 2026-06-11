# Proxmox LXC/VM Auto-Discovery

**Datum:** 2026-06-11  
**Status:** Spezifikation (v1)  
**Author:** Claude Code

## Übersicht

Automatische Erkennung von LXC-Containern und QEMU-VMs in einem Proxmox VE Server. Der Benutzer konfiguriert einmalig die Proxmox-Verbindung, danach erkennt das System automatisch alle vorhandenen und neu hinzugefügten Container/VMs und legt sie als Agents im Helio-Monitoring an.

## Architektur

**Gewählter Ansatz: Backend-Connector (Option A)**

Ein neuer `ProxmoxCollector` im Backend pollt die Proxmox REST API in einem konfigurierbaren Intervall (20s – 3600s). Er erstellt automatisch Agents für jede erkannte Ressource, aktualisiert deren Status und Metriken, und entfernt sie bei Wegfall. Kein separater Agent nötig.

```
┌─────────────────────────────────────────────────────────┐
│  Helio Backend                                          │
│                                                         │
│  setInterval (poll_interval_s)                          │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────────────┐        ┌──────────────────────┐   │
│  │ ProxmoxCollector │ ◄────► │ Proxmox REST API     │   │
│  │ (collectors/     │  443   │ https://host:8006/   │   │
│  │  proxmoxCollector│        │ api2/json/           │   │
│  │  .ts)            │        └──────────────────────┘   │
│  └───────┬──────────┘                                   │
│          │                                               │
│          ▼                                               │
│  ┌──────────────────┐        ┌──────────────────────┐   │
│  │   DB Queries     │        │  WebSocket Broadcast │   │
│  │ (proxmox tables +│        │ (proxmox_update,     │   │
│  │  agents/agent_   │        │  agent_created,      │   │
│  │  metrics)        │        │  agent_offline)      │   │
│  └──────────────────┘        └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Datenmodell

### Migration 006: proxmox_connections

```sql
CREATE TABLE IF NOT EXISTS proxmox_connections (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  host             TEXT NOT NULL,
  port             INTEGER NOT NULL DEFAULT 8006,
  node_name        TEXT,                  -- Auto-detected bei erstem Sync
  api_token_id     TEXT NOT NULL,
  api_token_secret TEXT NOT NULL,       -- AES-256 verschlüsselt
  verify_ssl       INTEGER NOT NULL DEFAULT 0,
  poll_interval_s  INTEGER NOT NULL DEFAULT 300,  -- Min: 20, Max: 3600
  enabled          INTEGER NOT NULL DEFAULT 1,
  last_sync        INTEGER,
  created_at       INTEGER NOT NULL
);
```

### Migration 006: proxmox_resources

```sql
CREATE TABLE IF NOT EXISTS proxmox_resources (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id   INTEGER NOT NULL REFERENCES proxmox_connections(id) ON DELETE CASCADE,
  resource_type   TEXT NOT NULL,          -- 'lxc' oder 'qemu'
  vmid            INTEGER NOT NULL,       -- Proxmox-interne ID (z.B. 101)
  name            TEXT NOT NULL,
  agent_id        TEXT REFERENCES agents(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'running',
  last_seen       INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  UNIQUE(connection_id, resource_type, vmid)
);
```

### API-Token-Verschlüsselung

Das `api_token_secret` wird mit AES-256-GCM verschlüsselt in der DB gespeichert. Der Schlüssel kommt aus der Umgebungsvariable `HELIO_ENCRYPTION_KEY`. Fehlt diese Variable, wird ein Fallback-Schlüssel aus einem Hash der `HELIO_DB_PATH` abgeleitet (mit Warnung im Log).

## Collector: ProxmoxCollector

**Datei:** `backend/src/collectors/proxmoxCollector.ts`

### Ablauf pro Polling-Durchlauf

1. **Alle enabled Verbindungen aus DB laden**
2. **Pro Verbindung:** Proxmox API abfragen
   - `GET /api2/json/nodes/{node}/lxc` — Liste aller LXC-Container
   - `GET /api2/json/nodes/{node}/qemu` — Liste aller QEMU-VMs
   - Für jede Ressource: `GET .../status/current` für Live-Metriken (CPU, Mem)
3. **Abgleich mit DB** (`proxmox_resources`)
   - **Neu entdeckt:** `INSERT` + Agent anlegen (`agents`-Tabelle)
   - **Vorhanden:** `UPDATE last_seen`, ggf. Name/Status updaten
   - **Verschwunden:** Agent offline setzen, `DELETE` from `proxmox_resources`
4. **WebSocket Broadcasts**
   - `{ type: 'proxmox_update', connectionId, resources: [...] }`
   - `{ type: 'agent_created', agentId, name, resourceType, vmid }`
   - `{ type: 'agent_offline', agentId, reason: 'proxmox_removed' }`
5. **`last_sync` updaten**

### Agent-Erstellungs-Logik

| Feld | Wert |
|------|------|
| `id` | `proxmox-{connection_id}-{lxc|qemu}-{vmid}` |
| `name` | Container/VM-Name aus Proxmox |
| `tags` | `["proxmox", "{lxc|qemu}", "connection-{name}"]` |
| `os_info` | Von Proxmox API (os_type, arch, etc.) |
| `status` | `online` bei running, `offline` bei stopped |
| `token_id` | `null` (nicht token-verbunden) |
| `version` | `null` |

### Metriken

Der Collector holt von der Proxmox API pro Ressource:
- CPU-Nutzung (percent)
- Memory-Nutzung (used / total)
- Uptime

Diese werden in `agent_metrics` geschrieben und per WS gebroadcastet:
`{ type: 'agent_update', agentId, metrics: { cpu, memory, ... } }`

### Node-Name Auto-Detection

Bei Single-Server Setup wird der Proxmox-Node-Name automatisch ermittelt:
1. `GET /api2/json/nodes` → liefert Array mit einem Eintrag
2. Dessen `node`-Feld wird als Node-Name für alle weiteren API-Calls verwendet
3. Wird im `proxmox_connections`-Feld `node_name` gecached (bei erstem Sync gesetzt)

### API-Token-Authentifizierung

Proxmox API authentifiziert via HTTP Header:
```
Authorization: PVEAPIToken=root@pam!helio=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

## Backend-Routen

**Datei:** `backend/src/routes/proxmox.ts`  
**Auth-Level:** Alle Endpunkte `requireRole('admin')`

```
GET    /api/proxmox                 – Alle Verbindungen (mit Status + Resource-Counts)
POST   /api/proxmox                 – Neue Verbindung anlegen
PUT    /api/proxmox/:id             – Verbindung aktualisieren
DELETE /api/proxmox/:id             – Verbindung löschen (cascaded)
POST   /api/proxmox/:id/test        – Teste API-Konnektivität
POST   /api/proxmox/:id/scan        – Manuellen Scan erzwingen
GET    /api/proxmox/:id/resources   – Erkannte Ressourcen (mit Agent-Mapping)
```

**Integration in `index.ts`:** 
```ts
import { proxmoxRouter } from './routes/proxmox.js';
app.use('/api/proxmox', requireRole('admin'), proxmoxRouter);
```

Der ProxmoxCollector wird bei Server-Start initialisiert, wenn enabled connections existieren.

## Frontend-UI

**Integration in bestehende Nodes-Seite** (`frontend/src/pages/Nodes.tsx`)

### Neue Komponenten

| Komponente | Datei | Beschreibung |
|-----------|-------|-------------|
| `ProxmoxConnectionCard` | `components/ProxmoxConnectionCard.tsx` | Status + Resource-Tabelle |
| `ProxmoxConnectionForm` | `components/ProxmoxConnectionForm.tsx` | Modal für Config |
| `ProxmoxStore` | `store/proxmoxStore.ts` | Zustand-Store |

### ProxmoxConnectionCard

Erscheint oberhalb der manuellen Node-Liste und zeigt:
- Verbindungs-Name + Host
- Status-Indikator (🟢 online / 🔴 offline) basierend auf `last_sync`
- Letzter Sync-Zeitpunkt + Polling-Intervall
- Resource-Tabelle: VMID, Name, Typ (LXC/QEMU), Status, Agent-Link
- "Einstellungen"-Button → öffnet `ProxmoxConnectionForm`
- "Jetzt scannen"-Button → triggert `POST /api/proxmox/:id/scan`
- Aufklappbare Einstellungen (Host, Port, Token-ID, Token-Secret, Poll-Intervall)

### Zustand-Store

```ts
interface ProxmoxStore {
  connections: ProxmoxConnection[];
  resources: Map<number, ProxmoxResource[]>;
  fetchConnections: () => Promise<void>;
  fetchResources: (connectionId: number) => Promise<void>;
  testConnection: (config: ProxmoxConfig) => Promise<boolean>;
  scanNow: (connectionId: number) => Promise<void>;
  createConnection: (config: ProxmoxConfig) => Promise<void>;
  updateConnection: (id: number, config: Partial<ProxmoxConfig>) => Promise<void>;
  deleteConnection: (id: number) => Promise<void>;
}
```

### WebSocket-Handler Integration

In `useWebSocket` neue `type`-Handler:
- `proxmox_update` → `proxmoxStore` + re-fetch resources
- `agent_created` → `agentsStore.fetchAgents()`
- `agent_offline` (proxmox reason) → `agentsStore.fetchAgents()`

## WebSocket-Nachrichten (neu)

```ts
interface WsMessage {
  type: 'metrics' | 'alert' | 'ping' | 'pong' 
      | 'agent_update' | 'agent_offline' | 'ping_update'
      | 'proxmox_update' | 'agent_created';  // ← neu
  // ...
}
```

- `proxmox_update`: `{ type, connectionId, ts, resources: ProxmoxResource[] }`
- `agent_created`: `{ type, agentId, name, resourceType: 'lxc'|'qemu', vmid }`

## Fehlerbehandlung

| Szenario | Verhalten |
|----------|-----------|
| Proxmox API nicht erreichbar | Log + `last_sync` bleibt alt + WS Broadcast `proxmox_error` |
| API-Token ungültig | Verbindung deaktivieren, Error ins Log |
| SSL-Zertifikat self-signed | `verify_ssl = 0` erlaubt (default) |
| Ressource verschwunden | Agent -> offline, Resource aus DB gelöscht |
| Collector-Fehler | Einzelfehler logged, polling setzt fort |
| Intervall < 20s | Auf 20s clamped |
| Intervall > 3600s | Auf 3600s clamped |

## Migration

- Neue Migration `006_proxmox.sql` im bestehenden Migrations-Runner
- Die Migration erstellt beide Tabellen idempotent (`CREATE TABLE IF NOT EXISTS`)

## Sicherheit

- API-Token-Secret wird mit AES-256-GCM verschlüsselt
- Schlüssel aus `HELIO_ENCRYPTION_KEY` env var
- Alle Proxmox-Endpunkte sind `requireRole('admin')` geschützt
- Proxmox-Verbindungen haben keinen Zugriff auf andere Serverteile

## Offene Punkte / Future

- Metriken-Polling: aktuell nur CPU/Mem beim Discovery-Durchlauf. Optional: dediziertes Metrik-Intervall (z.B. alle 30s)
- Benachrichtigungen: Alert, wenn eine neue Ressource erkannt wird
- Cluster-Support für zukünftige Multi-Node-Proxmox-Setups
