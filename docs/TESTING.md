# Testing

```bash
npm test            # everything (server, then client)
npm run lint        # syntax check (server) + import resolution (client)
npm run test --workspace server
npm run test --workspace client
npm run test:watch --workspace server   # re-run on save
```

Last verified run: **143 tests passing** (server 110 in 13 files, client 33 in 6 files) on Windows 11, Node.js 22.17.

## Server (Vitest + Supertest)

| File | What it proves |
|---|---|
| `ringBuffer.test.js` | bounded buffers never grow beyond capacity |
| `store.test.js` | CRUD, atomic persistence, corrupt-file recovery with backup, collection caps |
| `password.test.js` | password policy, bcrypt, role ranking, JWT tamper/secret rejection |
| `config.test.js` | defaults, validation messages, production refuses weak `JWT_SECRET` |
| `rules.test.js` | every detection rule, consecutive-sample logic, detector ordering |
| `analyzer.test.js` | each failure type maps to the right signature and first action; LLM fallback |
| `agentPolicy.test.js` | all guardrails (whitelist, modes, confidence, risk, attempts, cooldown, circuit, blast radius), learning re-ranking, settings validation |
| `logStore.test.js` | log parsing, level sanitising, truncation, filters |
| `userService.test.js` | lockout, last-admin protection, token version bump, disabled users |
| `incidents.test.js` | numbering, step timing, queries, frozen action registry, executor never throws |
| `collector.test.js` | evidence bundle and summary |
| `api.test.js` | security headers, 401/403/404/415/400 paths, cookie flags, RBAC per role, admin APIs, audit trail |
| `selfHealing.e2e.test.js` | **real processes**: crash → restart, bad deploy → rollback, dependency loss → reconnect, supervised approval, observe + reject + manual fix, CSV export, learning |

The e2e suite starts the real `order-service` child process on port 5711 and needs ~15 s.
