# CLAUDE.md — instructions for AI coding assistants

AegisHeal is an agentic self-healing platform (Node.js/Express server + React/Vite client, npm workspaces). Read `docs/MEMORY.md` (decisions & gotchas) and `docs/PROGRESS.md` (status) before changing anything substantial.

## Commands

```bash
npm install          # install both workspaces
npm run setup        # create server/.env with a random JWT secret (never overwrites)
npm run seed         # demo accounts (run while the server is stopped)
npm run dev          # API :4000 + dashboard :5173
npm test             # server (vitest + supertest, incl. real e2e) + client (vitest + RTL)
npm run lint         # syntax + import checks
npm run build        # client production build
```

Demo logins (local only): `admin@aegisheal.local / Admin@12345`, `operator@aegisheal.local / Operator@123`, `viewer@aegisheal.local / Viewer@1234`.

## Map

- Agent pipeline: `server/src/agent/orchestrator.js` (steps 1–7), analysis in `agent/*Analyzer.js`, policy in `agent/guardrails.js`, learning in `agent/learning.js`.
- Detection rules: `server/src/detection/rules.js`. Failure signatures: `server/src/agent/knowledgeBase.js`.
- Recovery actions (frozen whitelist): `server/src/recovery/actions/`.
- DevOps layer: `server/src/services/supervisor.js`; demo service: `services/targets/demoService.js`.
- API: `server/src/routes/*` assembled in `server/src/app.js`. Docs: `docs/API.md`.
- UI: `client/src/pages/*`, components in `client/src/components/{ui,layout,charts,agent,incidents,services}`.

## Rules (full list: docs/AGENT_RESTRICTIONS.md, Part B)

1. Never add a code path that executes shell commands from user, log or LLM input; new actions go in `recovery/actions/` and the frozen registry.
2. Every new endpoint: zod validation (`.strict()` bodies) + the right `requireRole`.
3. LLM output must stay schema-validated with enum-restricted signatures/actions; the local analyser must keep working offline.
4. Do not weaken helmet CSP, rate limits, JSON-only mutations, cookie flags or RBAC.
5. Never commit `server/.env`, `server/data/*`, API keys, `node_modules`, `client/dist`.
6. Add tests with every behaviour change; `npm test` must pass.
7. Keep the white & blue design tokens and `react-icons`.
8. Update `docs/PROGRESS.md` (status) and `docs/MEMORY.md` (decisions/gotchas) when relevant.
9. Real, non-empty conventional commits; never push or force-push without the owner's request.

## Skills

Project skills live in `.claude/skills/`: `run-aegisheal`, `add-recovery-action`, `add-failure-signature`, `release-checklist`.
