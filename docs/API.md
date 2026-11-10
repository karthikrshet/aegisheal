# API reference

Base URL: `http://localhost:4000/api` (in development the dashboard proxies `/api` from `http://localhost:5173`).

- Auth: httpOnly cookie `aegis_token` set by `POST /auth/login`, or `Authorization: Bearer <token>` for scripts.
- Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) with a body must send `Content-Type: application/json`.
- Errors always look like `{ "error": { "code", "message", "details?", "requestId" } }`.
- Rate limits: 600 requests/min per IP, 20 logins / 15 min, 60 actions / min.

Roles: **V** = viewer, **O** = operator, **A** = admin (each includes the ones before it).

## Health & auth

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/health` | public | Liveness: status, version, uptime, monitor state |
| POST | `/auth/login` | public | `{ email, password }` → sets cookie, returns `{ user }` |
| POST | `/auth/logout` | public | Clears the cookie |
| GET | `/auth/me` | V | Current user |
| POST | `/auth/change-password` | V | `{ currentPassword, newPassword }` — signs out other sessions |

```bash
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@aegisheal.local","password":"Admin@12345"}' \
  http://localhost:4000/api/auth/login
```

## Services

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/services` | V | All services with health, latest sample, uptime %, active incident |
| GET | `/services/catalog` | V | Chaos faults and recovery actions (id, name, description, risk) |
| GET | `/services/:id?points=60` | V | One service with metric history and last 10 deployments |
| POST | `/services/:id/actions/:actionId` | O | Run a predefined recovery action manually |
| POST | `/services/:id/chaos/:fault` | O | Inject a fault: `crash`, `memory-leak`, `cpu-spike`, `latency`, `dependency-loss`, `job-failure`, `bad-deploy` |
| POST | `/services/:id/deploy` | O | `{ version: "1.2.3" }` |
| POST | `/services/:id/start` · `/stop` | A | Lifecycle (stopped services are ignored by the agent) |

```bash
curl -b cookies.txt -X POST http://localhost:4000/api/services/order-service/chaos/crash
```

## Incidents

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/incidents?status=&severity=&serviceId=&q=&page=&limit=` | V | Paginated list (`status=active` for open ones) |
| GET | `/incidents/export.csv` | V | Full history as CSV (formula-injection safe) |
| GET | `/incidents/:id` | V | Full incident: steps, anomalies, context, analysis, decision, attempts, timeline, notes |
| POST | `/incidents/:id/approve` | O | `{ actionId? }` — run the proposed (or chosen) action |
| POST | `/incidents/:id/reject` | O | `{ reason? }` |
| POST | `/incidents/:id/resolve` | O | `{ note? }` — mark as manually resolved |
| POST | `/incidents/:id/notes` | O | `{ text }` |
