/**
 * End-to-end: real child processes, real faults, real recovery.
 * Proves every step of the methodology works together.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { makeApp, loginAgent, waitFor } from './helpers.js';

let engine;
let app;
let admin;
const SVC = 'order-service';

const latestIncident = () => engine.incidents.all().filter((i) => i.serviceId === SVC).at(-1);
const waitHealthy = () => waitFor(() => engine.monitor.history(SVC).latest()?.statusCode === 200 && !engine.incidents.activeFor(SVC));

beforeAll(async () => {
  ({ engine, app } = await makeApp({ services: [SVC], basePort: 5711 }));
  // Fast verification for tests.
  engine.settings.update({ guardrails: { verificationChecks: 2, cooldownMs: 0 } });
  await engine.start();
  admin = await loginAgent(request, app);
  await waitHealthy();
}, 30000);

afterAll(async () => {
  await engine.stop();
});

describe('autonomous self-healing', () => {
  it('detects a crash, restarts the service and verifies recovery', async () => {
    const res = await admin.post(`/api/services/${SVC}/chaos/crash`);
    expect(res.status).toBe(200);
    const incident = await waitFor(() => {
      const i = latestIncident();
      return i?.status === 'resolved' ? i : null;
    });
    expect(incident.type).toBe('SERVICE_DOWN');
    expect(incident.analysis.signatureId).toBe('process-crash');
    expect(incident.attempts[0].actionId).toBe('restart-service');
    expect(incident.attempts[0].verification.passed).toBe(true);
    expect(incident.steps.every((s) => s.status === 'done')).toBe(true);
    expect(incident.mttrMs).toBeGreaterThan(0);
    expect(engine.supervisor.snapshot(SVC).status).toBe('running');
  });

  it('rolls back a faulty deployment', async () => {
    await waitHealthy();
    await admin.post(`/api/services/${SVC}/chaos/bad-deploy`);
    const incident = await waitFor(() => {
      const i = latestIncident();
      return i?.status === 'resolved' && i.type === 'ERROR_SPIKE' ? i : null;
    });
    expect(incident.analysis.signatureId).toBe('bad-deployment');
    expect(incident.attempts.map((a) => a.actionId)).toContain('rollback-deployment');
    expect(engine.supervisor.snapshot(SVC).version).toBe('1.8.0');
  });

  it('reconnects a lost dependency', async () => {
    await waitHealthy();
    await admin.post(`/api/services/${SVC}/chaos/dependency-loss`);
    const incident = await waitFor(() => {
      const i = latestIncident();
      return i?.status === 'resolved' && i.type === 'DEPENDENCY_FAILURE' ? i : null;
    });
    expect(incident.attempts[0].actionId).toBe('reconnect-dependency');
  });
});

describe('human-in-the-loop', () => {
  it('waits for approval in supervised mode, then recovers on approve', async () => {
    await waitHealthy();
    await admin.put('/api/agent/mode').send({ mode: 'supervised' });
    await admin.post(`/api/services/${SVC}/chaos/job-failure`);
    const pending = await waitFor(() => {
      const i = latestIncident();
      return i?.status === 'awaiting_approval' ? i : null;
    });
    expect(pending.pendingAction).toBe('retry-failed-operations');

    const approved = await admin.post(`/api/incidents/${pending.id}/approve`).send({});
    expect(approved.status).toBe(200);
    const done = await waitFor(() => (engine.incidents.get(pending.id).status === 'resolved' ? engine.incidents.get(pending.id) : null));
    expect(done.approval.by).toBe('admin@test.local');
    expect(done.attempts[0].actor).toMatch(/approved/);
  });

  it('only recommends in observe mode and allows rejecting', async () => {
    await waitHealthy();
    await admin.put('/api/agent/mode').send({ mode: 'observe' });
    await admin.post(`/api/services/${SVC}/chaos/cpu-spike`);
    const open = await waitFor(() => {
      const i = latestIncident();
      return i?.status === 'open' ? i : null;
    });
    expect(open.attempts).toHaveLength(0);
    expect(open.pendingAction).toBe('throttle-workload');
    const rejected = await admin.post(`/api/incidents/${open.id}/reject`).send({ reason: 'investigating manually' });
    expect(rejected.body.incident.status).toBe('rejected');
    // operator fixes it by hand
    const manual = await admin.post(`/api/services/${SVC}/actions/throttle-workload`);
    expect(manual.body.result.ok).toBe(true);
    await admin.put('/api/agent/mode').send({ mode: 'autonomous' });
  });

  it('exports incident history as CSV', async () => {
    const res = await admin.get('/api/incidents/export.csv');
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.split('\n')[0]).toContain('number,service,type');
    expect(res.text).toContain('INC-0001');
  });

  it('updates the learning model with outcomes', async () => {
    const rows = engine.learning.summary();
    expect(rows.find((r) => r.signatureId === 'process-crash' && r.actionId === 'restart-service').successes).toBeGreaterThanOrEqual(1);
  });
});
