import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/security.js';
import { COOKIE_NAME, cookieOptions, signToken } from '../auth/tokens.js';

const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).strict();
const changeSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) }).strict();

export function authRoutes(engine) {
  const { users, audit, config } = engine;
  const r = Router();
  const auth = authenticate(users, config.jwtSecret);

  r.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res, next) => {
    try {
      const user = await users.authenticate(req.body.email, req.body.password);
      const token = signToken(user, { secret: config.jwtSecret, expiresIn: config.jwtExpiresIn });
      res.cookie(COOKIE_NAME, token, cookieOptions(config.isProd));
      audit.record({ actor: user.email, action: 'auth.login', ip: req.ip });
      res.json({ user: users.toPublic(user) });
    } catch (err) {
      audit.record({ actor: req.body.email, action: 'auth.login_failed', ip: req.ip, detail: err.message });
      next(err);
    }
  });

  r.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(config.isProd), maxAge: undefined });
    res.json({ ok: true });
  });

  r.get('/me', auth, (req, res) => res.json({ user: req.user }));

  r.post('/change-password', auth, validate({ body: changeSchema }), async (req, res, next) => {
    try {
      const user = await users.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
      res.cookie(COOKIE_NAME, signToken(user, { secret: config.jwtSecret, expiresIn: config.jwtExpiresIn }), cookieOptions(config.isProd));
      audit.record({ actor: user.email, action: 'auth.password_changed', ip: req.ip });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
