# Changelog

## [1.2.0] — 2026-06-11

### Added
- **Proxmox LXC/VM Auto-Discovery** — automatic detection of LXC containers and QEMU VMs via Proxmox VE REST API
  - New `ProxmoxCollector` polls Proxmox API at configurable intervals (20s–1h)
  - Discovered resources are automatically created as Helio Agents with live metrics
  - Removed resources are set offline automatically
  - AES-256-GCM encrypted API token storage (`HELIO_ENCRYPTION_KEY`)
- **Proxmox Management UI** — integrated into the Nodes page
  - Connection card with online/offline status, last sync, resource counts
  - Resource table (VMID, Name, Type, Status, Agent link)
  - "Jetzt scannen" button for manual sync
  - Connection configuration form (host, port, API token, SSL verify, scan interval)
- **Proxmox REST API** (`/api/proxmox`) — 7 endpoints for connection CRUD, test, scan
  - All endpoints require admin role
  - API token secret never returned in API responses
- **Proxmox WebSocket messages** — `proxmox_update`, `agent_created` events

## [1.1.0] — 2026-06-09

### Added
- **Agent Ping Monitor** — ICMP/TCP/HTTP health checks with configurable intervals
  - `PingCollector` with probe scheduling and 24h uptime statistics
  - PingMonitor page with target list, detail panel, and add-target modal
  - Ping results ring buffer (8,640 rows cap per target)
- **Helio Agent Package** (`agent/`) — standalone npm package for distributed monitoring
  - WebSocket reporter with token authentication and automatic reconnection
  - System metrics collector (CPU, RAM, disk, network, Docker)
  - Configurable via environment variables
- **Deploy Script** — `deploy.sh` for Linux PM2 deployment with auto-stop, pull, build
  - Submodule setup fixed (clones main directly)
  - Uses `npm install` for compatibility
- **Docker completely removed** from backend, frontend, and agent

### Changed
- Updated helio-app submodule with agent/ping database schema and queries

## [1.0.1] — 2026-06-08

### Added
- **Agent Management** — token-authenticated distributed agents
  - REST endpoints for agent CRUD and token management
  - Agent WebSocket handler (`/ws/agent`) with rate limiting and heartbeat
  - Agents page with online/offline status, CPU/RAM bars, OS info
  - Agent detail page with metrics history
- **Database Migrations** — 004_agents.sql and 005_ping.sql with ring buffer triggers

### Security
- Agent mutations restricted to admin role
- Private hosts blocked in ping targets
- Rate limiting on agent WebSocket connections (max 1 per 5s per IP)

## [1.0.0] — 2026-06-08

### Added
- **Phase 0: Authentication & Team Management**
  - JWT-based authentication with bcrypt password hashing
  - Role-based access control (admin, editor, viewer)
  - Login page, setup page, team management page
  - Auth middleware for routes and WebSocket connections
  - Route guards (RequireAuth, RequireSetup)
- **WebSocket Authentication** — JWT token passed via query parameter
- **Settings Page** — configurable app title, status page, dashboard visibility

### Changed
- All API routes except auth/setup/login/status now require authentication
- Frontend routing restructured with auth guards and login redirect

## [0.1.0] — 2026-06-02

### Added
- Initial Helio monitoring application
- Live system metrics (CPU, RAM, disk, network) every 5 seconds
- Docker container monitoring
- Configurable alerts with webhook, Slack, and Discord notifications
- SQLite database with WAL mode and 24-hour ring buffer
- WebSocket real-time streaming with auto-reconnect
- React dashboard with Recharts visualizations
- Dark/light mode with CSS custom properties
- Node CRUD management
- One-shot ping tool (TCP/HTTP/HTTPS)
- Public status page
- Linux PM2 deployment
