import { loadConfig } from '../src/config/index.js';
import { createEngine } from '../src/engine.js';
import { createApp } from '../src/app.js';
import { ensureAdmin } from '../src/users/bootstrap.js';
import { SERVICE_DEFINITIONS } from '../src/services/registry.js';
import { sleep } from '../src/lib/time.js';

export const ADMIN = { email: 'admin@test.local', password: 'Admin@12345' };

export function testConfig(env = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
    MONITOR_INTERVAL_MS: '500',
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    LOG_LEVEL: 'error',
    ...env,
  });
}

/** In-memory engine + express app. `services` limits which demo services are managed. */
export async function makeApp({ services = [], basePort = 5600, env } = {}) {
  const config = testConfig(env);
  const definitions = SERVICE_DEFINITIONS.filter((d) => services.includes(d.id)).map((d, i) => ({ ...d, portOffset: i }));
  const engine = createEngine(config, { inMemory: true, definitions, basePort });
  await ensureAdmin(engine.users, { name: 'Admin', ...ADMIN });
  const app = createApp(engine);
  return { engine, app, config };
}

export async function loginAgent(request, app, creds = ADMIN) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send(creds);
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export async function waitFor(fn, { timeoutMs = 25000, intervalMs = 200 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await sleep(intervalMs);
  }
  throw new Error('waitFor timed out');
}

/** Minimal evidence context for analyser unit tests. */
export function makeContext({ anomalies = [], logs = [], service = {}, lastDeployment = null, deployedRecently = false } = {}) {
  return {
    service: { id: 'svc', name: 'Svc', dependency: 'db', status: 'running', version: '1.0.0', lastGoodVersion: '1.0.0', exitCode: null, ...service },
    anomalies: anomalies.map((type) => ({ type, title: type, severity: 'high', evidence: [`${type} evidence`] })),
    logs: logs.map((message, i) => ({ id: i, level: 'error', message, ts: new Date().toISOString() })),
    errorLogs: [],
    samples: [],
    latestSample: null,
    lastDeployment,
    deployedRecently,
    recentIncidents: [],
  };
}
