import { Router } from 'express';
import { eventBus } from '../lib/eventBus.js';

const MAX_CLIENTS = 50;
let clients = 0;

/**
 * Server-Sent Events stream for live dashboards. Authenticated via the same
 * httpOnly cookie as the REST API. Sends a heartbeat every 15 s.
 */
export function eventRoutes() {
  const r = Router();
  r.get('/', (req, res) => {
    if (clients >= MAX_CLIENTS) return res.status(503).json({ error: { code: 'BUSY', message: 'Too many live connections' } });
    clients += 1;
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write(`retry: 3000\n\n`);
    res.write(`event: hello\ndata: ${JSON.stringify({ user: req.user.email, at: new Date().toISOString() })}\n\n`);

    const onEvent = (evt) => {
      // Viewers do not need audit entries; keep the stream lean.
      if (evt.type === 'audit' && req.user.role !== 'admin') return;
      res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt.payload)}\n\n`);
    };
    eventBus.on('event', onEvent);
    const heartbeat = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 15000);

    req.on('close', () => {
      clients -= 1;
      clearInterval(heartbeat);
      eventBus.off('event', onEvent);
    });
  });
  return r;
}
