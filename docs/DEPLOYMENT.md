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
