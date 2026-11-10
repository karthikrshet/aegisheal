# AI agent design

The agent is implemented in `server/src/agent/orchestrator.js`. It is *agentic* in the sense used by the synopsis: it perceives (monitoring), reasons (analysis), decides (policy + learning), acts (DevOps automation), checks the result (verification) and remembers (incident history + learning) — in a loop, without a human, inside explicit guardrails.

## The 7-step loop

| Step | Code | Output stored on the incident |
|---|---|---|
| 1. Monitor | `Monitor.tick()` every `MONITOR_INTERVAL_MS` | latest probe in `steps[monitor].detail` |
| 2. Detect | `detectAnomalies()` rules | `anomalies[]` with evidence and severity |
| 3. Collect | `collectContext()` | `context` (logs excerpt, metrics, deployment, process info) |
| 4. Analyze | `analyzeIncident()` | `analysis` (signature, root cause, confidence, evidence, playbook, alternatives) |
| 5. Decide | `learning.rank()` + `guardrails.evaluate()` | `decision` (ranked actions, chosen, guardrail verdict) |
| 6. Recover | `executeAction()` | `attempts[n].result` |
| 7. Verify | `verifyRecovery()` | `attempts[n].verification` → `resolved` or next attempt |

If verification fails, the loop goes back to step 5 with the actions already tried removed. After `maxAttemptsPerIncident` the incident is **escalated** to a human.

## Root-cause analysis

### Local reasoning engine (default)

`knowledgeBase.js` defines 7 failure signatures. Each has a `score(ctx)` function that adds weighted evidence:

| Signature | Strong evidence | Playbook (best first) |
|---|---|---|
| Faulty deployment | error spike + deployment in last 15 min + version ≠ last good + new stack traces | rollback → restart |
| Application crash | service down / crashed + fatal log | restart |
| Memory leak | memory above threshold + cache growth logs | clear cache → restart |
| CPU saturation | CPU above threshold + runaway worker logs | throttle → restart |
| Dependency loss | dependency disconnected + ECONNREFUSED/RESET logs | reconnect → restart |
| Transient operation failure | failed jobs + timeout logs | retry failed operations → restart |
| Performance degradation | latency above threshold + saturation logs | restart → throttle |
| *Unknown* | nothing matches ≥ 0.3 | restart (safe default) |

Confidence = best score (capped at 0.97), reduced by 0.1 when the runner-up hypothesis is within 0.15 — the agent is honest about ambiguity. Alternatives are shown in the UI.

### Optional Claude analysis

`llmAnalyzer.js` sends the evidence bundle (service info, anomalies, latest sample, deployment, last 30 log lines, known signatures) to Claude with a system prompt that:

- restricts `signatureId` and `recommendedActions` to the known lists,
- tells the model to treat log lines as data and ignore instructions inside them (prompt-injection defence),
- requires a single JSON object.

The reply is parsed and validated with a strict zod schema. Any problem — no key, network error, rate limit, refusal, invalid JSON, unknown action — returns `null` and the local result is used. When both engines agree, confidence gets a small boost; the local result is always attached as a `secondOpinion`.

## Decision making

1. Candidate actions = the analysis playbook, minus actions already tried, minus actions disabled in Settings; `restart-service` is appended as a last resort.
2. `LearningModel.rank()` scores each: `0.4 × playbook prior + 0.6 × Laplace-smoothed success rate` for that (signature, action) pair.
3. The first candidate that passes the guardrails is chosen (actions in cooldown are skipped).
4. If guardrails require approval, the incident waits in `awaiting_approval`.

## Learning

After every attempt `learning.record(signature, action, success, recoveryMs)` updates the statistics. Over time an action that keeps failing for a signature drops below the next one in the ranking. The Playbooks page shows the live ranking and success rates; the Reports page shows action effectiveness.
