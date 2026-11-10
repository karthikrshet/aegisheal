import bcrypt from 'bcryptjs';

const ROUNDS = 10;

/** At least 8 chars, one letter and one number. Max 128 to bound bcrypt cost. */
export function validatePasswordStrength(password) {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password must be at most 128 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
}

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);

export const verifyPassword = (plain, hash) => {
  if (typeof plain !== 'string' || typeof hash !== 'string') return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
};
