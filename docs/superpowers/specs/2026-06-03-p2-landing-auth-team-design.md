# Design: P2 — Landing Page, Auth-System, Team-Seite

**Datum:** 2026-06-03  
**Status:** Approved

---

## Kontext

helio-app ist eine self-hosted Monitoring-Anwendung. P2 umfasst drei zusammenhängende Features:

1. **Landing Page** — Marketing-Seite bei `/`, HTML-Prototyp existiert bereits unter `design_extracted/helio-landing/project/Helio Landing.html`
2. **Auth-System** — Grundlage für die Team-Seite; aktuell hat die App keine Authentifizierung
3. **Team-Seite** — User Management mit Rollen (Admin / Editor / Viewer) bei `/dashboard/team`

Die drei Features sind sequenziell abhängig: Landing Page ist unabhängig, Auth ist Voraussetzung für die Team-Seite.

---

## 1. Landing Page

### Ziel
`/` zeigt eine Marketing-Seite statt direkt auf `/dashboard` weiterzuleiten. Eingeloggte Nutzer können über CTAs ins Dashboard navigieren.

### Routing
- `App.tsx`: Redirect `/ → /dashboard` entfernen, stattdessen Route `/ → <LandingPage />`
- Neue Datei: `frontend/src/pages/LandingPage.tsx`
- Neue Datei: `frontend/src/styles/landing.css`

### Struktur (1:1 aus Prototyp)
| Abschnitt | Inhalt |
|-----------|--------|
| Navbar | Logo, Links (Features/Preise/Docs/GitHub), Dark/Light-Toggle, CTA-Button, Burger-Menü |
| Hero | Headline, Lead-Text, 2 CTAs, Dashboard-Mockup, GitHub-Stars-Pill |
| Trusted By | 6 Placeholder-Logos |
| Feature-Grid | 6 Karten (3×2) mit Hover-Glow |
| Split-Highlights | Alerting (links Text, rechts Panel) + Docker (rechts Text, links Terminal) |
| Live-Demo | 4 animierte Zähler, Status-Dot |
| Pricing | 3 Karten (Self-Hosted €0 / Pro €12 / Team €39) |
| FAQ | 6 Accordion-Items |
| Final CTA | Headline, Buttons, Copy-Command |
| Footer | 4 Spalten, Social-Icons, Copyright |

### Technische Details
- Icons: `lucide-react` (bereits installiert) — ersetzt `data-lucide`-Attribute aus dem Prototyp
- Fonts: `Inter` + `JetBrains Mono` via `<link>` in `index.html` ergänzen (falls nicht vorhanden)
- CSS-Tokens: `landing.css` importiert `tokens.css`-Variablen — keine doppelten Definitionen
- Scroll-Animationen: `IntersectionObserver` in `LandingPage.tsx` (analog zur Prototyp-`app.js`)
- Dark/Light-Toggle: setzt `data-theme` auf `<html>`, gespeichert in `localStorage`
- CTAs „Jetzt starten" / „Kostenlos hosten": Link zu `/dashboard`
- GitHub-Stars-Pill: hardcoded Zahl (kein API-Call)

---

## 2. Auth-System

### Ziel
JWT-basierte Authentifizierung. Alle Dashboard-Routen werden geschützt. Öffentliche Seiten (`/`, `/status`) bleiben ohne Login erreichbar. Erster Start löst Setup-Wizard aus.

### Datenbank
Neue Tabelle `users` (in `db/connection.ts` ergänzen):
```sql
CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  email     TEXT UNIQUE NOT NULL,
  name      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'viewer',  -- 'admin' | 'editor' | 'viewer'
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login INTEGER
)
```

### Backend

**Neue Packages:** `bcryptjs`, `jsonwebtoken` (+ `@types/bcryptjs`, `@types/jsonwebtoken`)

**Neue Queries** (`db/queries.ts`):
- `createUser(email, name, passwordHash, role)` → `id`
- `getUserByEmail(email)` → `User | undefined`
- `getUserById(id)` → `User | undefined`
- `updateLastLogin(id)` → `void`
- `countUsers()` → `number`
- `getAllUsers()` → `User[]`
- `updateUserRole(id, role)` → `void`
- `deleteUser(id)` → `void`

**Neuer Type** (`types.ts`):
```typescript
export type UserRole = 'admin' | 'editor' | 'viewer';
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: number;
  last_login: number | null;
}
```

**Neue Route** `routes/auth.ts` unter `/api/auth`:

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| `GET` | `/api/auth/setup` | — | `{ needed: true/false }` — ob noch kein User existiert |
| `POST` | `/api/auth/setup` | — | Erstellt ersten Admin (nur wenn `countUsers() === 0`) |
| `POST` | `/api/auth/login` | — | Prüft Email+Passwort, gibt `{ token, user }` zurück |
| `GET` | `/api/auth/me` | ✓ | Gibt eingeloggten User zurück |

**Middleware** `middleware/auth.ts`:
```typescript
// requireAuth: JWT validieren, req.user setzen
// requireRole(role): prüft ob req.user.role ausreichend ist
// Rollen-Hierarchie: admin > editor > viewer
```

**Geschützte Routen** — `requireAuth` wird in `index.ts` vor alle `/api/*`-Router gelegt **außer**:
- `/api/auth/*` (Login/Setup)
- `GET /api/status` (öffentliche Status-Page)
- `GET /api/settings` (Status-Page braucht Titel/Untertitel)

**JWT:** `HS256`, Payload `{ userId, role }`, Laufzeit 7 Tage, Secret aus `process.env.HELIO_JWT_SECRET` (Fallback: zufällig generierter String beim Start — bedeutet alle Sessions werden bei Serverneustart ungültig; wird als Warning geloggt).

**Token-Ablauf:** Frontend-`useAuth` fängt `401`-Antworten global ab und leitet auf `/login` weiter (Token aus `localStorage` entfernen).

### Frontend

**Neue Dateien:**
- `pages/LoginPage.tsx` — zentrierte Karte (Email + Passwort + Submit)
- `pages/SetupPage.tsx` — First-Run-Wizard (Name + Email + Passwort + Bestätigung)
- `hooks/useAuth.ts` — JWT aus `localStorage`, login/logout/currentUser
- `components/RequireAuth.tsx` — Wrapper: redirect auf `/login` wenn kein Token
- `components/RequireSetup.tsx` — Wrapper: redirect auf `/setup` wenn Setup nötig

**Routing** (`App.tsx`):
```
/setup          → <SetupPage />       (kein Auth nötig)
/login          → <LoginPage />       (kein Auth nötig)
/dashboard/*    → <RequireSetup> → <RequireAuth> → <AppLayout>
/status         → <StatusPage />      (öffentlich)
/               → <LandingPage />     (öffentlich)
```

**Sidebar-Ergänzung** (`Sidebar.tsx`): Ganz unten ein User-Widget:
```
[FL]  Florian L.
      Admin
      [Abmelden]
```
Avatar: farbige Initials-Kreis (wie in Team-Seite), Name, Rolle-Badge, Logout-Button.

---

## 3. Team-Seite

### Ziel
Admins können User anlegen, Rollen ändern und User löschen. Jeder eingeloggte User sieht die Seite, aber nur Admins können Änderungen vornehmen.

### Backend

**Neue Route** `routes/team.ts` unter `/api/team`:

| Method | Path | Role | Beschreibung |
|--------|------|------|--------------|
| `GET` | `/api/team` | any | Alle User (ohne `password_hash`) |
| `POST` | `/api/team` | admin | Neuen User erstellen |
| `PUT` | `/api/team/:id` | admin | Rolle ändern |
| `DELETE` | `/api/team/:id` | admin | User löschen (nicht sich selbst) |

### Frontend

**Neue Datei:** `pages/Team.tsx`

Layout (Tabellen-Stil, konsistent mit anderen Seiten):
```
[Page Header: "Team"]           [+ Nutzer hinzufügen] (nur Admin)

┌─────────────────────────────────────────────────────┐
│ Name          E-Mail               Rolle    Aktionen │
├─────────────────────────────────────────────────────┤
│ [FL] Florian  admin@helio.de  [Admin ▾]    [—]      │
│ [MK] Max      max@helio.de    [Editor ▾]   [🗑]     │
│ [SP] Sara     sara@helio.de   [Viewer ▾]   [🗑]     │
└─────────────────────────────────────────────────────┘
```

- Rolle-Dropdown per Zeile (nur für Admin aktiv, für andere readonly)
- Löschen-Button disabled für eigenen Account
- Rollenprüfung erfolgt **im Backend** via `requireRole`-Middleware — Frontend-Einschränkungen sind UX, nicht Sicherheit
- „+ Nutzer hinzufügen" öffnet Inline-Formular (Name, E-Mail, Passwort, Rolle)
- Avatar: Initials-Kreis mit konsistenter Farbe (hash der Email → Index in Farbpalette)

**Routing:** Route `/dashboard/team` in `App.tsx` eintragen; Sidebar-Link `/dashboard/team` ist bereits vorhanden.

---

## Rollen-Matrix

| Aktion | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| Dashboard lesen | ✓ | ✓ | ✓ |
| Nodes CRUD | ✓ | ✓ | — |
| Alerts CRUD | ✓ | ✓ | — |
| Settings ändern | ✓ | — | — |
| Team verwalten | ✓ | — | — |
| Status-Page | öffentlich | öffentlich | öffentlich |

---

## Verifikation

1. **Landing Page:** `npm run dev` im Frontend, `/` aufrufen — alle Sektionen sichtbar, Scroll-Animationen aktiv, Dark/Light-Toggle funktioniert, CTAs verlinken auf `/dashboard`
2. **Auth — First Run:** DB löschen (oder leere DB), App starten → Browser redirect auf `/setup`, Admin anlegen → redirect auf `/dashboard`
3. **Auth — Login:** Ausloggen → redirect auf `/login`, falsche Credentials → Fehlermeldung, richtige → JWT gesetzt, Dashboard sichtbar
4. **Auth — Schutz:** API-Call auf `GET /api/alerts` ohne Token → `401`; mit Token → Daten
5. **Team:** Als Admin `/dashboard/team` öffnen, User anlegen, Rolle ändern, User löschen (nicht sich selbst)
6. **Rollen:** Als Editor einloggen → Settings-Seite zeigt Fehlermeldung oder Felder disabled; Team-Route gibt `403`
7. **Öffentliche Routen:** `/status` und `/` ohne Token aufrufbar; `GET /api/status` und `GET /api/settings` ohne Token erreichbar
