import { describe, it, expect, beforeEach } from 'vitest';
import { JsonStore } from '../src/lib/store.js';
import { IncidentRepository, STEP_DEFS, summary } from '../src/incidents/incidentRepository.js';
import { executeAction } from '../src/recovery/executor.js';
import { getAction, ACTIONS } from '../src/recovery/actions/index.js';

const anomaly = (over = {}) => ({
  serviceId: 'svc-a',
  serviceName: 'Service A',
  type: 'HIGH_CPU',
  title: 'CPU saturation',
  severity: 'high',
  evidence: ['cpu 95%'],
  ...over,
});

let repo;
beforeEach(() => {
  repo = new IncidentRepository(new JsonStore(null));
});

describe('IncidentRepository', () => {
  it('creates incidents with all seven pipeline steps and a sequential number', () => {
    const a = repo.create(anomaly(), 'autonomous');
    const b = repo.create(anomaly({ serviceId: 'svc-b' }), 'supervised');
    expect(a.number).toBe('INC-0001');
    expect(b.number).toBe('INC-0002');
    expect(a.steps.map((s) => s.key)).toEqual(STEP_DEFS.map((s) => s.key));
    expect(a.steps.every((s) => s.status === 'pending')).toBe(true);
  });

  it('finds the active incident per service', () => {
    const a = repo.create(anomaly(), 'autonomous');
    expect(repo.activeFor('svc-a').id).toBe(a.id);
    repo.update(a, { status: 'resolved' });
    expect(repo.activeFor('svc-a')).toBeNull();
  });

  it('tracks step timing', () => {
    const a = repo.create(anomaly(), 'autonomous');
    repo.step(a, 'analyze', 'running');
    repo.step(a, 'analyze', 'done', 'ok');
    const step = a.steps.find((s) => s.key === 'analyze');
    expect(step.startedAt).toBeTruthy();
    expect(step.finishedAt).toBeTruthy();
    expect(step.detail).toBe('ok');
  });

  it('filters, searches and paginates', () => {
    for (let i = 0; i < 25; i += 1) repo.create(anomaly({ serviceId: i % 2 ? 'svc-a' : 'svc-b', severity: i % 5 ? 'high' : 'critical' }), 'autonomous');
    expect(repo.query({ limit: 10 }).items).toHaveLength(10);
    expect(repo.query({ limit: 10, page: 3 }).items).toHaveLength(5);
    expect(repo.query({ serviceId: 'svc-a' }).total).toBe(12);
    expect(repo.query({ severity: 'critical' }).total).toBe(5);
    expect(repo.query({ q: 'inc-0007' }).total).toBe(1);
    expect(repo.query({ status: 'active' }).total).toBe(25);
  });

  it('summaries never include heavy nested data', () => {
    const s = summary(repo.create(anomaly(), 'autonomous'));
    expect(s).not.toHaveProperty('timeline');
    expect(s).not.toHaveProperty('context');
    expect(s.actions).toEqual([]);
  });

  it('caps the timeline length', () => {
    const a = repo.create(anomaly(), 'autonomous');
    for (let i = 0; i < 250; i += 1) repo.log(a, `event ${i}`);
    expect(a.timeline.length).toBe(200);
  });
});

describe('recovery executor', () => {
  const fakeSupervisor = (over = {}) => ({
    snapshot: () => ({ pid: 123, name: 'Svc', version: '2.0.0', lastGoodVersion: '1.0.0', dependency: 'db', status: 'running' }),
    restart: async () => ({ status: 'running', name: 'Svc', pid: 456 }),
    callService: async () => ({ freedMB: 64, retried: 3 }),
    rollback: async () => ({ status: 'running', name: 'Svc', version: '1.0.0' }),
    ...over,
  });

  it('only knows predefined actions and the registry is frozen', () => {
    expect(getAction('constructor')).toBeNull();
    expect(getAction('__proto__')).toBeNull();
    expect(Object.isFrozen(ACTIONS)).toBe(true);
    expect(() => {
      ACTIONS.evil = {};
    }).toThrow();
  });

  it('returns a structured failure for unknown actions', async () => {
    const r = await executeAction('drop-database', { supervisor: fakeSupervisor(), serviceId: 's' });
    expect(r).toMatchObject({ ok: false });
  });

  it('runs actions and reports output', async () => {
    const r = await executeAction('clear-cache', { supervisor: fakeSupervisor(), serviceId: 's' });
    expect(r).toMatchObject({ ok: true, actionId: 'clear-cache' });
    expect(r.output).toContain('64 MB');
  });

  it('checks preconditions before running', async () => {
    const sup = fakeSupervisor({ snapshot: () => ({ pid: null, version: '1.0.0', lastGoodVersion: '1.0.0' }) });
    expect((await executeAction('clear-cache', { supervisor: sup, serviceId: 's' })).error).toMatch(/Precondition/);
    expect((await executeAction('rollback-deployment', { supervisor: sup, serviceId: 's' })).error).toMatch(/last known good/);
  });

  it('never throws when an action fails', async () => {
    const sup = fakeSupervisor({ restart: async () => ({ status: 'crashed', name: 'Svc' }) });
    const r = await executeAction('restart-service', { supervisor: sup, serviceId: 's' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/did not come back/);
  });
});
