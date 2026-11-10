import crypto from 'node:crypto';

/** Short, sortable, collision-resistant id with a readable prefix, e.g. `inc_lt3k9a_4f2c1b`. */
export function newId(prefix = 'id') {
  const time = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${time}_${rand}`;
}

/** Human friendly incident number, e.g. INC-0042. */
export function incidentNumber(n) {
  return `INC-${String(n).padStart(4, '0')}`;
}
