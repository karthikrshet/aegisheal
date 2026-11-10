# Demo / viva script (≈10 minutes)

## Before the demo

1. `npm run dev`, open http://localhost:5173, sign in as **admin**.
2. Optional clean slate: stop the app, `npm run reset-data -- --yes`, `npm run seed`, start again.
3. Keep two browser tabs: **Dashboard** and **Chaos lab**.

## 1. Problem (1 min)

"Monitoring tools detect failures and send alerts, but a human still has to analyse logs and fix the problem. AegisHeal closes the loop: detect → analyse → recover → **verify** → learn."

Show **About project** → objectives and the 7-step methodology.

## 2. Architecture (1 min)

Show the diagram in `docs/ARCHITECTURE.md`. Key point: the three services are **real separate processes** (show their PIDs on a service page), so crashes and rollbacks are real.
