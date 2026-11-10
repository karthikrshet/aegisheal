import { incidentNumber } from '../lib/ids.js';
import { eventBus } from '../lib/eventBus.js';

export const STEP_DEFS = [
  { key: 'monitor', label: 'System monitoring' },
  { key: 'detect', label: 'Failure detection' },
  { key: 'collect', label: 'Log & data collection' },
  { key: 'analyze', label: 'AI-based analysis' },
  { key: 'decide', label: 'Recovery decision' },
  { key: 'recover', label: 'Automated recovery' },
  { key: 'verify', label: 'Verification' },
];

/** Statuses in which an incident is still "open" for its service. */
export const ACTIVE_STATUSES = ['detected', 'analyzing', 'awaiting_approval', 'recovering', 'verifying', 'open', 'escalated'];
/** Statuses where the agent is NOT working on it right now (safe for humans / self-recovery). */
export const IDLE_STATUSES = ['awaiting_approval', 'open', 'escalated'];
export const STATUSES = [...ACTIVE_STATUSES, 'resolved', 'rejected'];

export class IncidentRepository {
  constructor(store) {
    this.store = store;
  }

  create(anomaly, mode) {
    const now = new Date().toISOString();
    const incident = this.store.insert(
      'incidents',
      {
        number: incidentNumber(this.store.nextIncidentNumber()),
        serviceId: anomaly.serviceId,
        serviceName: anomaly.serviceName,
        type: anomaly.type,
        title: `${anomaly.title} on ${anomaly.serviceName}`,
        severity: anomaly.severity,
        status: 'detected',
        mode,
        detectedAt: now,
        updatedAt: now,
        resolvedAt: null,
        mttrMs: null,
        resolution: null,
        anomalies: [anomaly],
        steps: STEP_DEFS.map((s) => ({ ...s, status: 'pending', startedAt: null, finishedAt: null, detail: null })),
        context: null,
        analysis: null,
        decision: null,
        attempts: [],
        pendingAction: null,
        approval: null,
        escalation: null,
        notes: [],
        timeline: [{ at: now, actor: 'agent', message: `Detected: ${anomaly.title}` }],
      },
      'inc',
    );
    this.changed(incident);
    return incident;
  }

  get(id) {
    return this.store.getById('incidents', id);
  }

  activeFor(serviceId) {
    return this.store.find('incidents', (i) => i.serviceId === serviceId && ACTIVE_STATUSES.includes(i.status));
  }

  update(incident, patch) {
    Object.assign(incident, patch, { updatedAt: new Date().toISOString() });
    this.store.scheduleFlush();
    this.changed(incident);
    return incident;
  }

  step(incident, key, status, detail) {
    const step = incident.steps.find((s) => s.key === key);
    if (!step) return;
    const now = new Date().toISOString();
    if (status === 'running') step.startedAt = now;
    if (['done', 'failed', 'skipped'].includes(status)) {
      step.startedAt ??= now;
      step.finishedAt = now;
    }
    step.status = status;
    if (detail !== undefined) step.detail = detail;
    this.update(incident, {});
  }

  log(incident, message, actor = 'agent') {
    incident.timeline.push({ at: new Date().toISOString(), actor, message });
    if (incident.timeline.length > 200) incident.timeline.splice(0, incident.timeline.length - 200);
    this.update(incident, {});
  }

  changed(incident) {
    eventBus.publish('incident', incident);
  }

  query({ status, serviceId, severity, q, from, to, page = 1, limit = 20 } = {}) {
    let rows = this.store.list('incidents');
    if (status === 'active') rows = rows.filter((i) => ACTIVE_STATUSES.includes(i.status));
    else if (status) rows = rows.filter((i) => i.status === status);
    if (serviceId) rows = rows.filter((i) => i.serviceId === serviceId);
    if (severity) rows = rows.filter((i) => i.severity === severity);
    if (from) rows = rows.filter((i) => i.detectedAt >= from);
    if (to) rows = rows.filter((i) => i.detectedAt <= to);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((i) =>
        [i.number, i.title, i.type, i.analysis?.rootCause, i.serviceName].some((v) => v && String(v).toLowerCase().includes(needle)),
      );
    }
    rows = rows.slice().sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1));
    const total = rows.length;
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit).map(summary);
    return { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), items };
  }

  all() {
    return this.store.list('incidents');
  }
}

/** Lightweight list representation (without large nested data). */
export function summary(i) {
  return {
    id: i.id,
    number: i.number,
    serviceId: i.serviceId,
    serviceName: i.serviceName,
    type: i.type,
    title: i.title,
    severity: i.severity,
    status: i.status,
    mode: i.mode,
    detectedAt: i.detectedAt,
    resolvedAt: i.resolvedAt,
    mttrMs: i.mttrMs,
    rootCause: i.analysis?.rootCause || null,
    confidence: i.analysis?.confidence ?? null,
    actions: i.attempts.map((a) => a.actionId),
    resolution: i.resolution,
  };
}
