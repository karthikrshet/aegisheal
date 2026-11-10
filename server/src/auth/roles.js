/**
 * Role-based access control.
 * viewer   – read-only dashboards
 * operator – viewer + run recovery actions, chaos lab, approve agent decisions
 * admin    – operator + settings, users, agent mode, audit log
 */
export const ROLES = ['viewer', 'operator', 'admin'];

const RANK = { viewer: 1, operator: 2, admin: 3 };

export function hasRole(userRole, required) {
  return (RANK[userRole] || 0) >= (RANK[required] || 99);
}
