---
name: release-checklist
description: Prepare AegisHeal for a release or project submission — tests, build, docs, progress, secrets check, then commit (push only if the owner asks).
---

# Release checklist

1. `npm test` — all server and client tests must pass. Record the counts.
2. `npm run lint` and `npm run build` — both must succeed.
3. Manual smoke: `npm run dev`, sign in, Chaos lab → Run guided demo, confirm 3 incidents resolve.
4. Secrets check — these must print nothing:
   ```bash
   git ls-files | grep -E "(^|/)\.env$|server/data/|node_modules|client/dist"
   git grep -nE "sk-ant-[A-Za-z0-9]" -- . ":!docs" ":!README.md"
   ```
5. Update `docs/PROGRESS.md` (date, test counts, verification log) and `CHANGELOG.md`.
6. Add new decisions / gotchas to `docs/MEMORY.md`.
7. Bump `version` in the three `package.json` files if releasing.
8. Commit with a conventional message. Push / tag only when the project owner explicitly asks.
