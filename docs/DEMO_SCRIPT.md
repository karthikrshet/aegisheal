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

## 3. Autonomous recovery (3 min)

1. Chaos lab → **Run guided demo** → Start.
2. Switch to the Dashboard: three incidents appear, the pipeline animates, toasts report "resolved" in a few seconds.
3. Open the **Faulty deployment** incident:
   - Evidence: error spike, recent deployment of v3.2.0, new stack traces.
   - Diagnosis 95 % confidence → playbook *rollback → restart*.
   - Attempt 1: rolled back 3.2.0 → 3.1.4; verification 3/3 healthy checks.
   - MTTR ≈ 2–3 s.
4. Mention the different root causes and actions for the other two incidents.

## 4. Human in the loop & guardrails (2 min)

1. Agent control → **Supervised**.
2. Chaos lab → **Failing jobs** on Payment Service.
3. Sidebar badge shows 1 pending approval → open it → *The agent proposes: Retry failed operations* → **Approve & run** → resolved.
4. Show the guardrails list (whitelist, confidence, cooldown, circuit breaker, blast radius) and Settings.
5. Switch back to **Autonomous**.
