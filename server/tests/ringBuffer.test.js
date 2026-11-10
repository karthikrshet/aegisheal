import { describe, it, expect } from 'vitest';
import { RingBuffer } from '../src/lib/ringBuffer.js';

describe('RingBuffer', () => {
  it('keeps only the most recent items', () => {
    const rb = new RingBuffer(3);
    [1, 2, 3, 4, 5].forEach((n) => rb.push(n));
    expect(rb.toArray()).toEqual([3, 4, 5]);
    expect(rb.size).toBe(3);
    expect(rb.latest()).toBe(5);
  });

  it('returns the last n items', () => {
    const rb = new RingBuffer(10);
    [1, 2, 3, 4].forEach((n) => rb.push(n));
    expect(rb.last(2)).toEqual([3, 4]);
    expect(rb.last(99)).toEqual([1, 2, 3, 4]);
  });

  it('rejects invalid capacity', () => {
    expect(() => new RingBuffer(0)).toThrow();
    expect(() => new RingBuffer(1.5)).toThrow();
  });

  it('can be cleared', () => {
    const rb = new RingBuffer(2);
    rb.push('a');
    rb.clear();
    expect(rb.size).toBe(0);
    expect(rb.latest()).toBeUndefined();
  });
});
