# Troubleshooting

## Installation

| Symptom | Cause | Fix |
|---|---|---|
| `'node' is not recognized` / `command not found: node` | Node.js not installed or terminal opened before install | Install Node.js 20 LTS, close and reopen the terminal |
| `npm ERR! engine` or syntax errors at start | Node.js older than 20 | `node -v`; upgrade to 20+ |
| `npm install` hangs or fails with network errors | proxy / firewall | `npm config set registry https://registry.npmjs.org/` and retry; on college networks try a mobile hotspot |
| PowerShell: *running scripts is disabled* | execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or use Command Prompt |
| `EPERM` / `EBUSY` on Windows during install | antivirus or an open editor locking files | close the dev server and editors, run `npm install` again |

## Starting

| Symptom | Fix |
|---|---|
| `Port 4000 is already in use` | set `API_PORT=4100` (any free port) in `server/.env`; the dashboard proxy follows it |
| Vite picks port 5174 instead of 5173 | 5173 is busy — use the URL Vite prints, and add it to `CLIENT_ORIGIN` |
| `Invalid environment configuration` | the message names the bad variable; compare with `server/.env.example` |
| `JWT_SECRET must be set … in production` | run `npm run setup` or put a 48+ char random secret in `server/.env` |
| All services **Down** right after start | ports 5101–5103 busy → change `SERVICE_BASE_PORT` |

## Using the dashboard

| Symptom | Fix |
|---|---|
| *Cannot reach the AegisHeal server* | the API process is not running or crashed — check the `[server]` lines in the terminal |
| Logged out after every restart | `JWT_SECRET` keeps changing — run `npm run setup` once |
| Badge shows **Reconnecting** | live stream dropped (laptop sleep, server restart); it reconnects automatically within 3 s |
| *Too many login attempts* | wait 15 minutes, or restart the server in development |
| *Account temporarily locked* | 5 wrong passwords — wait 15 minutes or have an admin reset the password |
| Chaos buttons are greyed out | you are a viewer, or the service is stopped |
| An incident stays **escalated** | the agent could not verify a fix; read the reason, fix manually and click *Mark as resolved*, or approve a different action |
| Circuit breaker **open** | Agent control → Circuit breakers → **Reset** after fixing the cause |

## Data

| Goal | Command |
|---|---|
| Start with an empty database | stop the app → `npm run reset-data -- --yes` → `npm run seed` |
| Forgot the admin password | same as above (deletes all data) |
| Database file corrupted | AegisHeal keeps `aegisheal.json.corrupt-<time>` and starts fresh automatically |

## Claude AI provider

| Symptom | Fix |
|---|---|
| Agent page says *API key missing — using local* | set `ANTHROPIC_API_KEY` in `server/.env` and restart |
| Server log: *Invalid ANTHROPIC_API_KEY* | create a new key in the Anthropic console |
| Analysis engine shows *local (Claude unavailable)* | network, rate limit or invalid response — the local engine was used; recovery still works |

Still stuck? Run with `LOG_LEVEL=debug` in `server/.env` and look at the terminal output.
