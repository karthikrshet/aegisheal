import { z } from 'zod';

export const ACTION_IDS = [
  'restart-service',
  'rollback-deployment',
  'clear-cache',
  'reconnect-dependency',
  'retry-failed-operations',
  'throttle-workload',
];

export const settingsSchema = z
  .object({
    agentMode: z.enum(['autonomous', 'supervised', 'observe']),
    thresholds: z
      .object({
        cpuPercent: z.number().min(10).max(100),
        memoryMB: z.number().min(64).max(4096),
        latencyMs: z.number().min(50).max(10000),
        errorRate: z.number().min(0.01).max(1),
        failedJobs: z.number().int().min(1).max(1000),
        consecutiveSamples: z.number().int().min(1).max(20),
      })
      .strict(),
    guardrails: z
      .object({
        maxAttemptsPerIncident: z.number().int().min(1).max(10),
        cooldownMs: z.number().int().min(0).max(600000),
        circuitBreakerFailures: z.number().int().min(1).max(50),
        circuitBreakerWindowMs: z.number().int().min(60000).max(86400000),
        maxConcurrentRecoveries: z.number().int().min(1).max(10),
        minConfidenceForAutonomy: z.number().min(0).max(1),
        verificationChecks: z.number().int().min(1).max(10),
        verificationTimeoutMs: z.number().int().min(3000).max(120000),
      })
      .strict(),
    allowedActions: z.array(z.enum(ACTION_IDS)).max(ACTION_IDS.length),
    ai: z
      .object({
        provider: z.enum(['local', 'claude']),
        model: z.string().min(3).max(80).regex(/^[\w.-]+$/),
      })
      .strict(),
    notifications: z
      .object({
        escalationBanner: z.boolean(),
      })
      .strict(),
  })
  .strict();

export function defaultSettings(config) {
  return {
    agentMode: config.agentMode,
    thresholds: {
      cpuPercent: 80,
      memoryMB: 220,
      latencyMs: 800,
      errorRate: 0.3,
      failedJobs: 5,
      consecutiveSamples: 2,
    },
    guardrails: {
      maxAttemptsPerIncident: 3,
      cooldownMs: 5000,
      circuitBreakerFailures: 4,
      circuitBreakerWindowMs: 600000,
      maxConcurrentRecoveries: 2,
      minConfidenceForAutonomy: 0.5,
      verificationChecks: 3,
      verificationTimeoutMs: 20000,
    },
    allowedActions: [...ACTION_IDS],
    ai: { provider: config.ai.provider, model: config.ai.model },
    notifications: { escalationBanner: true },
  };
}
