import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'aegis_token';

export function signToken(user, { secret, expiresIn }) {
  return jwt.sign({ sub: user.id, role: user.role, tv: user.tokenVersion || 0 }, secret, {
    expiresIn,
    issuer: 'aegisheal',
  });
}

export function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret, { issuer: 'aegisheal' });
  } catch {
    return null;
  }
}

export function cookieOptions(secure) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: Boolean(secure),
    path: '/',
    maxAge: 1000 * 60 * 60 * 24,
  };
}
