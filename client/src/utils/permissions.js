const RANK = { viewer: 1, operator: 2, admin: 3 };

/** Mirrors the server's role hierarchy so the UI hides what the server would reject. */
export function can(user, role) {
  if (!user) return false;
  return (RANK[user.role] || 0) >= (RANK[role] || 99);
}

export const isAdmin = (user) => can(user, 'admin');
export const isOperator = (user) => can(user, 'operator');
