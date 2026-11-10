# AGENTS.md

Instructions for any AI coding agent (Codex, Copilot, Cursor, Claude Code, …) working in this repository.

The canonical instructions are in [CLAUDE.md](CLAUDE.md) — follow them exactly. Summary:

- Setup: `npm install && npm run setup && npm run seed`, run with `npm run dev`, verify with `npm test` and `npm run lint`.
- The recovery agent may only use the frozen whitelist of actions in `server/src/recovery/actions/`.
- Validate every input with zod, protect every route with the right role, keep security middleware intact.
- Never commit secrets or runtime data (`server/.env`, `server/data/*`).
- Record status in `docs/PROGRESS.md` and decisions / gotchas in `docs/MEMORY.md`.
- Restrictions: [docs/AGENT_RESTRICTIONS.md](docs/AGENT_RESTRICTIONS.md) · Skills: [docs/AGENT_SKILLS.md](docs/AGENT_SKILLS.md).
