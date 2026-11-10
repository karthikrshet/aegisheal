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
