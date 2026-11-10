import { describe, it, expect } from 'vitest';
import { LogStore } from '../src/collection/logStore.js';

describe('LogStore', () => {
  it('parses JSON lines from managed services', () => {
    const ls = new LogStore();
    const e = ls.ingest('svc', JSON.stringify({ level: 'error', msg: 'boom', ts: '2026-01-01T00:00:00.000Z' }));
    expect(e).toMatchObject({ level: 'error', message: 'boom', source: 'svc' });
  });

  it('infers levels from plain text', () => {
    const ls = new LogStore();
    expect(ls.ingest('svc', 'Unhandled exception happened').level).toBe('fatal');
    expect(ls.ingest('svc', 'some error').level).toBe('error');
    expect(ls.ingest('svc', 'warning: disk').level).toBe('warn');
    expect(ls.ingest('svc', 'hello').level).toBe('info');
    expect(ls.ingest('svc', '   ')).toBeNull();
  });

  it('rejects unknown levels from JSON and truncates huge messages', () => {
    const ls = new LogStore();
    const e = ls.ingest('svc', JSON.stringify({ level: 'evil', msg: 'x'.repeat(5000) }));
    expect(e.level).toBe('info');
    expect(e.message.length).toBe(2000);
  });

  it('filters by source, level and text', () => {
    const ls = new LogStore();
    ls.add('a', 'info', 'alpha ok');
    ls.add('a', 'error', 'alpha failed');
    ls.add('b', 'error', 'beta failed');
    expect(ls.query({ source: 'a' })).toHaveLength(2);
    expect(ls.query({ level: 'error' })).toHaveLength(2);
    expect(ls.query({ search: 'BETA' })).toHaveLength(1);
    expect(ls.sources().sort()).toEqual(['a', 'b']);
  });

  it('is bounded per source', () => {
    const ls = new LogStore(10);
    for (let i = 0; i < 25; i += 1) ls.add('a', 'info', `line ${i}`);
    expect(ls.recent('a', 100)).toHaveLength(10);
  });
});
