import { RingBuffer } from '../lib/ringBuffer.js';
import { eventBus } from '../lib/eventBus.js';
import { createLogger } from '../lib/logger.js';
import { probeService } from './probe.js';
import { readSystemMetrics } from './systemMetrics.js';
import { detectAnomalies } from '../detection/detector.js';

const log = createLogger('monitor');
const HISTORY = 300; // ~10 minutes at 2 s interval

/**
 * Continuous monitoring loop (methodology Step 1) that feeds the detector (Step 2).
 * Calls `onAnomalies(serviceId, anomalies)` for every service on every tick
 * (an empty array means the service looked healthy).
 */
export class Monitor {
  constructor({ supervisor, settings, intervalMs, onAnomalies }) {
    this.supervisor = supervisor;
    this.settings = settings;
    this.intervalMs = intervalMs;
    this.onAnomalies = onAnomalies || (() => {});
    this.samples = new Map();
    this.system = new RingBuffer(HISTORY);
    this.timer = null;
    this.ticking = false;
    this.tickCount = 0;
    this.lastTickAt = null;
  }

  history(serviceId) {
    if (!this.samples.has(serviceId)) this.samples.set(serviceId, new RingBuffer(HISTORY));
    return this.samples.get(serviceId);
  }

  async probe(serviceId) {
    const proc = this.supervisor.snapshot(serviceId);
    if (!proc.pid || proc.status === 'crashed' || proc.status === 'stopped') {
      return { ts: Date.now(), up: false, statusCode: null, responseMs: null, error: proc.status, version: proc.version };
    }
    return probeService(proc.port);
  }

  async tick() {
    if (this.ticking) return; // never overlap ticks
    this.ticking = true;
    try {
      const sys = readSystemMetrics();
      this.system.push(sys);
      const { thresholds } = this.settings.get();
      const results = await Promise.all(
        this.supervisor.ids().map(async (id) => {
          const sample = await this.probe(id);
          this.history(id).push(sample);
          const proc = this.supervisor.snapshot(id);
          const anomalies = detectAnomalies({
            serviceId: id,
            serviceName: proc.name,
            samples: this.history(id).last(10),
            process: proc,
            thresholds,
          });
          return { id, sample, anomalies };
        }),
      );
      this.tickCount += 1;
      this.lastTickAt = new Date().toISOString();
      eventBus.publish('metrics', {
        system: sys,
        services: Object.fromEntries(results.map((r) => [r.id, r.sample])),
      });
      // Report every service (healthy ones too) so the agent can auto-close incidents.
      for (const r of results) {
        try {
          await this.onAnomalies(r.id, r.anomalies);
        } catch (err) {
          log.error('anomaly handler failed', { service: r.id, error: err.message });
        }
      }
    } catch (err) {
      log.error('monitor tick failed', { error: err.message });
    } finally {
      this.ticking = false;
    }
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    this.timer.unref?.();
    log.info(`Monitoring started (every ${this.intervalMs} ms)`);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  status() {
    return { running: Boolean(this.timer), intervalMs: this.intervalMs, ticks: this.tickCount, lastTickAt: this.lastTickAt };
  }
}
