import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';

const query = z.object({
  actor: z.string().trim().max(254).optional(),
  action: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export function auditRoutes(engine) {
  const r = Router();
  r.get('/', requireRole('admin'), validate({ query }), (req, res) => res.json(engine.audit.query(req.validQuery)));
  return r;
}
