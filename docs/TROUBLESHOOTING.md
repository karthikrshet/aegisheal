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
