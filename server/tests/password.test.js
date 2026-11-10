import { describe, it, expect } from 'vitest';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../src/auth/password.js';
import { hasRole } from '../src/auth/roles.js';
import { signToken, verifyToken } from '../src/auth/tokens.js';

describe('password policy', () => {
  it.each([
    ['short1', 'at least 8'],
    ['onlyletters', 'letter and one number'],
    ['12345678', 'letter and one number'],
    ['a1'.repeat(70), 'at most 128'],
  ])('rejects %s', (pw, msg) => {
    expect(validatePasswordStrength(pw)).toContain(msg);
  });

  it('accepts a strong password', () => {
    expect(validatePasswordStrength('Secure123')).toBeNull();
  });

  it('hashes and verifies', async () => {
    const hash = await hashPassword('Secure123');
    expect(hash).not.toContain('Secure123');
    expect(await verifyPassword('Secure123', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
    expect(await verifyPassword(undefined, hash)).toBe(false);
  });
});

describe('roles', () => {
  it('ranks admin > operator > viewer', () => {
    expect(hasRole('admin', 'operator')).toBe(true);
    expect(hasRole('operator', 'admin')).toBe(false);
    expect(hasRole('viewer', 'viewer')).toBe(true);
    expect(hasRole('hacker', 'viewer')).toBe(false);
  });
});

describe('tokens', () => {
  const secret = 'x'.repeat(40);
  it('signs and verifies', () => {
    const token = signToken({ id: 'usr_1', role: 'admin', tokenVersion: 2 }, { secret, expiresIn: '1h' });
    const payload = verifyToken(token, secret);
    expect(payload.sub).toBe('usr_1');
    expect(payload.tv).toBe(2);
  });
  it('rejects tampered tokens and wrong secrets', () => {
    const token = signToken({ id: 'usr_1', role: 'viewer' }, { secret, expiresIn: '1h' });
    expect(verifyToken(token + 'x', secret)).toBeNull();
    expect(verifyToken(token, 'y'.repeat(40))).toBeNull();
  });
});
