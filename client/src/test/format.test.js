import { describe, it, expect } from 'vitest';
import { formatDuration, timeAgo, formatPercent, humanize, initials, formatNumber } from '../utils/format.js';

describe('formatDuration', () => {
  it.each([
    [null, '—'],
    [450, '450 ms'],
    [12400, '12.4 s'],
    [125000, '2m 5s'],
    [3_900_000, '1h 5m'],
  ])('%s -> %s', (input, out) => expect(formatDuration(input)).toBe(out));
});

describe('timeAgo', () => {
  const now = new Date('2026-01-01T12:00:00Z').getTime();
  it('formats relative times', () => {
    expect(timeAgo(now - 2000, now)).toBe('just now');
    expect(timeAgo(now - 30000, now)).toBe('30 s ago');
    expect(timeAgo(now - 5 * 60000, now)).toBe('5 min ago');
    expect(timeAgo(now - 3 * 3600000, now)).toBe('3 h ago');
  });
  it('handles empty and invalid values', () => {
    expect(timeAgo(null)).toBe('—');
    expect(timeAgo('not a date')).toBe('—');
  });
});

describe('misc formatters', () => {
  it('formats percentages', () => {
    expect(formatPercent(0.956)).toBe('96%');
    expect(formatPercent(0.956, 1)).toBe('95.6%');
    expect(formatPercent(undefined)).toBe('—');
  });
  it('humanizes identifiers', () => {
    expect(humanize('SERVICE_DOWN')).toBe('Service down');
    expect(humanize('rollback-deployment')).toBe('Rollback deployment');
    expect(humanize('')).toBe('');
  });
  it('builds initials', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('')).toBe('?');
  });
  it('formats numbers', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(12.345, 1)).toMatch(/12[.,]3/);
  });
});
