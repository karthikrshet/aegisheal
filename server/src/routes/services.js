import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import { actionLimiter } from '../middleware/security.js';
import { CHAOS_FAULTS } from '../services/registry.js';
import { ACTIONS, describeActions } from '../recovery/actions/index.js';
import { executeAction } from '../recovery/executor.js';
import { badRequest, notFound } from '../lib/errors.js';

const idParam = z.object({ id: z.string().regex(/^[a-z0-9-]{2,40}$/) });
const actionParams = idParam.extend({ actionId: z.enum(Object.keys(ACTIONS)) });
const faultParams = idParam.extend({ fault: z.enum(CHAOS_FAULTS.map((f) => f.id)) });
const deploySchema = z.object({ version: z.string().regex(/^\d+\.\d+\.\d+([-.][\w.]+)?$/, 'Version must look like 1.2.3') }).strict();
const historyQuery = z.object({ points: z.coerce.number().int().min(1).max(300).default(60) });

export function serviceRoutes(engine) {
  const { supervisor, monitor, incidents, audit, logStore } = engine;
  const r = Router();

  const ensure = (req, _res, next) => {
    if (!supervisor.ids().includes(req.params.id)) return next(notFound('Service not found'));
    next();
  };

  const view = (id, points = 1) => {
    const snap = supervisor.snapshot(id);
    const history = monitor.history(id);
    const latest = history.latest() || null;
    const active = incidents.activeFor(id);
    let health = 'healthy';
    if (snap.status === 'crashed' || snap.status === 'unhealthy' || (latest && !latest.up)) health = 'down';
    else if (active) health = 'degraded';
    else if (snap.status !== 'running') health = 'unknown';
    const recent = history.last(30);
    const uptime = recent.length ? Math.round((100 * recent.filter((s) => s.up).length) / recent.length) : null;
    return { ...snap, health, latest, uptimePercent: uptime, activeIncident: active ? { id: active.id, number: active.number, status: active.status, title: active.title } : null, history: points > 1 ? history.last(points) : undefined };
  };

  r.get('/', (_req, res) => res.json({ services: supervisor.ids().map((id) => view(id)) }));

  r.get('/catalog', (_req, res) => res.json({ faults: CHAOS_FAULTS, actions: describeActions() }));

  r.get('/:id', validate({ params: idParam, query: historyQuery }), ensure, (req, res) => {
    res.json({ service: view(req.params.id, req.validQuery.points), deployments: engine.store.filter('deployments', (d) => d.serviceId === req.params.id).slice(-10).reverse() });
  });

  r.post('/:id/actions/:actionId', requireRole('operator'), actionLimiter, validate({ params: actionParams }), ensure, async (req, res, next) => {
    try {
      const result = await executeAction(req.params.actionId, { supervisor, serviceId: req.params.id, logStore, actor: req.user.email });
      audit.record({ actor: req.user.email, action: `manual.${req.params.actionId}`, target: req.params.id, detail: result.ok ? result.output : result.error, ip: req.ip });
      res.status(result.ok ? 200 : 409).json({ result });
    } catch (err) {
      next(err);
    }
  });

  r.post('/:id/chaos/:fault', requireRole('operator'), actionLimiter, validate({ params: faultParams }), ensure, async (req, res, next) => {
    try {
      const { id, fault } = req.params;
      let result;
      if (fault === 'bad-deploy') {
        const snap = supervisor.snapshot(id);
        if (snap.version === snap.nextVersion) throw badRequest(`Already running ${snap.nextVersion}`);
        await supervisor.deploy(id, snap.nextVersion, req.user.email);
        result = `Deployed ${snap.nextVersion}`;
      } else {
        result = await supervisor.callService(id, `/chaos/${fault}`);
      }
      logStore.add(id, 'warn', `[chaos] ${req.user.email} injected fault "${fault}"`);
      audit.record({ actor: req.user.email, action: `chaos.${fault}`, target: id, detail: String(result), ip: req.ip });
      res.json({ ok: true, result });
    } catch (err) {
      next(err);
    }
  });

  r.post('/:id/deploy', requireRole('operator'), actionLimiter, validate({ params: idParam, body: deploySchema }), ensure, async (req, res, next) => {
    try {
      const snap = await supervisor.deploy(req.params.id, req.body.version, req.user.email);
      audit.record({ actor: req.user.email, action: 'service.deploy', target: req.params.id, detail: req.body.version, ip: req.ip });
      res.json({ service: snap });
    } catch (err) {
      next(err);
    }
  });

  for (const op of ['start', 'stop']) {
    r.post(`/:id/${op}`, requireRole('admin'), actionLimiter, validate({ params: idParam }), ensure, async (req, res, next) => {
      try {
        const snap = await supervisor[op](req.params.id);
        audit.record({ actor: req.user.email, action: `service.${op}`, target: req.params.id, ip: req.ip });
        res.json({ service: snap });
      } catch (err) {
        next(err);
      }
    });
  }

  return r;
}
