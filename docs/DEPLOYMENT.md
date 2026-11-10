# Deployment

## Option 1 — Node.js on one port

```bash
npm ci
```

```bash
npm run setup
```

Edit `server/.env`:

```ini
NODE_ENV=production
API_PORT=4000
CLIENT_ORIGIN=https://aegis.example.com
JWT_SECRET=<48+ random hex characters>
ADMIN_PASSWORD=<a strong password>
```

```bash
npm start
```

`npm start` builds the dashboard into `client/dist` and the API serves it together with `/api` on `API_PORT`. Put it behind HTTPS (nginx, Caddy, IIS) — cookies are `Secure` in production.

To keep it running after logout use a process manager, e.g. `npx pm2 start server/src/index.js --name aegisheal`.

## Option 2 — Docker

```bash
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
```

```bash
docker compose up --build -d
```

Open http://localhost:4000. Data is kept in the `aegis-data` volume. The image runs as the unprivileged `node` user and has a health check on `/api/health`.

> Serving over plain HTTP inside a lab network? Set `COOKIE_SECURE=false`, otherwise browsers drop the login cookie.

## Production checklist

- [ ] `NODE_ENV=production` and a unique `JWT_SECRET` (the server refuses to start with a weak one).
- [ ] Changed the default admin password; removed demo operator / viewer accounts you do not need.
- [ ] HTTPS in front of the app; `CLIENT_ORIGIN` set to the public URL.
- [ ] `server/data` (or the Docker volume) is backed up — it holds users, incidents, audit and learning.
- [ ] `LOG_LEVEL=info` (use `debug` only while troubleshooting).
- [ ] Optional: `AI_PROVIDER=claude` with `ANTHROPIC_API_KEY` stored only in the server environment.
- [ ] Ports `SERVICE_BASE_PORT … +2` are free on the host (demo services bind to 127.0.0.1 only).
