import { describe, it, expect } from 'vitest';
import { collectContext, summariseContext } from '../src/collection/collector.js';
import { LogStore } from '../src/collection/logStore.js';
import { JsonStore } from '../src/lib/store.js';
import { RingBuffer } from '../src/lib/ringBuffer.js';

function setup({ deployedMinutesAgo = 2 } = {}) {
  const store = new JsonStore(null);
  const logStore = new LogStore();
  logStore.add('svc', 'info', 'started');
  logStore.add('svc', 'error', 'TypeError: boom');
  logStore.add('svc', 'fatal', 'Unhandled exception');
  const history = new RingBuffer(50);
  for (let i = 0; i < 20; i += 1) history.push({ ts: i, up: true, uptimeSec: i });
  const supervisor = {
    snapshot: () => ({ id: 'svc', name: 'Svc', dependency: 'db', status: 'running', version: '2.0.0', lastGoodVersion: '1.0.0', previousVersion: '1.0.0', exitCode: null, restarts: 1 }),
    lastDeployment: () => ({ kind: 'deploy', toVersion: '2.0.0', at: new Date(Date.now() - deployedMinutesAgo * 60000).toISOString() }),
  };
  const monitor = { history: () => history };
  return { serviceId: 'svc', anomalies: [{ type: 'ERROR_SPIKE' }], supervisor, monitor, logStore, store };
}

describe('collector', () => {
  it('bundles logs, metrics, errors and deployment info', () => {
    const ctx = collectContext(setup());
    expect(ctx.logs).toHaveLength(3);
    expect(ctx.errorLogs).toHaveLength(2);
    expect(ctx.samples).toHaveLength(15);
    expect(ctx.deployedRecently).toBe(true);
    expect(ctx.service.uptimeSec).toBe(19);
  });

  it('marks old deployments as not recent', () => {
    expect(collectContext(setup({ deployedMinutesAgo: 60 })).deployedRecently).toBe(false);
  });

  it('summarises without the full sample list', () => {
    const s = summariseContext(collectContext(setup()));
    expect(s).not.toHaveProperty('samples');
    expect(s.errorLogCount).toBe(2);
    expect(s.logExcerpt[2]).toBe('[fatal] Unhandled exception');
  });
});
