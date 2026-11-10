# Project memory

Durable knowledge about AegisHeal for future maintainers and AI assistants: decisions, non-obvious gotchas and lessons. Read this before changing the agent, the supervisor or the detection rules.

## Key decisions

| Decision | Reason | Where |
|---|---|---|
| Managed services are real child processes | Recovery must be genuine, not simulated numbers | `services/supervisor.js` |
| Supervisor never auto-restarts | All recovery goes through analysis → guardrails → verification → audit | `supervisor.js` exit handler |
| One active incident per service | Prevents two recoveries fighting over one service; extra symptoms are merged | `orchestrator.onServiceChecked` |
| Local analyser is the default AI | Offline, deterministic, explainable; LLM optional and validated | `agent/analyzer.js` |
| LLM can only pick from enums | Safety against hallucination / prompt injection in logs | `agent/llmAnalyzer.js` |
| JSON store with atomic rename | Zero setup for examiners, crash-safe | `lib/store.js` |
| SSE instead of WebSockets | One-way, cookie-auth friendly, works through Vite proxy | `routes/events.js` |
| `API_PORT`, not `PORT` | Tools/IDEs export `PORT` for other apps and hijacked the API | `config/index.js` |

## Gotchas (learned the hard way)

- **Freed Buffers are not released by the first GC.** The demo service runs GC at 0, 50 and 500 ms after clearing the cache; memory is measured as `heapUsed + external`, not RSS.
- **Stale samples re-open incidents.** After a restart or a verified recovery the monitor sets a *detection baseline*; detection ignores older samples. Keep this when changing the monitor.
- **Rolling error rate outlives the fault.** The service resets its request window on reconnect, and the ERROR_SPIKE rule requires a *sustained* rate.
- **Rollback target is the last known good version**, updated only after a verified recovery — never "previous version" (would bounce back to the buggy one).
- **Rate limiters must be per app instance**, otherwise test files share counters.
- **Vite HMR + React context**: editing a module imported by a context file can show "useAuth must be used inside AuthProvider" in dev until a full reload. Not a production issue.
- **Without `JWT_SECRET`**, dev uses a secret persisted in `server/data/.jwt-secret`; production refuses to start.
- **Seed while the server is stopped** — both write the same JSON file.
- The guided demo injects 3 faults while `maxConcurrentRecoveries` is 2: the third waits — this is the blast-radius guardrail working, not a bug.

## Conventions

- Conventional commits (`feat|fix|docs|test|refactor|style|build|ci|chore(scope): message`), one logical change per commit, never empty.
- Server: ESM, zod for every input, `AppError` helpers, no `console.log` (use `createLogger`).
- Client: function components, `useApi` for data, `useLiveEvent` for realtime, tokens from `styles/tokens.css`, icons from `react-icons/fi`.
- Tests next to the layer they cover: `server/tests/*.test.js`, `client/src/test/*`.
