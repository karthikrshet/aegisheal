import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('http');

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

/** Central error handler: never leaks stack traces or internals to clients. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON', requestId: req.id } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request body too large', requestId: req.id } });
  }

  const status = err instanceof AppError ? err.status : Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) log.error(`${req.method} ${req.originalUrl} failed`, { error: err?.message, stack: err?.stack, requestId: req.id });

  res.status(status).json({
    error: {
      code: err instanceof AppError ? err.code : status >= 500 ? 'INTERNAL' : 'ERROR',
      message: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message,
      details: err instanceof AppError ? err.details : undefined,
      requestId: req.id,
    },
  });
}
