---
name: add-recovery-action
description: Add a new predefined recovery action to the AegisHeal agent end to end (server action, whitelist, settings, playbook, tests, docs).
---

# Add a recovery action

Recovery actions are the ONLY things the agent can execute. Keep them small, idempotent and safe.

1. Create `server/src/recovery/actions/<camelName>.js` exporting `{ id, name, description, risk: 'low'|'medium'|'high', precondition?(ctx), run(ctx) }`.
   - `run` receives `{ supervisor, serviceId }`, returns a human-readable string, throws on failure.
   - Use only supervisor methods (`restart`, `rollback`, `deploy`, `callService`). Never spawn shell commands or use input as code.
2. Register it in `server/src/recovery/actions/index.js` (frozen `ACTIONS`).
3. Add the id to `ACTION_IDS` in `server/src/settings/defaults.js` (so admins can enable/disable it).
4. If the demo service needs a new admin endpoint, add it to `admin` in `services/targets/demoService.js` (token-protected automatically).
5. Reference it in the relevant signature `playbook` in `server/src/agent/knowledgeBase.js`.
6. Tests: extend `server/tests/incidents.test.js` (executor) and, if it fixes a fault, `selfHealing.e2e.test.js`.
7. Docs: action table in `docs/AGENT_SKILLS.md`, `docs/AGENT_DESIGN.md`; status in `docs/PROGRESS.md`.
8. `npm test && npm run lint`, then commit `feat(recovery): add <id> action`.

High-risk actions must keep requiring ≥70 % confidence or approval (see `agent/guardrails.js`).
