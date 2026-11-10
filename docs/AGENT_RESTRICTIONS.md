# Agent restrictions

This document has two parts: the **runtime guardrails** of the AegisHeal recovery agent, and the **rules for AI coding assistants** (Claude Code, Copilot, Codex …) that work on this repository.

## Part A — Runtime guardrails of the recovery agent

Implemented in `server/src/agent/guardrails.js`, enforced on every decision, configurable in **Settings → Guardrails** (admin only, validated server-side).

| # | Restriction | Default | Why |
|---|---|---|---|
| 1 | **Action whitelist** — only the 6 predefined actions in a frozen registry can run | always on | The agent (or an LLM) can never execute arbitrary commands |
| 2 | **Allowed actions policy** — admins can disable any action | all enabled | Organisation-specific risk appetite |
| 3 | **Autonomy modes** — autonomous / supervised / observe, plus pause | autonomous | Humans decide how much autonomy to grant |
| 4 | **Confidence threshold** — below it, a human must approve | 50 % | Do not act on weak diagnoses |
| 5 | **High-risk approval** — rollback needs ≥ 70 % confidence to run autonomously | on | Rollbacks change what is deployed |
| 6 | **Max attempts per incident**, then escalation | 3 | No endless trial-and-error |
| 7 | **Cooldown** between the same action on the same service | 5 s | Prevents flapping loops |
| 8 | **Circuit breaker** — N failed recoveries in a window stop the agent for that service | 4 in 10 min | Stops a broken service from being hammered |
| 9 | **Blast radius** — max concurrent recoveries across all services | 2 | Limits impact of a wrong decision |
| 10 | **Verification required** — success only after N consecutive healthy checks | 3 checks / 20 s | No "fixed" without proof |
| 11 | **LLM output validation** — strict schema, enums for signatures and actions, logs treated as data | always on | Defends against hallucination and prompt injection in logs |
| 12 | **Precondition checks** per action (e.g. rollback only if not on last good version) | always on | Refuses nonsensical actions |
| 13 | **Action timeout** | 20 s | A hung action cannot block the agent |
| 14 | **Audit trail** — every action by agent or human is logged with actor and result | always on | Accountability |
| 15 | **Least-privilege service control** — admin/chaos endpoints of services require a per-run random token and bind to 127.0.0.1 | always on | Nobody else on the network can control services |

Operator approval bypasses 6–9 (a human explicitly took responsibility) but **never** bypasses 1, 2, 10 or 12.
