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
