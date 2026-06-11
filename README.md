# Helio — Self-Hosted Server Monitoring

> Lightweight, open-source server monitoring with a real-time React dashboard. Runs as a single Node.js process — no cloud, no subscription, full control.

## Screenshots

| Dark Mode | Light Mode |
|-----------|------------|
| ![Dark](https://placehold.co/580x340/0B0E14/2EE0CE?text=Dashboard+Dark) | ![Light](https://placehold.co/580x340/FBFCFE/0C9C8D?text=Dashboard+Light) |

## Features

### Monitoring
- **Live metrics** — CPU, RAM, disk, network updated every 5 seconds
- **Docker monitoring** — container CPU/RAM/status (gracefully skipped if Docker isn't running)
- **Proxmox auto-discovery** — automatic detection of LXC containers and QEMU VMs via Proxmox VE API, created as Helio Agents with live metrics
- **Ping monitoring** — ICMP, TCP, and HTTP(S) health checks with configurable intervals and 24h uptime stats
- **Distributed agents** — lightweight agent package for remote hosts reporting via WebSocket with token authentication
- **Configurable alerts** — threshold rules with webhook, Slack, or Discord notifications + cooldown
- **24-hour history** — SQLite ring buffer (17,280 rows ≈ 24 h at 5 s intervals, WAL mode)
- **WebSocket streaming** — real-time push with automatic exponential-backoff reconnect

### Management
- **Role-based access** — JWT authentication with admin / editor / viewer roles
- **Team management** — multi-user support with role assignment
- **Agent management** — API tokens, agent registration, live metrics per node
- **Node CRUD** — register and monitor servers with status tracking
- **Settings page** — configurable app title, status page, dashboard visibility

### UI
- **Dark / light mode** — CSS custom properties, persisted via `localStorage`, zero flash on load
- **Single process** — Express serves the compiled React app on port 3001 in production

## Tech Stack

| | |
|---|---|
| **Backend** | Node 20 · TypeScript · Express 4 · ws · better-sqlite3 · systeminformation · dockerode |
| **Frontend** | React 18 · Vite 5 · TypeScript · Zustand · Recharts · Lucide · React Router 6 |
| **Auth** | JWT (jsonwebtoken) · bcrypt · role-based middleware |
| **Agents** | WebSocket-based distributed monitoring · token authentication · standalone agent package |
| **Ping** | Native ICMP (node-ping) · TCP sockets · HTTP(S) probes |
| **Proxmox** | Proxmox VE REST API integration · API token auth · auto-discovery |
| **Encryption** | AES-256-GCM for sensitive token storage |
| **Tests** | Vitest — unit tests for DB queries, collectors, and alert engine |

## Quick Start

### Prerequisites

- Node.js 20+
- **Visual Studio Build Tools** with "Desktop development with C++" (needed by `better-sqlite3`)
  ```
  winget install Microsoft.VisualStudio.2022.BuildTools
  ```

### Run

```bash
git clone https://github.com/naix1337/helio.git
cd helio
npm install
npm run build
NODE_ENV=production npm start
# → http://localhost:3001
```

### Development (hot reload)

```bash
npm run dev
# Backend  → http://localhost:3001  (tsx watch)
# Frontend → http://localhost:5173  (Vite + API proxy)
```

## Project Structure

```
helio/
├── backend/src/
│   ├── types.ts              # Shared interfaces (source of truth)
│   ├── crypto.ts              # AES-256-GCM encryption for secrets
│   ├── db/                    # SQLite connection, schema, queries
│   │   ├── migrations/        # 001_initial .. 006_proxmox
│   │   ├── connection.ts
│   │   ├── queries.ts
│   │   └── runner.ts
│   ├── collectors/
│   │   ├── systemCollector.ts  # CPU/RAM/disk/network every 5 s
│   │   ├── dockerCollector.ts  # Docker container stats
│   │   ├── pingCollector.ts    # ICMP/TCP/HTTP ping probes
│   │   └── proxmoxCollector.ts # Proxmox LXC/QEMU auto-discovery
│   ├── middleware/
│   │   └── auth.ts            # JWT + role-based guards
│   ├── ws/
│   │   ├── metricsWs.ts       # Browser WebSocket server + heartbeat
│   │   └── agentWs.ts         # Agent WebSocket (token auth, metrics)
│   ├── routes/
│   │   ├── auth.ts             # Login, setup, JWT
│   │   ├── metrics.ts          # System metrics
│   │   ├── alerts.ts           # Alert CRUD
│   │   ├── nodes.ts            # Node CRUD
│   │   ├── agents.ts           # Agent CRUD + tokens
│   │   ├── ping.ts             # Ping targets + results
│   │   ├── proxmox.ts          # Proxmox connections + scan
│   │   ├── team.ts             # User management
│   │   ├── settings.ts         # App settings
│   │   └── status.ts           # Public status page data
│   ├── alertEngine.ts          # Rule evaluation + webhook dispatch
│   └── index.ts                # Express bootstrap + collector loop
├── agent/                      # Standalone agent package (npm)
│   └── src/                    # collector, reporter, config, types
├── frontend/src/
│   ├── styles/                 # CSS tokens (design system) + layout
│   ├── hooks/                  # useWebSocket, useMetrics, useAuth
│   ├── store/                  # Zustand stores (metrics, agents, ping, proxmox)
│   ├── components/             # StatCard, Sidebar, Modals, Tables
│   ├── pages/                  # Dashboard, Nodes, Agents, Ping, Proxmox, Alerts
│   └── App.tsx                 # React Router 6 layout
└── deploy.sh                   # Linux PM2 deployment script
```

## API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auth/setup` | — | Check if setup is needed |
| `POST` | `/api/auth/setup` | — | Create admin account |
| `POST` | `/api/auth/login` | — | Login, receive JWT |
| `GET` | `/api/me` | JWT | Current user info |
| | | | |
| `GET` | `/api/metrics/current` | JWT | Live system snapshot |
| `GET` | `/api/metrics/history?range=1h\|6h\|24h` | JWT | Historical metrics (≤ 500 points) |
| | | | |
| `GET` | `/api/alerts` | JWT | All alert rules |
| `POST` | `/api/alerts` | JWT | Create rule |
| `PUT` | `/api/alerts/:id` | JWT | Enable / disable rule |
| `DELETE` | `/api/alerts/:id` | JWT | Delete rule |
| | | | |
| `GET` | `/api/nodes` | JWT | Registered nodes |
| | | | |
| `GET` | `/api/agents` | JWT | All agents with latest metrics |
| `GET` | `/api/agents/:id` | JWT | Agent detail |
| `GET` | `/api/agents/:id/metrics/current` | JWT | Latest agent metrics |
| `GET` | `/api/agents/:id/metrics/history` | JWT | Agent metric history |
| `PUT` | `/api/agents/:id` | Admin | Update agent name/tags |
| `DELETE` | `/api/agents/:id` | Admin | Delete agent |
| `POST` | `/api/agents/tokens` | Admin | Generate agent token |
| `DELETE` | `/api/agents/tokens/:id` | Admin | Revoke agent token |
| | | | |
| `GET/POST` | `/api/ping` | JWT | Ping targets CRUD |
| `POST` | `/api/ping/:id/probe` | JWT | Manual ping probe |
| | | | |
| `GET` | `/api/proxmox` | Admin | Proxmox connections |
| `POST` | `/api/proxmox` | Admin | Add Proxmox connection |
| `PUT` | `/api/proxmox/:id` | Admin | Update connection |
| `DELETE` | `/api/proxmox/:id` | Admin | Delete connection |
| `POST` | `/api/proxmox/:id/test` | Admin | Test Proxmox API connectivity |
| `POST` | `/api/proxmox/:id/scan` | Admin | Trigger manual resource scan |
| `GET` | `/api/proxmox/:id/resources` | Admin | Discovered LXC/QEMU resources |
| | | | |
| `GET` | `/api/team` | Admin | List users |
| `PUT` | `/api/team/:id/role` | Admin | Update user role |
| `DELETE` | `/api/team/:id` | Admin | Remove user |
| | | | |
| `GET/PUT` | `/api/settings` | JWT | App settings |
| `GET` | `/api/status` | — | Public status page data |
| `WS` | `/ws` | JWT | Live metrics stream |
| `WS` | `/ws/agent` | Token | Agent metrics stream |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port |
| `NODE_ENV` | — | Set to `production` to serve frontend build |
| `HELIO_DB_PATH` | `./helio.db` | SQLite database path |
| `JWT_SECRET` | auto-generated | JWT signing key (set for persistence across restarts) |
| `HELIO_AGENT_TOKENS` | — | Comma-separated agent tokens (alternative to DB tokens) |
| `HELIO_ENCRYPTION_KEY` | derived from DB path | AES-256-GCM key for encrypted storage (32 bytes hex) |

## License

MIT
