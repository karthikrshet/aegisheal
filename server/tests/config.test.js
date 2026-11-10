import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config/index.js';

describe('config', () => {
  it('applies defaults', () => {
    const c = loadConfig({ NODE_ENV: 'development' });
    expect(c.port).toBe(4000);
    expect(c.agentMode).toBe('autonomous');
    expect(c.ai.provider).toBe('local');
    expect(c.ai.model).toBe('claude-opus-5-5');
  });

  it('generates a temporary secret in development when weak', () => {
    const c = loadConfig({ NODE_ENV: 'development', JWT_SECRET: 'short' });
    expect(c.jwtSecretGenerated).toBe(true);
    expect(c.jwtSecret.length).toBeGreaterThanOrEqual(64);
  });

  it('refuses to start in production without a strong secret', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'change-me-please-change-me-please-123' })).toThrow(/JWT_SECRET/);
  });

  it('reports invalid values clearly', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ AGENT_MODE: 'yolo' })).toThrow(/AGENT_MODE/);
    expect(() => loadConfig({ MONITOR_INTERVAL_MS: '10' })).toThrow(/MONITOR_INTERVAL_MS/);
  });

  it('parses multiple CORS origins', () => {
    const c = loadConfig({ CLIENT_ORIGIN: 'http://a.test, http://b.test' });
    expect(c.clientOrigin).toEqual(['http://a.test', 'http://b.test']);
  });
});
