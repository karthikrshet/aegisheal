import { hashPassword, validatePasswordStrength, verifyPassword } from '../auth/password.js';
import { ROLES } from '../auth/roles.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../lib/errors.js';

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
// Hash compared against for unknown e-mails, so they take as long as wrong passwords (no user enumeration).
let dummyHash = null;
const getDummyHash = async () => (dummyHash ??= await hashPassword('dummy-password-for-timing-1'));

export class UserService {
  constructor(store) {
    this.store = store;
  }

  toPublic(u) {
    return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null };
  }

  getRaw(id) {
    return this.store.getById('users', id);
  }

  byEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    return this.store.find('users', (u) => u.email === e);
  }

  list() {
    return this.store.list('users').map((u) => this.toPublic(u));
  }

  count() {
    return this.store.list('users').length;
  }

  async create({ name, email, password, role = 'viewer' }) {
    const normalised = String(email).trim().toLowerCase();
    if (this.byEmail(normalised)) throw conflict('A user with this e-mail already exists');
    if (!ROLES.includes(role)) throw badRequest('Invalid role');
    const weak = validatePasswordStrength(password);
    if (weak) throw badRequest(weak);
    const user = this.store.insert(
      'users',
      {
        name: String(name).trim(),
        email: normalised,
        role,
        active: true,
        passwordHash: await hashPassword(password),
        tokenVersion: 0,
        failedLogins: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      },
      'usr',
    );
    return this.toPublic(user);
  }

  async authenticate(email, password) {
    const user = this.byEmail(email);
    if (!user) {
      await verifyPassword(String(password), await getDummyHash());
      throw unauthorized('Invalid e-mail or password');
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw Object.assign(unauthorized('Account temporarily locked after too many failed attempts. Try again later.'), { code: 'LOCKED' });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= MAX_FAILED) {
        user.lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
        user.failedLogins = 0;
      }
      this.store.scheduleFlush();
      throw unauthorized('Invalid e-mail or password');
    }
    if (!user.active) throw forbidden('This account has been disabled. Contact an administrator.');
    user.failedLogins = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date().toISOString();
    this.store.scheduleFlush();
    return user;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = this.getRaw(userId);
    if (!user) throw notFound('User not found');
    if (!(await verifyPassword(currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect');
    const weak = validatePasswordStrength(newPassword);
    if (weak) throw badRequest(weak);
    if (currentPassword === newPassword) throw badRequest('New password must be different');
    user.passwordHash = await hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // signs out other sessions
    this.store.scheduleFlush();
    return user;
  }

  adminCount() {
    return this.store.filter('users', (u) => u.role === 'admin' && u.active).length;
  }

  update(actorId, id, patch) {
    const user = this.getRaw(id);
    if (!user) throw notFound('User not found');
    const demotesAdmin = user.role === 'admin' && ((patch.role && patch.role !== 'admin') || patch.active === false);
    if (demotesAdmin && this.adminCount() <= 1) throw conflict('Cannot remove the last active administrator');
    if (actorId === id && (patch.active === false || (patch.role && patch.role !== user.role))) {
      throw forbidden('You cannot change your own role or disable yourself');
    }
    if (patch.name !== undefined) user.name = patch.name.trim();
    if (patch.role !== undefined) user.role = patch.role;
    if (patch.active !== undefined) user.active = patch.active;
    if (patch.role !== undefined || patch.active === false) user.tokenVersion = (user.tokenVersion || 0) + 1;
    this.store.scheduleFlush();
    return this.toPublic(user);
  }

  async resetPassword(id, newPassword) {
    const user = this.getRaw(id);
    if (!user) throw notFound('User not found');
    const weak = validatePasswordStrength(newPassword);
    if (weak) throw badRequest(weak);
    user.passwordHash = await hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.lockedUntil = null;
    user.failedLogins = 0;
    this.store.scheduleFlush();
    return this.toPublic(user);
  }

  remove(actorId, id) {
    const user = this.getRaw(id);
    if (!user) throw notFound('User not found');
    if (actorId === id) throw forbidden('You cannot delete your own account');
    if (user.role === 'admin' && this.adminCount() <= 1) throw conflict('Cannot delete the last administrator');
    this.store.remove('users', id);
    return true;
  }
}
