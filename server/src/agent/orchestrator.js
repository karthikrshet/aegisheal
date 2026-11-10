import { eventBus } from '../lib/eventBus.js';
import { createLogger } from '../lib/logger.js';
import { sleep } from '../lib/time.js';
import { collectContext, summariseContext } from '../collection/collector.js';
import { analyzeIncident } from './analyzer.js';
import { executeAction } from '../recovery/executor.js';
import { verifyRecovery } from '../verification/verifier.js';
import { getAction } from '../recovery/actions/index.js';
import { IDLE_STATUSES } from '../incidents/incidentRepository.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';

const log = createLogger('agent');
const HEALTHY_TICKS_TO_AUTO_CLOSE = 3;

/**
 * The autonomous agent: drives every incident through the 7-step pipeline
 *   monitor → detect → collect → analyze → decide → recover → verify
 * and keeps going (next best action) until the service is verified healthy,
 * a human is needed, or the guardrails say stop.
 */
export class AgentOrchestrator {
  constructor({ supervisor, monitor, logStore, store, incidents, settings, guardrails, learning, audit, config }) {
    Object.assign(this, { supervisor, monitor, logStore, store, incidents, settings, guardrails, learning, audit, config });
    this.paused = Boolean(store.getDoc('meta')?.agentPaused);
    this.running = new Set(); // incident ids with a pipeline in progress
    this.healthyTicks = new Map();
    this.activity = [];
  }

  // ── entry point called by the monitor every tick for every service ────
  async onServiceChecked(serviceId, anomalies) {
    const active = this.incidents.activeFor(serviceId);

    if (!anomalies.length) {
      if (active && IDLE_STATUSES.includes(active.status) && !this.running.has(active.id)) {
        const n = (this.healthyTicks.get(serviceId) || 0) + 1;
        this.healthyTicks.set(serviceId, n);
        if (n >= HEALTHY_TICKS_TO_AUTO_CLOSE) this.autoClose(active);
      }
      return;
    }
    this.healthyTicks.set(serviceId, 0);

    if (active) {
      this.mergeAnomalies(active, anomalies);
      return;
    }

    const mode = this.paused ? 'paused' : this.settings.get().agentMode;
    const incident = this.incidents.create(anomalies[0], mode);
    if (anomalies.length > 1) this.mergeAnomalies(incident, anomalies.slice(1));
    this.note(`Incident ${incident.number} opened: ${incident.title}`);
    this.audit.record({ actor: 'agent', action: 'incident.detected', target: incident.number, detail: incident.title });
    this.run(incident).catch((err) => this.fail(incident, err));
  }

  mergeAnomalies(incident, anomalies) {
    let changed = false;
    for (const a of anomalies) {
      if (!incident.anomalies.some((x) => x.type === a.type)) {
        incident.anomalies.push(a);
        incident.timeline.push({ at: new Date().toISOString(), actor: 'agent', message: `Additional symptom: ${a.title}` });
        changed = true;
      }
    }
    if (changed) this.incidents.update(incident, {});
  }

  // ── pipeline ──────────────────────────────────────────────────────────
  async run(incident) {
    this.running.add(incident.id);
    try {
      const sample = this.monitor.history(incident.serviceId).latest();
      this.incidents.step(incident, 'monitor', 'done', sample ? `Last probe: HTTP ${sample.statusCode ?? 'n/a'}, ${sample.responseMs ?? '-'} ms` : 'No samples');
      this.incidents.step(incident, 'detect', 'done', incident.anomalies.map((a) => a.title).join(', '));

      // Step 3: collect
      this.incidents.update(incident, { status: 'analyzing' });
      this.incidents.step(incident, 'collect', 'running');
      const ctx = this.buildContext(incident);
      incident.context = summariseContext(ctx);
      this.incidents.step(incident, 'collect', 'done', `${ctx.logs.length} log lines, ${ctx.samples.length} metric samples, ${ctx.errorLogs.length} errors`);

      // Step 4: analyze
      this.incidents.step(incident, 'analyze', 'running');
      const s = this.settings.get();
      const analysis = await analyzeIncident(ctx, { provider: s.ai.provider, apiKey: this.config.ai.apiKey, model: s.ai.model });
      this.incidents.update(incident, { analysis });
      this.incidents.step(incident, 'analyze', 'done', `${analysis.signatureName} (${Math.round(analysis.confidence * 100)}% confidence, ${analysis.engine})`);
      this.incidents.log(incident, `Root cause: ${analysis.rootCause}`);

      await this.decideAndAct(incident);
    } finally {
      this.running.delete(incident.id);
    }
  }

  buildContext(incident) {
    return collectContext({
      serviceId: incident.serviceId,
      anomalies: incident.anomalies,
      supervisor: this.supervisor,
      monitor: this.monitor,
      logStore: this.logStore,
      store: this.store,
    });
  }

  /** Step 5 + 6 + 7 loop: pick the best remaining action, act, verify; repeat on failure. */
  async decideAndAct(incident, { approvedAction = null, approver = null } = {}) {
    const { guardrails: g } = this.settings.get();

    while (true) {
      const tried = new Set(incident.attempts.map((a) => a.actionId));
      const attempt = incident.attempts.length + 1;
      let actionId = approvedAction;
      let verdict;

      this.incidents.step(incident, 'decide', 'running');
      if (actionId) {
        verdict = this.guardrails.evaluate({ serviceId: incident.serviceId, actionId, confidence: incident.analysis.confidence, attempt, manualApproval: true });
      } else {
        const ranked = this.learning
          .rank(incident.analysis.signatureId, incident.analysis.recommendedActions)
          .filter((r) => !tried.has(r.actionId) && this.settings.get().allowedActions.includes(r.actionId));
        // Always keep a restart as a last resort if not tried yet.
        if (!ranked.some((r) => r.actionId === 'restart-service') && !tried.has('restart-service') && this.settings.get().allowedActions.includes('restart-service')) {
          ranked.push({ actionId: 'restart-service', score: 0.1, successRate: this.learning.successRate(incident.analysis.signatureId, 'restart-service'), attempts: 0, fallback: true });
        }
        incident.decision = { ranked, decidedAt: new Date().toISOString() };
        if (!ranked.length) return this.escalate(incident, 'No remaining recovery actions in the playbook');

        // Choose the first ranked action that guardrails allow (skip ones in cooldown).
        for (const r of ranked) {
          verdict = this.guardrails.evaluate({ serviceId: incident.serviceId, actionId: r.actionId, confidence: incident.analysis.confidence, attempt });
          actionId = r.actionId;
          if (verdict.allowed || !verdict.cooldown) break;
        }
      }

      if (this.paused && !approvedAction) verdict = { allowed: false, observeOnly: true, reason: 'Agent is paused' };
      const action = getAction(actionId);
      incident.decision = { ...(incident.decision || {}), chosen: actionId, guardrail: verdict };

      if (!verdict.allowed) {
        if (verdict.observeOnly || incident.mode === 'paused') {
          this.incidents.step(incident, 'decide', 'done', `Would run "${action?.name}" — not executed (${verdict.reason})`);
          this.incidents.step(incident, 'recover', 'skipped', 'Observe-only');
          this.incidents.update(incident, { status: 'open', pendingAction: actionId });
          this.incidents.log(incident, `Recommendation: ${action?.name}. ${verdict.reason}`);
          return;
        }
        if (verdict.busy) {
          this.incidents.log(incident, verdict.reason + ' — waiting');
          await sleep(3000);
          continue;
        }
        this.incidents.step(incident, 'decide', 'failed', verdict.reason);
        return this.escalate(incident, verdict.reason);
      }

      if (verdict.requiresApproval && !approvedAction) {
        this.incidents.step(incident, 'decide', 'done', `Proposed "${action.name}" — waiting for approval (${verdict.reason})`);
        this.incidents.update(incident, { status: 'awaiting_approval', pendingAction: actionId });
        this.incidents.log(incident, `Approval required for "${action.name}": ${verdict.reason}`);
        this.note(`${incident.number} awaiting approval: ${action.name}`);
        return;
      }

      this.incidents.step(incident, 'decide', 'done', `Selected "${action.name}" (attempt ${attempt}/${g.maxAttemptsPerIncident}) — ${verdict.reason}`);
      const ok = await this.executeAndVerify(incident, actionId, approver);
      if (ok) return;
      approvedAction = null;
      approver = null;
      if (incident.attempts.length >= g.maxAttemptsPerIncident) {
        return this.escalate(incident, `Recovery not verified after ${incident.attempts.length} attempts`);
      }
      this.incidents.log(incident, 'Recovery not verified — re-planning with the next best action');
    }
  }

  async executeAndVerify(incident, actionId, approver) {
    const { thresholds, guardrails: g } = this.settings.get();
    const action = getAction(actionId);
    const actor = approver ? `${approver} (approved)` : 'agent';

    this.incidents.update(incident, { status: 'recovering', pendingAction: null });
    this.incidents.step(incident, 'recover', 'running', `Executing "${action.name}"`);
    this.incidents.step(incident, 'verify', 'pending', null);
    this.guardrails.begin(incident.serviceId, actionId);

    const attemptRecord = { n: incident.attempts.length + 1, actionId, name: action.name, actor, startedAt: new Date().toISOString(), result: null, verification: null };
    incident.attempts.push(attemptRecord);
    const result = await executeAction(actionId, { supervisor: this.supervisor, serviceId: incident.serviceId, logStore: this.logStore, actor });
    attemptRecord.result = result;
    this.audit.record({ actor, action: `recovery.${actionId}`, target: incident.serviceId, detail: result.ok ? result.output : result.error });

    if (!result.ok) {
      this.incidents.step(incident, 'recover', 'failed', result.error);
      this.incidents.log(incident, `"${action.name}" failed: ${result.error}`);
      this.learning.record(incident.analysis.signatureId, actionId, false);
      this.guardrails.end(incident.serviceId, false);
      return false;
    }
    this.incidents.step(incident, 'recover', 'done', result.output);
    this.incidents.log(incident, result.output);

    // Step 7: verify
    this.incidents.update(incident, { status: 'verifying' });
    this.incidents.step(incident, 'verify', 'running', `Waiting for ${g.verificationChecks} consecutive healthy checks`);
    const verification = await verifyRecovery({
      serviceId: incident.serviceId,
      monitor: this.monitor,
      thresholds,
      checks: g.verificationChecks,
      timeoutMs: g.verificationTimeoutMs,
      intervalMs: this.config.isTest ? 200 : 1000,
    });
    attemptRecord.verification = verification;

    if (!verification.passed) {
      this.incidents.step(incident, 'verify', 'failed', verification.summary);
      this.incidents.log(incident, `Verification failed: ${verification.summary}`);
      this.learning.record(incident.analysis.signatureId, actionId, false);
      this.guardrails.end(incident.serviceId, false);
      return false;
    }

    const resolvedAt = new Date().toISOString();
    const mttrMs = new Date(resolvedAt) - new Date(incident.detectedAt);
    this.incidents.step(incident, 'verify', 'done', verification.summary);
    this.learning.record(incident.analysis.signatureId, actionId, true, mttrMs);
    this.guardrails.end(incident.serviceId, true);
    this.supervisor.markGood(incident.serviceId);
    this.incidents.update(incident, { status: 'resolved', resolvedAt, mttrMs, resolution: `Recovered by "${action.name}"`, escalation: null });
    this.incidents.log(incident, `Resolved in ${(mttrMs / 1000).toFixed(1)} s — service verified healthy`);
    this.note(`${incident.number} resolved in ${(mttrMs / 1000).toFixed(1)} s by ${action.name}`);
    this.audit.record({ actor: 'agent', action: 'incident.resolved', target: incident.number, detail: `MTTR ${(mttrMs / 1000).toFixed(1)} s` });
    return true;
  }

  escalate(incident, reason) {
    this.incidents.update(incident, { status: 'escalated', escalation: { reason, at: new Date().toISOString() } });
    this.incidents.log(incident, `Escalated to on-call engineer: ${reason}`);
    this.note(`${incident.number} escalated: ${reason}`);
    this.audit.record({ actor: 'agent', action: 'incident.escalated', target: incident.number, detail: reason });
    log.warn(`${incident.number} escalated`, { reason });
  }

  fail(incident, err) {
    log.error(`Pipeline crashed for ${incident.number}`, { error: err.message });
    this.running.delete(incident.id);
    this.escalate(incident, `Internal agent error: ${err.message}`);
  }

  autoClose(incident) {
    const resolvedAt = new Date().toISOString();
    this.incidents.update(incident, {
      status: 'resolved',
      resolvedAt,
      mttrMs: new Date(resolvedAt) - new Date(incident.detectedAt),
      pendingAction: null,
      resolution: 'Service returned to normal without agent action',
    });
    this.incidents.log(incident, `Service healthy for ${HEALTHY_TICKS_TO_AUTO_CLOSE} consecutive checks — closed`);
    this.healthyTicks.set(incident.serviceId, 0);
  }

  // ── human-in-the-loop operations ─────────────────────────────────────
  findIdle(id) {
    const incident = this.incidents.get(id);
    if (!incident) throw notFound('Incident not found');
    if (this.running.has(id)) throw conflict('The agent is currently working on this incident');
    return incident;
  }

  async approve(id, { actionId, user }) {
    const incident = this.findIdle(id);
    if (!IDLE_STATUSES.includes(incident.status)) throw conflict(`Incident is ${incident.status}; nothing to approve`);
    const chosen = actionId || incident.pendingAction;
    if (!chosen || !getAction(chosen)) throw badRequest('A valid recovery action is required');
    if (!incident.analysis) throw conflict('Incident has not been analysed yet');

    incident.approval = { by: user.email, at: new Date().toISOString(), actionId: chosen };
    this.incidents.log(incident, `Approved "${getAction(chosen).name}"`, user.email);
    this.audit.record({ actor: user.email, action: 'incident.approved', target: incident.number, detail: chosen });
    if (incident.status === 'escalated') this.guardrails.resetCircuit(incident.serviceId);

    this.running.add(incident.id);
    this.decideAndAct(incident, { approvedAction: chosen, approver: user.email })
      .catch((err) => this.fail(incident, err))
      .finally(() => this.running.delete(incident.id));
    return incident;
  }

  reject(id, { reason, user }) {
    const incident = this.findIdle(id);
    if (!IDLE_STATUSES.includes(incident.status)) throw conflict(`Incident is ${incident.status}; cannot reject`);
    this.incidents.update(incident, { status: 'rejected', pendingAction: null, resolution: `Rejected by ${user.email}: ${reason || 'no reason given'}` });
    this.incidents.log(incident, `Proposal rejected${reason ? `: ${reason}` : ''}`, user.email);
    this.audit.record({ actor: user.email, action: 'incident.rejected', target: incident.number, detail: reason || null });
    return incident;
  }

  resolveManually(id, { note, user }) {
    const incident = this.findIdle(id);
    if (['resolved', 'rejected'].includes(incident.status)) throw conflict('Incident already closed');
    const resolvedAt = new Date().toISOString();
    this.incidents.update(incident, {
      status: 'resolved',
      resolvedAt,
      mttrMs: new Date(resolvedAt) - new Date(incident.detectedAt),
      pendingAction: null,
      resolution: `Manually resolved by ${user.email}${note ? `: ${note}` : ''}`,
    });
    this.incidents.log(incident, 'Manually marked as resolved', user.email);
    this.audit.record({ actor: user.email, action: 'incident.resolved_manually', target: incident.number, detail: note || null });
    return incident;
  }

  addNote(id, { text, user }) {
    const incident = this.incidents.get(id);
    if (!incident) throw notFound('Incident not found');
    incident.notes.push({ at: new Date().toISOString(), by: user.email, text });
    this.incidents.update(incident, {});
    return incident;
  }

  // ── agent control ────────────────────────────────────────────────────
  setPaused(paused, user) {
    this.paused = paused;
    const meta = this.store.getDoc('meta');
    this.store.setDoc('meta', { ...meta, agentPaused: paused });
    this.audit.record({ actor: user.email, action: paused ? 'agent.paused' : 'agent.resumed' });
    this.note(paused ? 'Agent paused by ' + user.email : 'Agent resumed by ' + user.email);
    eventBus.publish('agent', this.state());
  }

  note(message) {
    this.activity.push({ at: new Date().toISOString(), message });
    if (this.activity.length > 100) this.activity.shift();
    eventBus.publish('agent', { activity: this.activity.slice(-20) });
  }

  state() {
    const all = this.incidents.all();
    const resolved = all.filter((i) => i.status === 'resolved' && i.mttrMs != null);
    const autonomous = resolved.filter((i) => i.attempts.some((a) => a.actor === 'agent'));
    return {
      paused: this.paused,
      mode: this.settings.get().agentMode,
      aiProvider: this.settings.get().ai.provider,
      aiAvailable: Boolean(this.config.ai.apiKey),
      monitor: this.monitor.status(),
      working: [...this.running],
      pendingApprovals: all.filter((i) => i.status === 'awaiting_approval').map((i) => ({ id: i.id, number: i.number, title: i.title, action: i.pendingAction })),
      circuits: this.guardrails.status(this.supervisor.ids()),
      activity: this.activity.slice(-20),
      stats: {
        totalIncidents: all.length,
        resolved: resolved.length,
        autonomousRecoveries: autonomous.length,
        escalated: all.filter((i) => i.status === 'escalated').length,
      },
    };
  }
}
