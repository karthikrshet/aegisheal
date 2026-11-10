# Troubleshooting

## Installation

| Symptom | Cause | Fix |
|---|---|---|
| `'node' is not recognized` / `command not found: node` | Node.js not installed or terminal opened before install | Install Node.js 20 LTS, close and reopen the terminal |
| `npm ERR! engine` or syntax errors at start | Node.js older than 20 | `node -v`; upgrade to 20+ |
| `npm install` hangs or fails with network errors | proxy / firewall | `npm config set registry https://registry.npmjs.org/` and retry; on college networks try a mobile hotspot |
| PowerShell: *running scripts is disabled* | execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or use Command Prompt |
| `EPERM` / `EBUSY` on Windows during install | antivirus or an open editor locking files | close the dev server and editors, run `npm install` again |
