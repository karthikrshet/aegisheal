import { createLogger } from '../lib/logger.js';

const log = createLogger('bootstrap');

/** Make sure a fresh install always has an administrator who can sign in. */
export async function ensureAdmin(users, admin) {
  if (users.count() > 0) return null;
  const created = await users.create({ name: admin.name, email: admin.email, password: admin.password, role: 'admin' });
  log.info(`Created default admin ${created.email} — change the password after first login`);
  return created;
}
