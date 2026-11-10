# AegisHeal 🛡️

**Agentic AI-Enabled Autonomous Framework for Intelligent Software Fault Recovery and Resilience**

AegisHeal is a self-healing platform: it **monitors** running services, **detects** failures, **collects** logs and metrics, lets an **AI agent analyse** the root cause, **decides** on a safe predefined recovery action, **executes** it through DevOps automation (restart, rollback, clear cache, reconnect, retry, throttle) and **verifies** that the service is healthy again. Every incident is stored so the agent learns which actions work best.



![stack](https://img.shields.io/badge/React-18-2563eb) ![stack](https://img.shields.io/badge/Node.js-20%2B-2563eb) ![tests](https://img.shields.io/badge/tests-143%20passing-16a34a) ![license](https://img.shields.io/badge/license-MIT-64748b)

## ✨ Features

| Area | What you get |
|---|---|
| **Real monitoring** | 3 real micro-services run as separate OS processes; health, response time, CPU, memory, error rate, failed jobs and dependency state are probed every 2 s, plus host CPU / memory. |
| **Failure detection** | 7 rules: service down / crash, error-rate spike, memory leak, CPU saturation, high latency, dependency loss, failing background jobs. |
| **AI root-cause analysis** | Offline reasoning engine scores 7 failure signatures with evidence and a confidence score. Optional **Claude (Anthropic)** analysis with strict schema validation and a local second opinion. |
| **Automated recovery** | 6 predefined DevOps actions: restart service, roll back deployment, clear cache, reconnect dependency, retry failed operations, throttle workload. |
| **Verification** | A recovery only counts when the service passes N consecutive healthy checks; otherwise the agent tries the next best action or escalates. |
| **Learning** | Success rate per (failure, action) re-ranks future decisions. |
| **Guardrails** | Whitelisted actions only, autonomy modes, confidence threshold, high-risk approval, max attempts, cooldowns, circuit breaker, blast-radius limit. |
| **Human in the loop** | *Autonomous*, *Supervised* (approve each action) and *Observe-only* modes; approve / reject / resolve from the UI. |
| **Chaos lab** | Inject 7 real faults (crash, leak, CPU spike, latency, dependency loss, failing jobs, bad deployment) or run a one-click guided demo. |
| **Dashboard** | Clean white & blue React UI with live charts (Server-Sent Events), 7-step pipeline view, incident timeline, reports, CSV export. |
| **Security** | JWT in httpOnly SameSite=Strict cookies, bcrypt, account lockout, RBAC (admin / operator / viewer), zod validation on every input, Helmet CSP, rate limiting, audit log. |

## 🧭 How it works

```
 ┌──────────────┐   every 2 s   ┌──────────┐   ┌──────────┐   ┌──────────────┐
 │ 1 Monitor    │ ────────────▶ │ 2 Detect │ ─▶│ 3 Collect│ ─▶│ 4 AI Analyze │
 └──────────────┘               └──────────┘   └──────────┘   └──────┬───────┘
        ▲                                                            ▼
 ┌──────┴───────┐   healthy?    ┌──────────┐   ┌──────────────────────────────┐
 │ 7 Verify     │ ◀──────────── │ 6 Recover│ ◀─│ 5 Decide (playbook+learning  │
 └──────────────┘   no → next   └──────────┘   │   + guardrails / approval)   │
        │           action                     └──────────────────────────────┘
        ▼
   Incident history  →  learning model  →  better decisions next time
```

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/AGENT_DESIGN.md](docs/AGENT_DESIGN.md).

## 📋 Prerequisites

| Tool | Version | Check | Download |
|---|---|---|---|
| **Node.js** (includes npm) | 20 LTS or newer | `node -v` | https://nodejs.org (choose **LTS**) |
| **Git** | any recent | `git --version` | https://git-scm.com/downloads |
| A modern browser | Chrome, Edge, Firefox | — | — |

Nothing else is needed: no database server, no Docker, no API key. The JSON database is created automatically.

Free ports used by default: **5173** (dashboard), **4000** (API), **5101-5103** (demo services). All can be changed in `server/.env`.

## 🚀 Quick start (5 commands)

```bash
git clone https://github.com/<your-username>/aegisheal.git
cd aegisheal
npm run bootstrap
npm run dev
```

Then open **http://localhost:5173** and sign in with `admin@aegisheal.local` / `Admin@12345`.

`npm run bootstrap` = install all packages → create `server/.env` with a random secret → create demo accounts.

## 🪜 Step-by-step installation (one command at a time)

Run each command, wait for it to finish, then run the next one. A full copy-paste list for every OS is in [docs/SETUP_COMMANDS.md](docs/SETUP_COMMANDS.md).

**1. Check Node.js and Git are installed**

```bash
node -v
```

```bash
git --version
```

You should see `v20.x` (or newer) and a git version. If not, install them from the links above and reopen the terminal.

**2. Download the project**

```bash
git clone https://github.com/<your-username>/aegisheal.git
```

```bash
cd aegisheal
```

(Or download the ZIP from GitHub, extract it and open a terminal inside the folder.)

**3. Install dependencies** (takes 1–3 minutes)

```bash
npm install
```

**4. Create the configuration file** `server/.env` with a strong random secret

```bash
npm run setup
```

**5. Create the demo accounts**

```bash
npm run seed
```

**6. Start AegisHeal** (API + dashboard together)

```bash
npm run dev
```

Wait for `AegisHeal API listening on http://localhost:4000` and `Local: http://localhost:5173`.

**7. Open the dashboard** → **http://localhost:5173**

| Role | E-mail | Password | Can do |
|---|---|---|---|
| Admin | `admin@aegisheal.local` | `Admin@12345` | everything: settings, users, agent mode, audit |
| Operator | `operator@aegisheal.local` | `Operator@123` | run recoveries, chaos lab, approve agent actions |
| Viewer | `viewer@aegisheal.local` | `Viewer@1234` | read-only dashboards |

> 🔐 Change the admin password after the first login (top-right avatar → *Change password*).

**8. Stop** — press `Ctrl + C` in the terminal.

## 🎬 Try the self-healing demo (2 minutes)

1. Sign in as **admin** and keep the **Dashboard** open.
2. Go to **Chaos lab** → click **Run guided demo** → **Start demo**. Three real failures are injected at once:
   - API Gateway **crashes** → agent diagnoses *Application crash* → **restarts** it.
   - Order Service **leaks memory** → *Memory leak* → **clears the cache**.
   - Payment Service gets a **faulty release** → *Faulty deployment* → **rolls back**.
3. Watch the 7-step pipeline light up and the toasts confirm each recovery (typically 2–5 s each).
4. Open **Incidents** → click an incident to see the AI analysis, evidence, actions, verification probes and timeline.
5. Go to **Agent control** → switch to **Supervised**, inject a fault again and **approve** the proposed action yourself.
6. Check **Reports** for MTTR, success rate and action effectiveness, and **Playbooks** for what the agent learned.

A full viva / presentation script is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

🎥 **Demo video:** a 3-minute cinematic walkthrough (narrated, with soundtrack) can be regenerated with [tools/demo-video](tools/demo-video/README.md). Upload the rendered `media/AegisHeal-Demo.mp4` to YouTube or GitHub Releases rather than committing it.

## 🧰 Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Start API (port 4000) and dashboard (port 5173) with auto-reload |
| `npm test` | Run all server and client tests |
| `npm run lint` | Syntax / import checks for server and client |
| `npm run build` | Build the optimised dashboard into `client/dist` |
| `npm start` | Build, then serve everything from one port (http://localhost:4000) |
| `npm run seed` | (Re)create demo accounts — safe to run again |
| `npm run setup` | Create `server/.env` if it does not exist |
| `npm run reset-data -- --yes` | Delete all incidents, users and settings (stop the app first) |

## ⚙️ Configuration

All settings live in `server/.env` (created by `npm run setup` from [`server/.env.example`](server/.env.example)).

| Variable | Default | Meaning |
|---|---|---|
| `API_PORT` | `4000` | Port of the API server |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser origin(s), comma-separated |
| `JWT_SECRET` | random (setup) | Secret for login tokens — **required** (32+ chars) in production |
| `JWT_EXPIRES_IN` | `8h` | Session lifetime |
| `DATA_DIR` | `./data` | Where the JSON database is stored |
| `SERVICE_BASE_PORT` | `5101` | First of 3 ports for the demo services |
| `MONITOR_INTERVAL_MS` | `2000` | Probe interval |
| `AGENT_MODE` | `autonomous` | Initial mode: `autonomous`, `supervised`, `observe` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | demo values | First admin account |
| `AI_PROVIDER` | `local` | `local` (offline) or `claude` |
| `ANTHROPIC_API_KEY` | empty | Needed only for `AI_PROVIDER=claude` |
| `AI_MODEL` | `claude-opus-5-5` | Claude model used for analysis |
| `COOKIE_SECURE` | `auto` | `auto` = secure cookies in production only |
| `LOG_LEVEL` | `info` | `error`, `warn`, `info`, `debug` |

Thresholds, guardrails, allowed actions and the AI provider can also be changed live from **Settings** in the dashboard (admin only).

### Optional: enable Claude AI analysis

1. Get an API key from https://console.anthropic.com
2. In `server/.env` set `AI_PROVIDER=claude` and `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart `npm run dev`. The Agent page shows *Claude (Anthropic) + local second opinion*.

If the key is missing, invalid, rate-limited or the response fails validation, AegisHeal silently falls back to the local engine — recovery never depends on the network.

## 🗂️ Project structure

```
aegisheal/
├── client/                 React 18 + Vite dashboard
│   └── src/
│       ├── api/            fetch client + endpoint wrappers
│       ├── components/     ui/, layout/, charts/, agent/, incidents/, services/
│       ├── context/        Auth, Toast, Live (Server-Sent Events)
│       ├── hooks/          useApi, useDebounce, useThrottledReload …
│       ├── pages/          Dashboard, Services, Incidents, Agent, Chaos lab …
│       ├── styles/         white & blue design tokens and components
│       └── test/           Vitest + Testing Library
├── server/                 Node.js + Express API and the agent
│   ├── src/
│   │   ├── agent/          knowledge base, analysers, guardrails, learning, orchestrator
│   │   ├── monitoring/     probes, host metrics, monitor loop
│   │   ├── detection/      failure rules + detector
│   │   ├── collection/     log store + evidence collector
│   │   ├── recovery/       predefined actions + executor
│   │   ├── verification/   recovery verifier
│   │   ├── services/       supervisor (DevOps layer) + demo micro-service
│   │   ├── routes/         REST API + SSE
│   │   └── …               auth, users, settings, audit, middleware, lib
│   └── tests/              unit, API and real end-to-end self-healing tests
├── docs/                   architecture, API, agent design, guides, progress, memory
├── .claude/                AI-assistant skills and launch config
├── CLAUDE.md / AGENTS.md   rules for AI coding assistants
└── Dockerfile, docker-compose.yml, .github/workflows/ci.yml
```

## 🧪 Testing

```bash
npm test
```

- **Server (110 tests):** detection rules, analyser, guardrails, learning, store, auth, API security, and **real end-to-end tests** that crash / break real processes and assert the agent recovers them.
- **Client (33 tests):** formatters, API client, permissions, UI components, pipeline, login.

See [docs/TESTING.md](docs/TESTING.md).

## 🏭 Production & Docker

```bash
npm start
```

Serves the built dashboard and API from **http://localhost:4000**. Set `NODE_ENV=production` and a strong `JWT_SECRET` in `server/.env` first.

With Docker:

```bash
docker compose up --build
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 🌐 Publish to your own GitHub

Only source code and docs are committed. Secrets (`.env`), the database (`server/data`), `node_modules` and build output are excluded by [`.gitignore`](.gitignore).

```bash
git remote add origin https://github.com/<your-username>/aegisheal.git
```

```bash
git branch -M main
```

```bash
git push -u origin main
```

Before pushing, double-check nothing private is staged:

```bash
git status
```

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `Port 4000 is already in use` | Change `API_PORT` in `server/.env` (dashboard proxy follows it) or close the other program. |
| Dashboard says *Cannot reach the AegisHeal server* | The API is not running — start it with `npm run dev` and check the terminal for errors. |
| Services show **Down** right after start | Ports 5101-5103 are busy — change `SERVICE_BASE_PORT`. |
| Logged out after restarting | Expected only if `JWT_SECRET` changed. Run `npm run setup` once so it stays fixed. |
| `npm install` fails | Use Node.js 20+ (`node -v`), delete `node_modules` and run `npm install` again. |
| Forgot admin password | Stop the app, run `npm run reset-data -- --yes`, then `npm run seed`. |

More: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## 📚 Documentation

| Document | For |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Product plan mapping the synopsis objectives to features |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, components and data flow |
| [docs/AGENT_DESIGN.md](docs/AGENT_DESIGN.md) | How the AI agent analyses, decides, acts, verifies and learns |
| [docs/AGENT_RESTRICTIONS.md](docs/AGENT_RESTRICTIONS.md) | Guardrails of the product agent and rules for AI coding assistants |
| [docs/AGENT_SKILLS.md](docs/AGENT_SKILLS.md) | Agent capabilities and the Claude Code skills in `.claude/skills` |
| [docs/API.md](docs/API.md) | REST + SSE API reference |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Using every screen of the dashboard |
| [docs/SETUP_COMMANDS.md](docs/SETUP_COMMANDS.md) | Copy-paste install commands for Windows, macOS and Linux |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Viva / presentation walkthrough |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy and how to run tests |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production, Docker and hardening checklist |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common problems and fixes |
| [docs/PROGRESS.md](docs/PROGRESS.md) | What is complete, verified and planned |
| [docs/MEMORY.md](docs/MEMORY.md) | Project memory: decisions, gotchas and lessons learned |
| [SECURITY.md](SECURITY.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [CHANGELOG.md](CHANGELOG.md) | Policies and history |

## 🙏 Acknowledgements

Literature that shaped the design: Schneider, Barker & Dobson (2015); Jeong & Shin (2026); Baqar, Khanda & Naqvi (2025); Zhang et al. (2025); Yazdanparast (2024); Rajput & Sikka (2019).

## 📄 License

[MIT](LICENSE) © 2026 Karthik Rajesh Shet
