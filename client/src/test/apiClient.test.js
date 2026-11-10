import { describe, it, expect, vi, afterEach } from 'vitest';
import { request, qs, ApiError, setUnauthorizedHandler } from '../api/client.js';

const respond = (status, body) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)) });

afterEach(() => {
  vi.restoreAllMocks();
  setUnauthorizedHandler(null);
});

describe('api client', () => {
  it('sends JSON and returns parsed data', async () => {
    globalThis.fetch = respond(200, { ok: true });
    const data = await request('/things', { method: 'POST', body: { a: 1 } });
    expect(data).toEqual({ ok: true });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/things');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"a":1}');
    expect(init.credentials).toBe('same-origin');
  });

  it('throws ApiError with the server message', async () => {
    globalThis.fetch = respond(400, { error: { message: 'Invalid body', code: 'BAD_REQUEST', details: [{ field: 'x' }] } });
    const err = await request('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe('Invalid body');
    expect(err.details).toHaveLength(1);
  });

  it('calls the unauthorized handler on 401 (but not for login)', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    globalThis.fetch = respond(401, { error: { message: 'nope' } });
    await request('/services').catch(() => {});
    expect(handler).toHaveBeenCalledTimes(1);
    await request('/auth/login', { method: 'POST', body: {} }).catch(() => {});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports an unreachable server clearly', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await request('/x').catch((e) => e);
    expect(err.code).toBe('NETWORK');
    globalThis.fetch = respond(502);
    const proxyErr = await request('/x').catch((e) => e);
    expect(proxyErr.message).toMatch(/Cannot reach/);
  });

  it('builds query strings without empty values', () => {
    expect(qs({ a: 1, b: '', c: null, d: 'x y' })).toBe('?a=1&d=x+y');
    expect(qs({})).toBe('');
  });
});
