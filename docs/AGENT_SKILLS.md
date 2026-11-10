# Agent skills

"Skills" has two meanings in this project: what the **AegisHeal recovery agent** can do, and the **Claude Code skills** stored in `.claude/skills/` that help AI assistants maintain the project.

## Part A — Capabilities of the recovery agent

### Perception (monitoring & detection)

| Skill | Detects | Threshold (default) |
|---|---|---|
| Liveness check | crashed or unreachable process | exit / 2 refused probes |
| Error-rate watch | HTTP 5xx on health checks or app error rate | 2 failures / 30 % |
| Memory watch | memory above threshold, monotonic growth | 220 MB |
| CPU watch | sustained CPU saturation | 80 % for 2 samples |
| Latency watch | slow responses | 800 ms for 2 samples |
| Dependency watch | lost database / upstream connection | 2 samples |
| Job watch | failing background operations | 5 failed jobs |
| Host watch | host CPU / memory (dashboard) | — |

### Reasoning

| Skill | Description |
|---|---|
| Evidence collection | logs, metric window, deployment history, previous incidents |
| Signature matching | 7 known failure signatures + unknown fallback |
| Confidence estimation | score with ambiguity penalty, alternatives listed |
| LLM consultation (optional) | Claude analysis validated against strict schema, local second opinion |
| Learning | success-rate based re-ranking of playbook actions |

### Action (DevOps automation)

| Action id | What it really does | Risk |
|---|---|---|
| `restart-service` | gracefully stops the process and starts a new one | medium |
| `rollback-deployment` | redeploys the last known good version | high |
| `clear-cache` | flushes the leaking cache and forces GC | low |
| `reconnect-dependency` | re-establishes the dependency connection pool | low |
| `retry-failed-operations` | replays failed jobs with backoff | low |
| `throttle-workload` | kills runaway workers and limits concurrency | low |

### Verification & memory

| Skill | Description |
|---|---|
| Recovery verification | N consecutive fully healthy probes within a deadline |
| Escalation | hands over to a human with the reason when it cannot fix the problem |
| Incident history | every step, decision, action, probe and note is stored |
| Self-recovery detection | closes incidents when a service recovers on its own |
