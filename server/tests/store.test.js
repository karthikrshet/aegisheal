import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { JsonStore } from '../src/lib/store.js';

const tmpDirs = [];
const tmpFile = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-store-'));
  tmpDirs.push(dir);
  return path.join(dir, 'db.json');
};

afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop(), { recursive: true, force: true });
});

describe('JsonStore', () => {
  it('inserts, finds, updates and removes documents in memory', () => {
    const s = new JsonStore(null);
    const doc = s.insert('users', { email: 'a@b.c' }, 'usr');
    expect(doc.id).toMatch(/^usr_/);
    expect(s.getById('users', doc.id).email).toBe('a@b.c');
    s.update('users', doc.id, { email: 'x@y.z' });
    expect(s.find('users', (u) => u.email === 'x@y.z')).toBeTruthy();
    expect(s.remove('users', doc.id)).toBe(true);
    expect(s.remove('users', doc.id)).toBe(false);
    expect(s.update('users', 'missing', {})).toBeNull();
  });

  it('persists to disk atomically and reloads', () => {
    const file = tmpFile();
    const s = new JsonStore(file);
    s.insert('incidents', { title: 'x' });
    s.flushSync();
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
    const reloaded = new JsonStore(file);
    expect(reloaded.list('incidents')).toHaveLength(1);
  });

  it('recovers from a corrupt database file and keeps a backup', () => {
    const file = tmpFile();
    fs.writeFileSync(file, '{ this is not json');
    const s = new JsonStore(file);
    expect(s.list('users')).toEqual([]);
    const backups = fs.readdirSync(path.dirname(file)).filter((f) => f.includes('corrupt'));
    expect(backups).toHaveLength(1);
  });

  it('caps the audit collection size', () => {
    const s = new JsonStore(null);
    for (let i = 0; i < 5010; i += 1) s.insert('auditLogs', { i });
    expect(s.list('auditLogs')).toHaveLength(5000);
    expect(s.list('auditLogs')[0].i).toBe(10);
  });

  it('increments incident numbers', () => {
    const s = new JsonStore(null);
    expect(s.nextIncidentNumber()).toBe(1);
    expect(s.nextIncidentNumber()).toBe(2);
  });
});
