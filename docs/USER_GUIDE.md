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

## Services → service detail

Tabs: **Overview** (live charts with threshold lines, process details), **Recovery & deploy** (run any predefined action manually, deploy a version), **Chaos** (inject faults), **Logs** (live stream) and **Deployments** (history incl. rollbacks). Admins can stop / start a service — a stopped service is treated as maintenance and ignored by the agent.

## Incidents

Search by number, service or cause; filter by status and severity; export everything as CSV. Click a row for the detail page:

- **Approval bar** (supervised / observe / escalated) — pick an action and **Approve & run**, or **Reject**.
- **Self-healing pipeline** with the detail of each step.
- **AI root-cause analysis** — diagnosis, confidence bar, evidence, recommended playbook, alternatives.
- **Recovery attempts** — each action, its output and the verification probes.
- **Collected evidence** — process state, metrics and the log excerpt the agent analysed.
- **Timeline** and **Notes** for the team; **Mark as resolved** for fixes done outside AegisHeal.
