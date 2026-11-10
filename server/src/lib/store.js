import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from './logger.js';
import { newId } from './ids.js';

const log = createLogger('store');

const EMPTY = () => ({
  meta: { version: 1, incidentCounter: 0, createdAt: new Date().toISOString() },
  users: [],
  incidents: [],
  auditLogs: [],
  deployments: [],
  learning: {},
  settings: null,
});

/** Collections are capped so the JSON file never grows without bound. */
const CAPS = { incidents: 2000, auditLogs: 5000, deployments: 1000 };

/**
 * Tiny JSON document store.
 * - All reads come from memory (fast, synchronous).
 * - Writes are debounced and flushed atomically (write temp file, then rename),
 *   so a crash mid-write can never corrupt the database.
 * - `filePath = null` gives a pure in-memory store (used by tests).
 */
export class JsonStore {
  constructor(filePath, { flushDelayMs = 150 } = {}) {
    this.filePath = filePath;
    this.flushDelayMs = flushDelayMs;
    this.timer = null;
    this.data = EMPTY();
    if (filePath) this.load();
  }

  load() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      if (!fs.existsSync(this.filePath)) {
        this.flushSync();
        return;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = { ...EMPTY(), ...parsed, meta: { ...EMPTY().meta, ...(parsed.meta || {}) } };
    } catch (err) {
      // Keep a copy of the unreadable file instead of silently overwriting it.
      const backup = `${this.filePath}.corrupt-${Date.now()}`;
      try {
        fs.copyFileSync(this.filePath, backup);
      } catch {
        /* nothing to back up */
      }
      log.error('Database file unreadable, starting fresh', { error: err.message, backup });
      this.data = EMPTY();
      this.flushSync();
    }
  }

  // ── collection helpers ──────────────────────────────────────────
  list(name) {
    return this.data[name] || [];
  }

  find(name, predicate) {
    return this.list(name).find(predicate) || null;
  }

  filter(name, predicate) {
    return this.list(name).filter(predicate);
  }

  getById(name, id) {
    return this.find(name, (d) => d.id === id);
  }

  insert(name, doc, prefix = name.slice(0, 3)) {
    const record = { id: doc.id || newId(prefix), ...doc };
    this.data[name] = this.list(name);
    this.data[name].push(record);
    const cap = CAPS[name];
    if (cap && this.data[name].length > cap) this.data[name].splice(0, this.data[name].length - cap);
    this.scheduleFlush();
    return record;
  }

  update(name, id, patch) {
    const doc = this.getById(name, id);
    if (!doc) return null;
    Object.assign(doc, typeof patch === 'function' ? patch(doc) || {} : patch);
    this.scheduleFlush();
    return doc;
  }

  remove(name, id) {
    const list = this.list(name);
    const idx = list.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.scheduleFlush();
    return true;
  }

  // ── singleton documents ─────────────────────────────────────────
  getDoc(key) {
    return this.data[key];
  }

  setDoc(key, value) {
    this.data[key] = value;
    this.scheduleFlush();
    return value;
  }

  nextIncidentNumber() {
    this.data.meta.incidentCounter += 1;
    this.scheduleFlush();
    return this.data.meta.incidentCounter;
  }

  // ── persistence ─────────────────────────────────────────────────
  scheduleFlush() {
    if (!this.filePath || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flushSync();
    }, this.flushDelayMs);
    this.timer.unref?.();
  }

  flushSync() {
    if (!this.filePath) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const tmp = `${this.filePath}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      log.error('Failed to persist database', { error: err.message });
    }
  }

  reset() {
    this.data = EMPTY();
    this.flushSync();
  }
}
