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

## Agent control

Choose **Autonomous**, **Supervised** or **Observe only** (admin), pause / resume the agent, see pending approvals, circuit breakers (reset them after fixing a root cause) and the full list of guardrails.

## Playbooks

The agent's knowledge: each failure signature, its root cause and the ranked recovery actions with learned success rates and average recovery time.

## Chaos lab

Break things on purpose. Each button injects a real fault into a real process. **Run guided demo** injects three different failures at once. Viewers cannot inject faults.

## Live logs

All logs from services and the agent. Filter by source, level or text; **Pause** freezes the view without losing the stream.

## Reports

Choose 24 h / 7 / 30 days: incident trend with average MTTR, distribution by failure type, root cause and service, estimated downtime avoided and the effectiveness of every action.

## Administration (admin only)

- **Users** — add users, change roles, disable / enable, reset passwords, delete. You cannot demote or delete yourself or the last admin.
- **Audit log** — who did what and when (logins, chaos, recoveries, approvals, settings).
- **Settings** — detection thresholds, guardrails, allowed actions and the AI engine. Values are validated; invalid fields are highlighted and the save button is disabled.

## Profile

Click your avatar (top right) to see your account and change your password. Changing it signs out your other sessions.
