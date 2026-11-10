import { describe, it, expect, beforeEach } from 'vitest';
import { JsonStore } from '../src/lib/store.js';
import { SettingsService } from '../src/settings/settingsService.js';
import { Guardrails } from '../src/agent/guardrails.js';
import { LearningModel } from '../src/agent/learning.js';
import { testConfig } from './helpers.js';

let store;
let settings;
let guardrails;

beforeEach(() => {
  store = new JsonStore(null);
  settings = new SettingsService(store, testConfig());
  guardrails = new Guardrails(settings);
});

const evaluate = (over = {}) => guardrails.evaluate({ serviceId: 'svc', actionId: 'restart-service', confidence: 0.9, attempt: 1, ...over });

describe('guardrails', () => {
  it('allows a confident autonomous action', () => {
    expect(evaluate()).toMatchObject({ allowed: true, requiresApproval: false });
  });

  it('rejects actions that are not predefined', () => {
    expect(evaluate({ actionId: 'rm -rf /' }).allowed).toBe(false);
  });

  it('rejects actions disabled by policy', () => {
    settings.update({ allowedActions: ['clear-cache'] });
    expect(evaluate().reason).toMatch(/disabled/);
  });

  it('observe mode never acts, supervised mode asks', () => {
    settings.update({ agentMode: 'observe' });
    expect(evaluate()).toMatchObject({ allowed: false, observeOnly: true });
    settings.update({ agentMode: 'supervised' });
    expect(evaluate()).toMatchObject({ allowed: true, requiresApproval: true });
  });

  it('low confidence or high-risk actions need approval', () => {
    expect(evaluate({ confidence: 0.2 }).requiresApproval).toBe(true);
    expect(evaluate({ actionId: 'rollback-deployment', confidence: 0.6 }).requiresApproval).toBe(true);
    expect(evaluate({ actionId: 'rollback-deployment', confidence: 0.9 }).requiresApproval).toBe(false);
  });

  it('enforces max attempts and cooldown', () => {
    expect(evaluate({ attempt: 4 }).allowed).toBe(false);
    guardrails.begin('svc', 'restart-service');
    guardrails.end('svc', true);
    expect(evaluate()).toMatchObject({ allowed: false, cooldown: true });
  });

  it('opens the circuit breaker after repeated failures', () => {
    settings.update({ guardrails: { cooldownMs: 0 } });
    for (let i = 0; i < 4; i += 1) {
      guardrails.begin('svc', 'restart-service');
      guardrails.end('svc', false);
    }
    expect(evaluate()).toMatchObject({ allowed: false, circuitOpen: true });
    guardrails.resetCircuit('svc');
    expect(evaluate().allowed).toBe(true);
  });

  it('limits concurrent recoveries (blast radius)', () => {
    guardrails.begin('a', 'clear-cache');
    guardrails.begin('b', 'clear-cache');
    expect(evaluate()).toMatchObject({ allowed: false, busy: true });
  });

  it('operator approval bypasses limits but not the whitelist', () => {
    expect(evaluate({ attempt: 9, manualApproval: true }).allowed).toBe(true);
    expect(evaluate({ actionId: 'format-disk', manualApproval: true }).allowed).toBe(false);
  });
});

describe('learning model', () => {
  it('prefers actions that worked before', () => {
    const learning = new LearningModel(store);
    const playbook = ['clear-cache', 'restart-service'];
    expect(learning.rank('memory-leak', playbook)[0].actionId).toBe('clear-cache');
    for (let i = 0; i < 6; i += 1) {
      learning.record('memory-leak', 'clear-cache', false);
      learning.record('memory-leak', 'restart-service', true, 3000);
    }
    expect(learning.rank('memory-leak', playbook)[0].actionId).toBe('restart-service');
    const row = learning.summary().find((r) => r.actionId === 'restart-service');
    expect(row).toMatchObject({ attempts: 6, successes: 6, successRate: 1, avgRecoveryMs: 3000 });
  });
});

describe('settings service', () => {
  it('validates and rejects bad values', () => {
    expect(() => settings.update({ thresholds: { cpuPercent: 500 } })).toThrow(/Invalid settings/);
    expect(() => settings.update({ hacker: true })).toThrow();
    expect(() => settings.update({ allowedActions: ['shutdown-server'] })).toThrow();
  });

  it('deep merges partial updates and can reset', () => {
    settings.update({ thresholds: { cpuPercent: 70 } });
    expect(settings.get().thresholds.cpuPercent).toBe(70);
    expect(settings.get().thresholds.memoryMB).toBe(220);
    settings.reset();
    expect(settings.get().thresholds.cpuPercent).toBe(80);
  });
});
