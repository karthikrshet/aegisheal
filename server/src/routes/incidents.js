import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import { STATUSES } from '../incidents/incidentRepository.js';
import { ACTIONS } from '../recovery/actions/index.js';
import { notFound } from '../lib/errors.js';

const idParam = z.object({ id: z.string().regex(/^inc_[a-z0-9_]{4,40}$/) });
const listQuery = z.object({
  status: z.enum([...STATUSES, 'active']).optional(),
  serviceId: z.string().max(40).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  q: z.string().trim().max(100).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const approveSchema = z.object({ actionId: z.enum(Object.keys(ACTIONS)).optional() }).strict();
const reasonSchema = z.object({ reason: z.string().trim().max(500).optional() }).strict();
const noteSchema = z.object({ note: z.string().trim().max(500).optional() }).strict();
const textSchema = z.object({ text: z.string().trim().min(1).max(1000) }).strict();

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export function incidentRoutes(engine) {
  const { incidents, agent } = engine;
  const r = Router();

  r.get('/', validate({ query: listQuery }), (req, res) => res.json(incidents.query(req.validQuery)));

  r.get('/export.csv', (_req, res) => {
    const header = ['number', 'service', 'type', 'severity', 'status', 'detectedAt', 'resolvedAt', 'mttrSeconds', 'rootCause', 'confidence', 'actions', 'resolution'];
    const lines = incidents.all().map((i) =>
      [i.number, i.serviceName, i.type, i.severity, i.status, i.detectedAt, i.resolvedAt, i.mttrMs != null ? (i.mttrMs / 1000).toFixed(1) : '', i.analysis?.rootCause, i.analysis?.confidence, i.attempts.map((a) => a.actionId).join(' > '), i.resolution]
        .map(csvCell)
        .join(','),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aegisheal-incidents-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send([header.join(','), ...lines].join('\n'));
  });

  r.get('/:id', validate({ params: idParam }), (req, res, next) => {
    const incident = incidents.get(req.params.id);
    if (!incident) return next(notFound('Incident not found'));
    res.json({ incident });
  });

  const wrap = (fn) => async (req, res, next) => {
    try {
      res.json({ incident: await fn(req) });
    } catch (err) {
      next(err);
    }
  };

  r.post('/:id/approve', requireRole('operator'), validate({ params: idParam, body: approveSchema }), wrap((req) => agent.approve(req.params.id, { actionId: req.body.actionId, user: req.user })));
  r.post('/:id/reject', requireRole('operator'), validate({ params: idParam, body: reasonSchema }), wrap((req) => agent.reject(req.params.id, { reason: req.body.reason, user: req.user })));
  r.post('/:id/resolve', requireRole('operator'), validate({ params: idParam, body: noteSchema }), wrap((req) => agent.resolveManually(req.params.id, { note: req.body.note, user: req.user })));
  r.post('/:id/notes', requireRole('operator'), validate({ params: idParam, body: textSchema }), wrap((req) => agent.addNote(req.params.id, { text: req.body.text, user: req.user })));

  return r;
}
