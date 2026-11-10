import { COOKIE_NAME, verifyToken } from '../auth/tokens.js';
import { hasRole } from '../auth/roles.js';
import { forbidden, unauthorized } from '../lib/errors.js';

/**
 * Accepts the httpOnly cookie (browser) or `Authorization: Bearer` (API clients).
 * The user is re-loaded on every request, so disabling a user or changing their
 * password (token version bump) takes effect immediately.
 */
export function authenticate(users, secret) {
  return (req, _res, next) => {
    const header = req.get('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const token = req.cookies?.[COOKIE_NAME] || bearer;
    if (!token) return next(unauthorized());

    const payload = verifyToken(token, secret);
    if (!payload) return next(unauthorized('Session expired, please sign in again'));

    const user = users.getRaw(payload.sub);
    if (!user || !user.active || (user.tokenVersion || 0) !== payload.tv) {
      return next(unauthorized('Session is no longer valid'));
    }
    req.user = users.toPublic(user);
    next();
  };
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!hasRole(req.user.role, role)) return next(forbidden(`Requires ${role} role`));
    next();
  };
}
