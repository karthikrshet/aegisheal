/**
 * Learning from previous incidents.
 * Tracks the outcome of every (failure signature, action) pair and uses a
 * Laplace-smoothed success rate to re-rank playbook actions over time.
 */
export class LearningModel {
  constructor(store) {
    this.store = store;
    if (!store.getDoc('learning') || typeof store.getDoc('learning') !== 'object') store.setDoc('learning', {});
  }

  get stats() {
    return this.store.getDoc('learning');
  }

  record(signatureId, actionId, success, recoveryMs) {
    const stats = this.stats;
    stats[signatureId] ??= {};
    const s = (stats[signatureId][actionId] ??= { attempts: 0, successes: 0, totalRecoveryMs: 0 });
    s.attempts += 1;
    if (success) {
      s.successes += 1;
      s.totalRecoveryMs += Math.max(0, recoveryMs || 0);
    }
    s.lastOutcome = success ? 'success' : 'failure';
    s.updatedAt = new Date().toISOString();
    this.store.setDoc('learning', stats);
    return s;
  }

  successRate(signatureId, actionId) {
    const s = this.stats[signatureId]?.[actionId];
    return s ? (s.successes + 1) / (s.attempts + 2) : 0.5;
  }

  /**
   * Rank candidate actions: 40 % playbook order (expert prior), 60 % learned success.
   * Returns [{ actionId, score, successRate, attempts }] best first.
   */
  rank(signatureId, playbook) {
    return playbook
      .map((actionId, i) => {
        const prior = Math.max(0.2, 1 - i * 0.3);
        const rate = this.successRate(signatureId, actionId);
        const s = this.stats[signatureId]?.[actionId];
        return { actionId, score: +(0.4 * prior + 0.6 * rate).toFixed(3), successRate: +rate.toFixed(2), attempts: s?.attempts || 0 };
      })
      .sort((a, b) => b.score - a.score);
  }

  summary() {
    const rows = [];
    for (const [signatureId, actions] of Object.entries(this.stats)) {
      for (const [actionId, s] of Object.entries(actions)) {
        rows.push({
          signatureId,
          actionId,
          attempts: s.attempts,
          successes: s.successes,
          successRate: s.attempts ? +(s.successes / s.attempts).toFixed(2) : 0,
          avgRecoveryMs: s.successes ? Math.round(s.totalRecoveryMs / s.successes) : null,
          lastOutcome: s.lastOutcome,
        });
      }
    }
    return rows;
  }
}
