import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { ACTIVE_STATUSES } from '../incidents/incidentRepository.js';

const pointsQuery = z.object({ points: z.coerce.number().int().min(1).max(300).default(60) });

export function metricsRoutes(engine) {
  const { monitor, supervisor, incidents } = engine;
  const r = Router();

  r.get('/system', validate({ query: pointsQuery }), (req, res) => {
    res.json({ latest: monitor.system.latest() || null, history: monitor.system.last(req.validQuery.points) });
  });

  /** KPI tiles for the dashboard. */
  r.get('/overview', (_req, res) => {
    const all = incidents.all();
    const day = Date.now() - 24 * 3600 * 1000;
    const last24 = all.filter((i) => new Date(i.detectedAt).getTime() >= day);
    const resolved = all.filter((i) => i.status === 'resolved' && i.mttrMs != null);
    const byAgent = resolved.filter((i) => i.attempts.some((a) => a.actor === 'agent'));
    const closed = all.filter((i) => ['resolved', 'escalated', 'rejected'].includes(i.status));
    const mttr = resolved.length ? Math.round(resolved.reduce((s, i) => s + i.mttrMs, 0) / resolved.length) : null;
    const services = supervisor.ids().map((id) => {
      const recent = monitor.history(id).last(30);
      return recent.length ? recent.filter((s) => s.up).length / recent.length : 1;
    });
    res.json({
      servicesTotal: services.length,
      servicesHealthy: supervisor.ids().filter((id) => {
        const latest = monitor.history(id).latest();
        return latest?.up && !incidents.activeFor(id);
      }).length,
      activeIncidents: all.filter((i) => ACTIVE_STATUSES.includes(i.status)).length,
      incidents24h: last24.length,
      totalIncidents: all.length,
      mttrMs: mttr,
      autoRecoveryRate: closed.length ? +(byAgent.length / closed.length).toFixed(2) : null,
      successRate: closed.length ? +(resolved.length / closed.length).toFixed(2) : null,
      availability: +((100 * services.reduce((a, b) => a + b, 0)) / Math.max(services.length, 1)).toFixed(1),
      downtimeSavedMin: +((byAgent.length * 25 - byAgent.reduce((s, i) => s + i.mttrMs / 60000, 0))).toFixed(1),
    });
  });

  return r;
}
