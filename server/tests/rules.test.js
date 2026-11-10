import { describe, it, expect } from 'vitest';
import { RULES, isSampleHealthy } from '../src/detection/rules.js';
import { detectAnomalies } from '../src/detection/detector.js';

const thresholds = { cpuPercent: 80, memoryMB: 220, latencyMs: 800, errorRate: 0.3, failedJobs: 5, consecutiveSamples: 2 };
const ok = { ts: 0, up: true, statusCode: 200, responseMs: 20, cpuPercent: 2, memoryMB: 10, errorRate: 0, failedJobs: 0, dependency: 'connected' };
const running = { status: 'running', exitCode: null };
const rule = (type) => RULES.find((r) => r.type === type);
const run = (type, samples, process = running) => rule(type).evaluate({ samples, process, thresholds });

describe('detection rules', () => {
  it('healthy samples trigger nothing', () => {
    for (const r of RULES) expect(r.evaluate({ samples: [ok, ok, ok], process: running, thresholds })).toBeNull();
  });

  it('SERVICE_DOWN on crashed process or refused connections', () => {
    expect(run('SERVICE_DOWN', [], { status: 'crashed', exitCode: 1 })).not.toBeNull();
    expect(run('SERVICE_DOWN', [], { status: 'unhealthy' })).not.toBeNull();
    const refused = { ...ok, up: false, error: 'connection refused' };
    expect(run('SERVICE_DOWN', [refused, refused])).not.toBeNull();
    expect(run('SERVICE_DOWN', [ok, refused])).toBeNull();
  });

  it('HIGH_CPU needs consecutive samples', () => {
    const hot = { ...ok, cpuPercent: 95 };
    expect(run('HIGH_CPU', [ok, hot])).toBeNull();
    expect(run('HIGH_CPU', [hot, hot]).value).toBe(95);
  });

  it('MEMORY_LEAK reports growth pattern', () => {
    const s = [300, 320, 340, 360, 380].map((m) => ({ ...ok, memoryMB: m }));
    const res = run('MEMORY_LEAK', s);
    expect(res.evidence.join(' ')).toMatch(/growing monotonically/);
  });

  it('HIGH_LATENCY only for reachable services', () => {
    const slow = { ...ok, responseMs: 1500 };
    expect(run('HIGH_LATENCY', [slow, slow])).not.toBeNull();
    expect(run('HIGH_LATENCY', [slow, { ...slow, up: false }])).toBeNull();
  });

  it('DEPENDENCY_FAILURE on disconnected dependency', () => {
    const d = { ...ok, dependency: 'disconnected' };
    expect(run('DEPENDENCY_FAILURE', [d, d])).not.toBeNull();
  });

  it('ERROR_SPIKE on repeated HTTP 500 or sustained error rate', () => {
    const e500 = { ...ok, up: false, statusCode: 500 };
    expect(run('ERROR_SPIKE', [ok, e500, e500])).not.toBeNull();
    const errs = { ...ok, errorRate: 0.6 };
    expect(run('ERROR_SPIKE', [ok, errs])).toBeNull();
    expect(run('ERROR_SPIKE', [errs, errs])).not.toBeNull();
  });

  it('JOB_FAILURES above threshold', () => {
    expect(run('JOB_FAILURES', [{ ...ok, failedJobs: 7 }]).value).toBe(7);
    expect(run('JOB_FAILURES', [{ ...ok, failedJobs: 2 }])).toBeNull();
  });

  it('isSampleHealthy checks every dimension', () => {
    expect(isSampleHealthy(ok, thresholds)).toBe(true);
    expect(isSampleHealthy({ ...ok, failedJobs: 9 }, thresholds)).toBe(false);
    expect(isSampleHealthy({ ...ok, statusCode: 503 }, thresholds)).toBe(false);
  });
});

describe('detector', () => {
  it('sorts by severity and short-circuits on SERVICE_DOWN', () => {
    const hot = { ...ok, cpuPercent: 95, responseMs: 1200 };
    const found = detectAnomalies({ serviceId: 's', serviceName: 'S', samples: [hot, hot], process: running, thresholds });
    expect(found.map((a) => a.type)).toEqual(['HIGH_CPU', 'HIGH_LATENCY']);
    const down = detectAnomalies({ serviceId: 's', serviceName: 'S', samples: [hot, hot], process: { status: 'crashed' }, thresholds });
    expect(down.map((a) => a.type)).toEqual(['SERVICE_DOWN']);
  });

  it('ignores services that are intentionally stopped or starting', () => {
    for (const status of ['stopped', 'starting', 'stopping']) {
      expect(detectAnomalies({ serviceId: 's', serviceName: 'S', samples: [], process: { status }, thresholds })).toEqual([]);
    }
  });
});
