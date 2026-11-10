import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import { ROLES } from '../auth/roles.js';

const idParam = z.object({ id: z.string().regex(/^usr_[a-z0-9_]{4,40}$/) });
const createSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
    role: z.enum(ROLES),
  })
  .strict();
const updateSchema = z
  .object({ name: z.string().trim().min(2).max(80).optional(), role: z.enum(ROLES).optional(), active: z.boolean().optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
const resetSchema = z.object({ password: z.string().min(8).max(128) }).strict();

export function userRoutes(engine) {
  const { users, audit } = engine;
  const r = Router();
  r.use(requireRole('admin'));

  const wrap = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };

  r.get('/', (_req, res) => res.json({ users: users.list() }));

  r.post('/', validate({ body: createSchema }), wrap(async (req, res) => {
    const user = await users.create(req.body);
    audit.record({ actor: req.user.email, action: 'user.created', target: user.email, detail: user.role, ip: req.ip });
    res.status(201).json({ user });
  }));

  r.patch('/:id', validate({ params: idParam, body: updateSchema }), wrap(async (req, res) => {
    const user = users.update(req.user.id, req.params.id, req.body);
    audit.record({ actor: req.user.email, action: 'user.updated', target: user.email, detail: JSON.stringify(req.body), ip: req.ip });
    res.json({ user });
  }));

  r.post('/:id/reset-password', validate({ params: idParam, body: resetSchema }), wrap(async (req, res) => {
    const user = await users.resetPassword(req.params.id, req.body.password);
    audit.record({ actor: req.user.email, action: 'user.password_reset', target: user.email, ip: req.ip });
    res.json({ user });
  }));

  r.delete('/:id', validate({ params: idParam }), wrap(async (req, res) => {
    const target = users.getRaw(req.params.id);
    users.remove(req.user.id, req.params.id);
    audit.record({ actor: req.user.email, action: 'user.deleted', target: target?.email, ip: req.ip });
    res.json({ ok: true });
  }));

  return r;
}
