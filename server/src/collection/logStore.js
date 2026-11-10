import { RingBuffer } from '../lib/ringBuffer.js';
import { eventBus } from '../lib/eventBus.js';

const VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);

/** Keeps the most recent log lines of every managed service (and the agent itself). */
export class LogStore {
  constructor(perServiceCapacity = 500) {
    this.capacity = perServiceCapacity;
    this.buffers = new Map();
    this.seq = 0;
  }

  buffer(source) {
    if (!this.buffers.has(source)) this.buffers.set(source, new RingBuffer(this.capacity));
    return this.buffers.get(source);
  }

  /** Parse a raw stdout line (JSON from demo services, or plain text). */
  ingest(source, rawLine) {
    const line = String(rawLine).trim();
    if (!line) return null;
    let level = 'info';
    let message = line;
    let ts = new Date().toISOString();
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.msg === 'string') {
        message = parsed.msg;
        if (VALID_LEVELS.has(parsed.level)) level = parsed.level;
        if (parsed.ts) ts = parsed.ts;
      }
    } catch {
      if (/fatal|unhandled/i.test(line)) level = 'fatal';
      else if (/error|exception/i.test(line)) level = 'error';
      else if (/warn/i.test(line)) level = 'warn';
    }
    return this.add(source, level, message, ts);
  }

  add(source, level, message, ts = new Date().toISOString()) {
    const entry = { id: ++this.seq, source, level, message: String(message).slice(0, 2000), ts };
    this.buffer(source).push(entry);
    eventBus.publish('log', entry);
    return entry;
  }

  recent(source, n = 50) {
    return this.buffers.has(source) ? this.buffer(source).last(n) : [];
  }

  query({ source, level, search, limit = 200 } = {}) {
    const sources = source ? [source] : [...this.buffers.keys()];
    let all = sources.flatMap((s) => (this.buffers.has(s) ? this.buffer(s).toArray() : []));
    if (level) all = all.filter((e) => e.level === level);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter((e) => e.message.toLowerCase().includes(q));
    }
    all.sort((a, b) => a.id - b.id);
    return all.slice(-Math.min(Math.max(limit, 1), 1000));
  }

  sources() {
    return [...this.buffers.keys()];
  }
}
