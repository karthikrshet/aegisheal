import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const query = z.object({
  source: z.string().regex(/^[a-z0-9-]{2,40}$/).optional(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export function logRoutes(engine) {
  const r = Router();
  r.get('/', validate({ query }), (req, res) => {
    res.json({ sources: engine.logStore.sources(), logs: engine.logStore.query(req.validQuery) });
  });
  return r;
}
