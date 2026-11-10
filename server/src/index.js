import { config } from './config/index.js';
import { createEngine } from './engine.js';
import { createApp } from './app.js';
import { ensureAdmin } from './users/bootstrap.js';
import { logger, setLogLevel } from './lib/logger.js';

setLogLevel(config.logLevel);

async function main() {
  if (config.jwtSecretGenerated) {
    logger.warn('JWT_SECRET missing or weak: using a temporary random secret (sessions reset on restart). Set it in server/.env');
  }
  const engine = createEngine(config);
  await ensureAdmin(engine.users, config.admin);

  const app = createApp(engine);
  const server = app.listen(config.port, () => {
    logger.info(`AegisHeal API listening on http://localhost:${config.port}`);
  });
  server.on('error', (err) => {
    logger.error(err.code === 'EADDRINUSE' ? `Port ${config.port} is already in use. Change PORT in server/.env` : err.message);
    process.exit(1);
  });

  await engine.start();

  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    logger.info(`${signal} received — shutting down`);
    server.close();
    await engine.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', { reason: String(reason) }));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});
