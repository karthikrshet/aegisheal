---
name: add-failure-signature
description: Teach the AegisHeal agent to detect and diagnose a new kind of failure (detection rule, knowledge-base signature, chaos fault, tests).
---

# Add a failure type

1. **Detection** — add a rule object to `RULES` in `server/src/detection/rules.js`: `{ type: 'UPPER_SNAKE', title, severity, evaluate({ samples, process, thresholds }) → null | { evidence: string[], value } }`. Require consecutive samples to avoid flapping. If it needs a new metric, add it to `/metrics` in the demo service and to `probe.js`.
2. **Healthy check** — if the metric matters for "recovered", extend `isSampleHealthy` in the same file.
3. **Threshold** — add a validated field in `server/src/settings/defaults.js` and the Settings page (`client/src/pages/SettingsPage.jsx`) if configurable.
4. **Diagnosis** — add a signature to `SIGNATURES` in `server/src/agent/knowledgeBase.js` with `id`, `name`, `category`, `rootCause`, `playbook` (existing action ids only) and a `score(ctx)` that adds weighted evidence (anomaly ≈ 0.5, corroborating logs ≈ 0.3).
5. **Chaos** — optional fault in `demoService.js` `faults` and `CHAOS_FAULTS` in `services/registry.js`.
6. **Tests** — rule cases in `tests/rules.test.js`, a row in the `it.each` table of `tests/analyzer.test.js`.
7. **Docs** — tables in `docs/AGENT_DESIGN.md` and `docs/AGENT_SKILLS.md`; `docs/PROGRESS.md`.
8. `npm test && npm run lint`, commit `feat(agent): detect and diagnose <type>`.
