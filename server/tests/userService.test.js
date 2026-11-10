import { describe, it, expect, beforeEach } from 'vitest';
import { JsonStore } from '../src/lib/store.js';
import { UserService } from '../src/users/userService.js';

let users;
let admin;

beforeEach(async () => {
  users = new UserService(new JsonStore(null));
  admin = await users.create({ name: 'Admin', email: 'Admin@Test.local', password: 'Admin@12345', role: 'admin' });
});

describe('UserService', () => {
  it('normalises e-mail and never exposes the hash', () => {
    expect(admin.email).toBe('admin@test.local');
    expect(admin).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicates and weak passwords', async () => {
    await expect(users.create({ name: 'X', email: 'admin@test.local', password: 'Abcdef123' })).rejects.toThrow(/already exists/);
    await expect(users.create({ name: 'X', email: 'x@test.local', password: 'weak' })).rejects.toThrow(/at least 8/);
  });

  it('authenticates with correct credentials only', async () => {
    expect((await users.authenticate('ADMIN@test.local', 'Admin@12345')).id).toBe(admin.id);
    await expect(users.authenticate('admin@test.local', 'nope')).rejects.toThrow(/Invalid/);
    await expect(users.authenticate('ghost@test.local', 'nope')).rejects.toThrow(/Invalid/);
  });

  it('locks the account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i += 1) await expect(users.authenticate('admin@test.local', 'wrong')).rejects.toThrow();
    await expect(users.authenticate('admin@test.local', 'Admin@12345')).rejects.toThrow(/locked/);
  });

  it('protects the last administrator', async () => {
    const op = await users.create({ name: 'Op', email: 'op@test.local', password: 'Operator1', role: 'operator' });
    expect(() => users.update(op.id, admin.id, { role: 'viewer' })).toThrow(/last active administrator/);
    expect(() => users.remove(op.id, admin.id)).toThrow(/last administrator/);
    expect(() => users.remove(admin.id, admin.id)).toThrow(/own account/);
  });

  it('changing password bumps the token version', async () => {
    const before = users.getRaw(admin.id).tokenVersion;
    await users.changePassword(admin.id, 'Admin@12345', 'NewPass123');
    expect(users.getRaw(admin.id).tokenVersion).toBe(before + 1);
    await expect(users.changePassword(admin.id, 'wrong', 'Another123')).rejects.toThrow(/incorrect/);
  });

  it('disabled users cannot sign in', async () => {
    const v = await users.create({ name: 'V', email: 'v@test.local', password: 'Viewer123', role: 'viewer' });
    users.update(admin.id, v.id, { active: false });
    await expect(users.authenticate('v@test.local', 'Viewer123')).rejects.toThrow(/disabled/);
  });
});
