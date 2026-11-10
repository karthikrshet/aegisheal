# Security policy

## Reporting a vulnerability

Please do **not** open a public issue. E-mail the maintainer or use GitHub's *Report a vulnerability* (Security tab). Include steps to reproduce; you will get a reply within 7 days.

## Built-in protections

| Area | Measure |
|---|---|
| Authentication | bcrypt (cost 10), JWT in httpOnly `SameSite=Strict` cookies, `Secure` in production, token version revokes sessions on password/role change |
| Brute force | 20 logins / 15 min per IP, account lock after 5 failed attempts, timing-safe unknown-user path |
| Authorization | role hierarchy viewer < operator < admin on every route; last-admin and self-demotion protection |
| Input | zod validation (strict bodies, regex ids, numeric ranges), 100 kB body limit, JSON-only mutations (CSRF defence) |
| Output | central error handler never leaks stack traces; CSV export neutralises formula injection |
| Headers | Helmet with strict CSP (`script-src 'self'`, `frame-ancestors 'none'`), no `X-Powered-By` |
| Agent safety | frozen whitelist of recovery actions, schema-validated LLM output, guardrails, audit trail |
| Managed services | bind to 127.0.0.1, control endpoints need a random per-run token |
| Secrets | `.env`, data and keys are git-ignored; production refuses a weak `JWT_SECRET` |

## Supported versions

Only the latest `main` branch receives fixes.
