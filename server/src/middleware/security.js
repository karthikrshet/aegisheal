import rateLimit from 'express-rate-limit';
import { AppError } from '../lib/errors.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defence in depth (on top of SameSite=strict cookies): state-changing
 * requests must be JSON. HTML forms cannot send application/json cross-site
 * without a CORS preflight, which our CORS policy rejects.
 */
export function requireJsonForMutations(req, _res, next) {
  if (!MUTATING.has(req.method)) return next();
  const length = Number(req.get('content-length') || 0);
  if (length === 0 && !req.get('transfer-encoding')) return next(); // body-less POST (e.g. /logout)
  if (!req.is('application/json')) return next(new AppError(415, 'Content-Type must be application/json', 'UNSUPPORTED_MEDIA_TYPE'));
  next();
}

const limitHandler = (_req, res) =>
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down and try again shortly.' } });

/** Limiters are created per app instance so separate apps (e.g. tests) never share counters. */
export function createLimiters() {
  const base = { standardHeaders: 'draft-7', legacyHeaders: false, handler: limitHandler };
  return {
    api: rateLimit({ ...base, windowMs: 60 * 1000, limit: 600 }),
    action: rateLimit({ ...base, windowMs: 60 * 1000, limit: 60 }),
    login: rateLimit({
      ...base,
      windowMs: 15 * 60 * 1000,
      limit: 20,
      handler: (_req, res) =>
        res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' } }),
    }),
  };
}
