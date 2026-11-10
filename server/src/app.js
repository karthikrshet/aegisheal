import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { SERVER_ROOT } from './config/index.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authenticate } from './middleware/auth.js';
import { createLimiters, requireJsonForMutations } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { serviceRoutes } from './routes/services.js';
import { incidentRoutes } from './routes/incidents.js';
import { agentRoutes } from './routes/agent.js';
import { metricsRoutes } from './routes/metrics.js';
import { logRoutes } from './routes/logs.js';
import { reportRoutes } from './routes/reports.js';
import { settingsRoutes } from './routes/settings.js';
import { userRoutes } from './routes/users.js';
import { auditRoutes } from './routes/audit.js';
import { eventRoutes } from './routes/events.js';

/** Build the Express application around an engine (no listening here — testable). */
export function createApp(engine) {
  const { config } = engine;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(requestId);
  app.use(requestLogger);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.clientOrigin.includes(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const limiters = createLimiters();
  const api = express.Router();
  api.use(limiters.api);
  api.use(requireJsonForMutations);
  api.use('/health', healthRoutes(engine));
  api.use('/auth', authRoutes(engine, limiters));

  // Everything below requires a signed-in user.
  api.use(authenticate(engine.users, config.jwtSecret));
  api.use('/services', serviceRoutes(engine, limiters));
  api.use('/incidents', incidentRoutes(engine));
  api.use('/agent', agentRoutes(engine));
  api.use('/metrics', metricsRoutes(engine));
  api.use('/logs', logRoutes(engine));
  api.use('/reports', reportRoutes(engine));
  api.use('/settings', settingsRoutes(engine));
  api.use('/users', userRoutes(engine));
  api.use('/audit', auditRoutes(engine));
  api.use('/events', eventRoutes(engine));
  api.use(notFoundHandler);

  app.use('/api', api);

  // Production: serve the built React app from the same origin.
  const dist = path.resolve(SERVER_ROOT, '..', 'client', 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    app.get('/', (_req, res) => res.type('text').send('AegisHeal API is running. Start the dashboard with `npm run dev` (http://localhost:5173).'));
  }

  app.use(errorHandler);
  return app;
}
