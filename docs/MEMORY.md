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
