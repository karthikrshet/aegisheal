# User guide

A tour of every screen. Sign in at **http://localhost:5173** (development) or **http://localhost:4000** (production).

## Sign in

Use the e-mail and password created by `npm run seed`, or click **Use** next to a demo account. Five wrong passwords lock the account for 15 minutes.

## Dashboard

- **Banner** — overall state ("All systems operational" or the number of active incidents) and current agent mode.
- **KPI tiles** — healthy services, active incidents, mean time to recovery (MTTR) and autonomous recovery rate.
- **Agent pipeline** — the 7 steps for the latest incident. Green = done, blue = running, red = failed.
- **Service cards** — live response time, CPU, memory, uptime and a sparkline; a red badge links to an open incident.
- **Charts** — live response time of each service and host CPU / memory.
- **Recent incidents** and **Agent activity** feed.
