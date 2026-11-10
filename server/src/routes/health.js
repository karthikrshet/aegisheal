import { Router } from 'express';

/** Public liveness endpoint (no auth) — used by uptime checks and the login page. */
export function healthRoutes(engine) {
  const r = Router();
  r.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      name: 'AegisHeal',
      version: '1.0.0',
      uptimeSec: Math.round(process.uptime()),
      monitor: engine.monitor.status().running ? 'running' : 'stopped',
      time: new Date().toISOString(),
    });
  });
  return r;
}
