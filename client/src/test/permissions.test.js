import { describe, it, expect } from 'vitest';
import { can, isAdmin, isOperator } from '../utils/permissions.js';

describe('permissions', () => {
  it('mirrors the server role hierarchy', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isOperator({ role: 'admin' })).toBe(true);
    expect(isOperator({ role: 'operator' })).toBe(true);
    expect(isAdmin({ role: 'operator' })).toBe(false);
    expect(isOperator({ role: 'viewer' })).toBe(false);
    expect(can({ role: 'viewer' }, 'viewer')).toBe(true);
  });

  it('denies unknown roles and missing users', () => {
    expect(can(null, 'viewer')).toBe(false);
    expect(can({ role: 'superuser' }, 'viewer')).toBe(false);
    expect(can({ role: 'admin' }, 'root')).toBe(false);
  });
});
