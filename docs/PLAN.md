# AegisHeal — Project Plan

> **Agentic AI-Enabled Autonomous Framework for Intelligent Software Fault Recovery and Resilience**


## 1. Product vision (Product Manager)

Traditional monitoring tools *detect and alert*. AegisHeal goes further: it **detects, diagnoses,
recovers and verifies** on its own, then records every incident so the next recovery is smarter.

**Primary users**

| Persona | Need | What AegisHeal gives them |
|---|---|---|
| DevOps / SRE engineer | Fewer 3 a.m. pages | Autonomous recovery with a full audit trail |
| Developer | Fast root cause | AI analysis of logs + metrics with confidence score |
| Team lead / examiner | Proof it works | Live dashboard, MTTR and success-rate analytics |

**Success metrics:** MTTR < 15 s for demo faults, recovery success rate > 90 %, zero unsafe actions
(every action passes guardrails), 100 % of incidents recorded.

## 2. Scope (mapped to synopsis objectives)

| Synopsis objective / step | Feature in AegisHeal |
|---|---|
| Step 1 – System monitoring | Monitor loop probes `/health` + `/metrics` of each managed service every 2 s; host CPU / memory via `os` |
| Step 2 – Failure detection | Rule-based detector: service down, crash loop, high CPU, memory leak, high latency, error-rate spike, dependency loss, bad deployment |
| Step 3 – Log & data collection | Collector snapshots last N log lines, metric window, deployment history, recent incidents |
| Step 4 – AI-based analysis | Local reasoning engine (signature matching + evidence scoring) and optional Claude LLM analyser |
| Step 5 – Recovery decision | Policy engine ranks playbook actions using learned success rates, filtered by guardrails |
| Step 6 – Automated recovery | DevOps executor: restart, rollback, clear cache, reconnect dependency, retry operation, throttle |
| Step 7 – Verification | Verifier requires N consecutive healthy probes; escalates if recovery fails |
| Expected outcome – incident history | Persistent incident store with full step timeline, analytics and CSV export |

**Extra features (added by senior team review)**

- Three agent modes: **Autonomous**, **Supervised** (human approves each action), **Observe-only**.
- **Guardrails**: action whitelist, cooldowns, max attempts per incident, circuit breaker, blast-radius limit.
- **Chaos lab**: inject real faults into real processes to demo the framework.
- **Learning loop**: success rate per (cause, action) re-ranks future decisions.
- Role-based access (admin / operator / viewer), audit log, live updates over Server-Sent Events.

## 3. Architecture (Senior Developer)

```
React (Vite) dashboard ──REST + SSE──▶ Express API ──▶ Agent Orchestrator
                                                         │
     Monitor ─▶ Detector ─▶ Collector ─▶ Analyzer ─▶ Decision/Guardrails ─▶ Executor ─▶ Verifier
        ▲                                                                       │
        └────────────── Supervisor (spawns real Node child services) ◀──────────┘
                                   JSON store (atomic writes)
```

See `docs/ARCHITECTURE.md` for full details.

## 4. UX principles (UX Architect)

- White surfaces, blue primary (`#2563eb`), one accent per state (green ok, amber warn, red critical).
- Every screen answers one question: *Is everything healthy? What broke? What did the agent do?*
- Live pipeline view shows the agent's 7 steps lighting up in real time.
- Accessible: keyboard focus rings, ARIA labels, 4.5:1 contrast, responsive down to 360 px.

## 5. Milestones (Project Manager)

| # | Milestone | Status |
|---|---|---|
| M1 | Repo scaffold, plan, conventions | ✅ |
| M2 | Core libs: config, logger, store, auth | ✅ |
| M3 | Managed services + supervisor (DevOps layer) | ✅ |
| M4 | Monitoring + detection | ✅ |
| M5 | AI agent (analysis, decision, guardrails, learning) | ✅ |
| M6 | Recovery executor + verification + incidents | ✅ |
| M7 | REST API, SSE, security hardening | ✅ |
| M8 | React dashboard | ✅ |
| M9 | Tests, docs, install guide | ✅ |

Live progress is tracked in `docs/PROGRESS.md`.

## 6. Risks

| Risk | Mitigation |
|---|---|
| LLM unavailable / no API key | Local analyser is the default; LLM is optional and validated |
| LLM suggests unsafe action | Guardrails whitelist — LLM output can only pick from predefined actions |
| Recovery loop (flapping) | Cooldowns, max attempts, circuit breaker, escalation |
| Data corruption on crash | Atomic write (temp file + rename) with debounced flush |
| Port clashes on examiner's PC | All ports configurable through `.env` |
