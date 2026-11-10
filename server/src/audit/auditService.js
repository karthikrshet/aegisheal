import { eventBus } from '../lib/eventBus.js';

/** Append-only audit trail of every human and agent action. */
export class AuditService {
  constructor(store) {
    this.store = store;
  }

  record({ actor, action, target = null, detail = null, ip = null }) {
    const entry = this.store.insert(
      'auditLogs',
      { at: new Date().toISOString(), actor: actor || 'system', action, target, detail, ip },
      'aud',
    );
    eventBus.publish('audit', entry);
    return entry;
  }

  query({ actor, action, limit = 100, offset = 0 } = {}) {
    let rows = this.store.list('auditLogs');
    if (actor) rows = rows.filter((r) => r.actor === actor);
    if (action) rows = rows.filter((r) => r.action.startsWith(action));
    const total = rows.length;
    const items = rows.slice().reverse().slice(offset, offset + limit);
    return { total, items };
  }
}
