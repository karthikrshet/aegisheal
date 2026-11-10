import { getAction } from '../recovery/actions/index.js';

/**
 * Agent restrictions. Every action the agent wants to take passes through here.
 * Returns { allowed, requiresApproval, reason }.
 *
 *  1. Action must be a predefined, enabled action (whitelist).
 *  2. Observe mode never acts; supervised mode always asks a human.
 *  3. Low-confidence diagnoses require human approval even in autonomous mode.
 *  4. High-risk actions (rollback) on low confidence require approval.
 *  5. Max attempts per incident.
 *  6. Cooldown between identical actions on the same service.
 *  7. Circuit breaker: too many failed recoveries on a service -> stop and escalate.
 *  8. Blast radius: limit on concurrent recoveries across all services.
 */
export class Guardrails {
  constructor(settingsService) {
    this.settings = settingsService;
    this.lastActionAt = new Map(); // `${service}:${action}` -> ms
    this.failures = new Map(); // service -> [ms]
    this.active = new Set(); // services currently recovering
  }

  key(serviceId, actionId) {
    return `${serviceId}:${actionId}`;
  }

  failureCount(serviceId) {
    const { circuitBreakerWindowMs } = this.settings.get().guardrails;
    const cutoff = Date.now() - circuitBreakerWindowMs;
    const list = (this.failures.get(serviceId) || []).filter((t) => t >= cutoff);
    this.failures.set(serviceId, list);
    return list.length;
  }

  isCircuitOpen(serviceId) {
    return this.failureCount(serviceId) >= this.settings.get().guardrails.circuitBreakerFailures;
  }

  evaluate({ serviceId, actionId, confidence, attempt, manualApproval = false }) {
    const s = this.settings.get();
    const g = s.guardrails;
    const action = getAction(actionId);

    if (!action) return { allowed: false, reason: `"${actionId}" is not a predefined recovery action` };
    if (!s.allowedActions.includes(actionId)) return { allowed: false, reason: `"${action.name}" is disabled by policy` };
    // A human operator explicitly approved this action: only the whitelist applies.
    if (manualApproval) return { allowed: true, requiresApproval: false, reason: 'Approved by operator' };
    if (attempt > g.maxAttemptsPerIncident) {
      return { allowed: false, reason: `Max ${g.maxAttemptsPerIncident} recovery attempts reached for this incident` };
    }
    if (this.isCircuitOpen(serviceId)) {
      return { allowed: false, circuitOpen: true, reason: `Circuit breaker open: ${g.circuitBreakerFailures}+ failed recoveries recently` };
    }
    const last = this.lastActionAt.get(this.key(serviceId, actionId));
    if (last && Date.now() - last < g.cooldownMs) {
      return { allowed: false, cooldown: true, reason: `Cooldown active for "${action.name}" (${Math.ceil((g.cooldownMs - (Date.now() - last)) / 1000)} s left)` };
    }
    if (!this.active.has(serviceId) && this.active.size >= g.maxConcurrentRecoveries) {
      return { allowed: false, busy: true, reason: `Blast-radius limit: ${g.maxConcurrentRecoveries} recoveries already in progress` };
    }

    if (s.agentMode === 'observe') return { allowed: false, observeOnly: true, reason: 'Agent is in observe-only mode' };
    if (s.agentMode === 'supervised') return { allowed: true, requiresApproval: true, reason: 'Supervised mode: human approval required' };
    if (confidence < g.minConfidenceForAutonomy) {
      return { allowed: true, requiresApproval: true, reason: `Confidence ${(confidence * 100).toFixed(0)}% below autonomy threshold ${(g.minConfidenceForAutonomy * 100).toFixed(0)}%` };
    }
    if (action.risk === 'high' && confidence < 0.7) {
      return { allowed: true, requiresApproval: true, reason: `High-risk action "${action.name}" needs ≥70% confidence for autonomy` };
    }
    return { allowed: true, requiresApproval: false, reason: 'All guardrails passed' };
  }

  begin(serviceId, actionId) {
    this.active.add(serviceId);
    this.lastActionAt.set(this.key(serviceId, actionId), Date.now());
  }

  end(serviceId, success) {
    this.active.delete(serviceId);
    if (!success) {
      const list = this.failures.get(serviceId) || [];
      list.push(Date.now());
      this.failures.set(serviceId, list);
    }
  }

  resetCircuit(serviceId) {
    this.failures.delete(serviceId);
  }

  status(serviceIds) {
    return serviceIds.map((id) => ({
      serviceId: id,
      recentFailures: this.failureCount(id),
      circuitOpen: this.isCircuitOpen(id),
      recovering: this.active.has(id),
    }));
  }
}
