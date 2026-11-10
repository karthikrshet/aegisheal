---
name: run-aegisheal
description: Start AegisHeal locally, run the self-healing demo and confirm it works. Use when asked to run, start, demo or check the app.
---

# Run AegisHeal

1. Prerequisites: `node -v` must be 20+.
2. First time only:
   ```bash
   npm install
   npm run setup
   npm run seed
   ```
3. Start: `npm run dev` (run in the background). Wait for `AegisHeal API listening on http://localhost:4000` and Vite's `http://localhost:5173`.
4. Health check: `curl -s http://localhost:4000/api/health` → `"status":"ok"`.
5. Demo without the UI:
   ```bash
   curl -s -c c.txt -H "Content-Type: application/json" -d '{"email":"operator@aegisheal.local","password":"Operator@123"}' http://localhost:4000/api/auth/login
   curl -s -b c.txt -X POST http://localhost:4000/api/services/order-service/chaos/crash
   curl -s -b c.txt "http://localhost:4000/api/incidents?limit=3"
   ```
   Within ~5 s the newest incident should be `resolved` with an `mttrMs`.
6. Demo with the UI: Chaos lab → **Run guided demo**, then watch the Dashboard.

Troubleshooting: `docs/TROUBLESHOOTING.md`. Never commit `server/.env` or `server/data/`.
