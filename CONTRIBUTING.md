# Contributing

1. Fork and clone, then `npm install && npm run setup && npm run seed`.
2. Create a branch: `git checkout -b feat/short-name`.
3. Make focused changes and add tests (`server/tests`, `client/src/test`).
4. Run `npm run lint && npm test` — both must pass.
5. Commit with conventional messages: `feat(agent): …`, `fix(ui): …`, `docs: …`, `test: …`. One logical change per commit, never empty commits.
6. Open a pull request using the template; describe what changed and how you verified it.

Read [CLAUDE.md](CLAUDE.md) and [docs/AGENT_RESTRICTIONS.md](docs/AGENT_RESTRICTIONS.md) first — they list the safety rules every change must keep (action whitelist, validation, RBAC, no secrets in git).
