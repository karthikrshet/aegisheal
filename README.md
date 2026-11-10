# AegisHeal 🛡️

**Agentic AI-Enabled Autonomous Framework for Intelligent Software Fault Recovery and Resilience**

AegisHeal is a self-healing platform: it **monitors** running services, **detects** failures, **collects** logs and metrics, lets an **AI agent analyse** the root cause, **decides** on a safe predefined recovery action, **executes** it through DevOps automation (restart, rollback, clear cache, reconnect, retry, throttle) and **verifies** that the service is healthy again. Every incident is stored so the agent learns which actions work best.



![stack](https://img.shields.io/badge/React-18-2563eb) ![stack](https://img.shields.io/badge/Node.js-20%2B-2563eb) ![tests](https://img.shields.io/badge/tests-170%2B%20passing-16a34a) ![license](https://img.shields.io/badge/license-MIT-64748b)

## ✨ Features

| Area | What you get |
|---|---|
| **Real monitoring** | 3 real micro-services run as separate OS processes; health, response time, CPU, memory, error rate, failed jobs and dependency state are probed every 2 s, plus host CPU / memory. |
| **Failure detection** | 7 rules: service down / crash, error-rate spike, memory leak, CPU saturation, high latency, dependency loss, failing background jobs. |
| **AI root-cause analysis** | Offline reasoning engine scores 7 failure signatures with evidence and a confidence score. Optional **Claude (Anthropic)** analysis with strict schema validation and a local second opinion. |
| **Automated recovery** | 6 predefined DevOps actions: restart service, roll back deployment, clear cache, reconnect dependency, retry failed operations, throttle workload. |
| **Verification** | A recovery only counts when the service passes N consecutive healthy checks; otherwise the agent tries the next best action or escalates. |
| **Learning** | Success rate per (failure, action) re-ranks future decisions. |
| **Guardrails** | Whitelisted actions only, autonomy modes, confidence threshold, high-risk approval, max attempts, cooldowns, circuit breaker, blast-radius limit. |
| **Human in the loop** | *Autonomous*, *Supervised* (approve each action) and *Observe-only* modes; approve / reject / resolve from the UI. |
| **Chaos lab** | Inject 7 real faults (crash, leak, CPU spike, latency, dependency loss, failing jobs, bad deployment) or run a one-click guided demo. |
| **Dashboard** | Clean white & blue React UI with live charts (Server-Sent Events), 7-step pipeline view, incident timeline, reports, CSV export. |
| **Security** | JWT in httpOnly SameSite=Strict cookies, bcrypt, account lockout, RBAC (admin / operator / viewer), zod validation on every input, Helmet CSP, rate limiting, audit log. |

## 🧭 How it works

```
 ┌──────────────┐   every 2 s   ┌──────────┐   ┌──────────┐   ┌──────────────┐
 │ 1 Monitor    │ ────────────▶ │ 2 Detect │ ─▶│ 3 Collect│ ─▶│ 4 AI Analyze │
 └──────────────┘               └──────────┘   └──────────┘   └──────┬───────┘
        ▲                                                            ▼
 ┌──────┴───────┐   healthy?    ┌──────────┐   ┌──────────────────────────────┐
 │ 7 Verify     │ ◀──────────── │ 6 Recover│ ◀─│ 5 Decide (playbook+learning  │
 └──────────────┘   no → next   └──────────┘   │   + guardrails / approval)   │
        │           action                     └──────────────────────────────┘
        ▼
   Incident history  →  learning model  →  better decisions next time
```

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/AGENT_DESIGN.md](docs/AGENT_DESIGN.md).

## 📋 Prerequisites

| Tool | Version | Check | Download |
|---|---|---|---|
| **Node.js** (includes npm) | 20 LTS or newer | `node -v` | https://nodejs.org (choose **LTS**) |
| **Git** | any recent | `git --version` | https://git-scm.com/downloads |
| A modern browser | Chrome, Edge, Firefox | — | — |

Nothing else is needed: no database server, no Docker, no API key. The JSON database is created automatically.

Free ports used by default: **5173** (dashboard), **4000** (API), **5101-5103** (demo services). All can be changed in `server/.env`.

## 🚀 Quick start (5 commands)

```bash
git clone https://github.com/<your-username>/aegisheal.git
cd aegisheal
npm run bootstrap
npm run dev
```

Then open **http://localhost:5173** and sign in with `admin@aegisheal.local` / `Admin@12345`.

`npm run bootstrap` = install all packages → create `server/.env` with a random secret → create demo accounts.
