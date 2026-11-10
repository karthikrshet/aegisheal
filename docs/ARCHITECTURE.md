# Architecture

AegisHeal is a Node.js monorepo with two npm workspaces: `server` (API + autonomous agent) and `client` (React dashboard). In development they run on two ports; in production the server also serves the built dashboard from one origin.

## System context

```
                    ┌──────────────────────────── Browser ─────────────────────────────┐
                    │  React dashboard (Vite)  ── REST (fetch, cookie auth) ──┐        │
                    │                          ◀─ Server-Sent Events (live) ──┤        │
                    └─────────────────────────────────────────────────────────┼────────┘
                                                                              │ /api
┌──────────────────────────────────── AegisHeal server (Node.js) ─────────────┼────────────┐
│  Express app: helmet · CORS · rate limits · JSON-only mutations · zod · JWT/RBAC · audit │
│                                                                                          │
│   Monitor ──▶ Detector ──▶ Agent Orchestrator ──▶ Collector ──▶ Analyzer (local/Claude)  │
│      ▲                         │      ▲                                                  │
│      │                         ▼      │ learning                                         │
│      │                    Guardrails ─┴─▶ Executor ──▶ Verifier ──▶ Incident repository  │
│      │                                       │                                           │
│   probes /health /metrics          Supervisor (DevOps automation)                        │
│      │                                       │ spawn / stop / deploy / rollback / admin  │
└──────┼───────────────────────────────────────┼───────────────────────────────────────────┘
       ▼                                       ▼
  ┌────────────┐ ┌────────────┐ ┌────────────┐    JSON store (atomic writes)
  │ api-gateway│ │order-servic│ │payment-serv│    server/data/aegisheal.json
  │  :5101     │ │  :5102     │ │  :5103     │
  └────────────┘ └────────────┘ └────────────┘   real child processes (demoService.js)
```

## Components

| Layer | Module | Responsibility |
|---|---|---|
| Composition | `server/src/engine.js` | Wires every component; `inMemory` mode for tests |
| HTTP | `server/src/app.js`, `routes/*`, `middleware/*` | REST API, SSE, security middleware |
| DevOps automation | `services/supervisor.js` | Spawn, stop, restart, deploy, roll back; authenticated admin calls to services |
| Managed apps | `services/targets/demoService.js` | Dependency-free HTTP service with real fault injection and admin (recovery) endpoints |
| Step 1 Monitoring | `monitoring/monitor.js`, `probe.js`, `systemMetrics.js` | 2 s loop, bounded history (300 samples), host CPU/memory |
| Step 2 Detection | `detection/rules.js`, `detector.js` | 7 rules with evidence; detection baseline after recovery |
| Step 3 Collection | `collection/logStore.js`, `collector.js` | Per-service ring buffers of logs; evidence bundle |
| Step 4 Analysis | `agent/knowledgeBase.js`, `localAnalyzer.js`, `llmAnalyzer.js`, `analyzer.js` | Signature scoring, optional Claude, second opinion |
| Step 5 Decision | `agent/learning.js`, `guardrails.js`, `orchestrator.js` | Ranking, policy checks, approvals |
| Step 6 Recovery | `recovery/actions/*`, `executor.js` | Frozen whitelist of 6 actions with preconditions and timeouts |
| Step 7 Verification | `verification/verifier.js` | N consecutive fully healthy probes |
| History | `incidents/incidentRepository.js`, `audit/auditService.js` | Incidents with steps + timeline; audit trail |
| Persistence | `lib/store.js` | In-memory JSON documents, debounced atomic flush, corruption backup, caps |

## Incident lifecycle

```
detected ─▶ analyzing ─┬─▶ recovering ─▶ verifying ─┬─▶ resolved
                       │        ▲                   └─▶ (next action) ─▶ … ─▶ escalated
                       ├─▶ awaiting_approval ─(approve)─┘     (reject) ─▶ rejected
                       └─▶ open (observe / paused) ─(approve)─▶ recovering
open / escalated / awaiting_approval ──(service healthy 3 checks)──▶ resolved (self-recovered)
```

Only one active incident exists per service. New symptoms on the same service are merged into it, which prevents conflicting recoveries.

## Data model (JSON store)

| Collection | Key fields |
|---|---|
| `users` | id, name, email, role, active, passwordHash, tokenVersion, failedLogins, lockedUntil |
| `incidents` | number, serviceId, type, severity, status, steps[7], anomalies, context, analysis, decision, attempts[], approval, escalation, notes, timeline, mttrMs |
| `auditLogs` | at, actor, action, target, detail, ip (capped at 5 000) |
| `deployments` | serviceId, fromVersion, toVersion, kind (deploy/rollback), actor, at |
| `learning` | `{ [signatureId]: { [actionId]: { attempts, successes, totalRecoveryMs } } }` |
| `settings` | agentMode, thresholds, guardrails, allowedActions, ai |
| `meta` | incidentCounter, agentPaused |

## Real-time updates

`lib/eventBus.js` is a process-wide emitter. Components publish `metrics`, `incident`, `service`, `agent`, `log`, `settings` and `audit` events; `routes/events.js` streams them to every signed-in browser over SSE (max 50 clients, 15 s heartbeat). The client keeps a single `EventSource` in `LiveContext` and components subscribe with `useLiveEvent(type, fn)`.

## Why these choices

| Decision | Reason |
|---|---|
| Real child processes instead of simulated numbers | Faults and recoveries are genuine (a crash really kills a PID; a rollback really redeploys) — the strongest proof for the methodology. |
| JSON file store | Zero installation for new users; atomic writes keep it safe. The store is isolated behind one class, so a real DB can replace it. |
| SSE instead of WebSockets | One-way updates are all the UI needs; works through the Vite proxy and with cookie auth, no extra dependency. |
| Local analyser by default | Works offline and deterministically; the LLM is an optional enhancement, never a dependency. |
| No auto-restart in the supervisor | Every recovery must go through analysis, guardrails, verification and the audit trail. |

See also [AGENT_DESIGN.md](AGENT_DESIGN.md) and [API.md](API.md).
