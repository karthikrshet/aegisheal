# API reference

Base URL: `http://localhost:4000/api` (in development the dashboard proxies `/api` from `http://localhost:5173`).

- Auth: httpOnly cookie `aegis_token` set by `POST /auth/login`, or `Authorization: Bearer <token>` for scripts.
- Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) with a body must send `Content-Type: application/json`.
- Errors always look like `{ "error": { "code", "message", "details?", "requestId" } }`.
- Rate limits: 600 requests/min per IP, 20 logins / 15 min, 60 actions / min.

Roles: **V** = viewer, **O** = operator, **A** = admin (each includes the ones before it).
