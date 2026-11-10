import { createLogger } from '../lib/logger.js';

const log = createLogger('http');

/**
 * Access log: one line per request with status and duration.
 * Errors (5xx) log at warn, slow requests (> 1 s) at info, the rest at debug.
 * The SSE stream is skipped (it is a long-lived connection).
 */
export function requestLogger(req, res, next) {
  if (req.path === '/api/events') return next();
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`;
    if (res.statusCode >= 500) log.warn(line, { requestId: req.id });
    else if (ms > 1000) log.info(`slow: ${line}`);
    else log.debug(line);
  });
  next();
}
