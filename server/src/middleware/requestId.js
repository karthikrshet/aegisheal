import crypto from 'node:crypto';

/** Attach a request id (echoed in the X-Request-Id header and in error responses). */
export function requestId(req, res, next) {
  const incoming = req.get('x-request-id');
  req.id = incoming && /^[\w-]{6,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}
