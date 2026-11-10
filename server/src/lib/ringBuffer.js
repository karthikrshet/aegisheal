/** Fixed-size FIFO buffer used for metric samples and log lines (bounded memory). */
export class RingBuffer {
  constructor(capacity = 100) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('capacity must be a positive integer');
    this.capacity = capacity;
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    if (this.items.length > this.capacity) this.items.splice(0, this.items.length - this.capacity);
    return item;
  }

  last(n = 1) {
    return n >= this.items.length ? [...this.items] : this.items.slice(-n);
  }

  latest() {
    return this.items[this.items.length - 1];
  }

  toArray() {
    return [...this.items];
  }

  clear() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }
}
