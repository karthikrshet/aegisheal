import { describe, it, expect } from 'vitest';
import { analyzeLocally } from '../src/agent/localAnalyzer.js';
import { analyzeIncident } from '../src/agent/analyzer.js';
import { analyzeWithClaude } from '../src/agent/llmAnalyzer.js';
import { ACTIONS } from '../src/recovery/actions/index.js';
import { makeContext } from './helpers.js';

describe('local analyser', () => {
  it('diagnoses a crash', () => {
    const r = analyzeLocally(makeContext({ anomalies: ['SERVICE_DOWN'], logs: ['Unhandled exception: RangeError'], service: { status: 'crashed', exitCode: 1 } }));
    expect(r.signatureId).toBe('process-crash');
    expect(r.recommendedActions[0]).toBe('restart-service');
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it('diagnoses a bad deployment and recommends rollback', () => {
    const r = analyzeLocally(
      makeContext({
        anomalies: ['ERROR_SPIKE'],
        logs: ["TypeError: Cannot read properties of undefined (build 2.0.0)"],
        service: { version: '2.0.0', lastGoodVersion: '1.0.0' },
        lastDeployment: { kind: 'deploy', toVersion: '2.0.0', at: new Date().toISOString() },
        deployedRecently: true,
      }),
    );
    expect(r.signatureId).toBe('bad-deployment');
    expect(r.recommendedActions[0]).toBe('rollback-deployment');
    expect(r.evidence.length).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['MEMORY_LEAK', 'Session cache grew to 80 MB (no eviction)', 'memory-leak', 'clear-cache'],
    ['HIGH_CPU', 'Runaway worker: tight loop', 'cpu-saturation', 'throttle-workload'],
    ['DEPENDENCY_FAILURE', 'ECONNREFUSED: connection refused', 'dependency-loss', 'reconnect-dependency'],
    ['JOB_FAILURES', 'Job #1 failed: ETIMEDOUT', 'transient-operation-failure', 'retry-failed-operations'],
    ['HIGH_LATENCY', 'Thread pool saturated', 'latency-degradation', 'restart-service'],
  ])('%s -> %s', (anomaly, log, signature, action) => {
    const r = analyzeLocally(makeContext({ anomalies: [anomaly], logs: [log] }));
    expect(r.signatureId).toBe(signature);
    expect(r.recommendedActions[0]).toBe(action);
  });

  it('falls back to a safe restart for unknown failures', () => {
    const r = analyzeLocally(makeContext({ anomalies: ['SOMETHING_NEW'] }));
    expect(r.signatureId).toBe('unknown');
    expect(r.recommendedActions).toEqual(['restart-service']);
  });

  it('only ever recommends predefined actions', () => {
    for (const a of ['SERVICE_DOWN', 'ERROR_SPIKE', 'MEMORY_LEAK', 'HIGH_CPU', 'X']) {
      const r = analyzeLocally(makeContext({ anomalies: [a] }));
      for (const id of r.recommendedActions) expect(Object.keys(ACTIONS)).toContain(id);
    }
  });
});

describe('AI provider fallback', () => {
  it('Claude analyser returns null without an API key', async () => {
    expect(await analyzeWithClaude(makeContext({ anomalies: ['HIGH_CPU'] }), { apiKey: '', model: 'claude-opus-5-5' })).toBeNull();
  });

  it('analyzeIncident falls back to local when Claude is unavailable', async () => {
    const r = await analyzeIncident(makeContext({ anomalies: ['HIGH_CPU'], logs: ['runaway'] }), { provider: 'claude', apiKey: '', model: 'claude-opus-5-5' });
    expect(r.engine).toMatch(/local/);
    expect(r.signatureId).toBe('cpu-saturation');
  });
});
