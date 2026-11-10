/**
 * Failure knowledge base: known failure signatures, their probable root cause
 * and the predefined recovery playbook (ordered best-first).
 *
 * `score(ctx)` returns { score: 0..1, evidence: string[] } — evidence is what
 * the agent shows the operator to explain *why* it reached its conclusion.
 */

const hasAnomaly = (ctx, type) => ctx.anomalies.some((a) => a.type === type);
const logsMatch = (ctx, re) => ctx.logs.filter((l) => re.test(l.message));

export const SIGNATURES = [
  {
    id: 'bad-deployment',
    name: 'Faulty deployment (regression)',
    category: 'Deployment',
    rootCause: 'A recent deployment introduced a code regression that makes requests fail.',
    playbook: ['rollback-deployment', 'restart-service'],
    score(ctx) {
      const evidence = [];
      let score = 0;
      if (hasAnomaly(ctx, 'ERROR_SPIKE')) {
        score += 0.35;
        evidence.push('Error-rate spike detected on health checks');
      }
      if (ctx.deployedRecently && ctx.lastDeployment?.kind === 'deploy') {
        score += 0.35;
        evidence.push(`Version ${ctx.lastDeployment.toVersion} was deployed shortly before the failure`);
      }
      if (ctx.service.version !== ctx.service.lastGoodVersion) {
        score += 0.1;
        evidence.push(`Running ${ctx.service.version}; last known good is ${ctx.service.lastGoodVersion}`);
      }
      const traces = logsMatch(ctx, /TypeError|ReferenceError|build \d|migration warning/i);
      if (traces.length) {
        score += 0.15;
        evidence.push(`${traces.length} log lines contain new stack traces (e.g. "${traces[traces.length - 1].message.slice(0, 80)}")`);
      }
      return { score, evidence };
    },
  },
  {
    id: 'process-crash',
    name: 'Application crash',
    category: 'Availability',
    rootCause: 'The process terminated because of an unhandled exception.',
    playbook: ['restart-service'],
    score(ctx) {
      const evidence = [];
      let score = 0;
      if (hasAnomaly(ctx, 'SERVICE_DOWN')) {
        score += 0.6;
        evidence.push(`Service status is "${ctx.service.status}" (exit code ${ctx.service.exitCode ?? 'n/a'})`);
      }
      const fatal = logsMatch(ctx, /fatal|unhandled|exited unexpectedly|stack size/i);
      if (fatal.length) {
        score += 0.3;
        evidence.push(`Fatal log entry: "${fatal[fatal.length - 1].message.slice(0, 90)}"`);
      }
      return { score, evidence };
    },
  },
  {
    id: 'memory-leak',
    name: 'Memory leak',
    category: 'Resources',
    rootCause: 'Unbounded cache growth is leaking memory and will exhaust the process.',
    playbook: ['clear-cache', 'restart-service'],
    score(ctx) {
      const evidence = [];
      let score = 0;
      if (hasAnomaly(ctx, 'MEMORY_LEAK')) {
        score += 0.55;
        evidence.push(...ctx.anomalies.find((a) => a.type === 'MEMORY_LEAK').evidence);
      }
      const cache = logsMatch(ctx, /cache (grew|is growing)|eviction disabled/i);
      if (cache.length) {
        score += 0.35;
        evidence.push(`Logs show cache growth without eviction (${cache.length} entries)`);
      }
      return { score, evidence };
    },
  },
  {
    id: 'cpu-saturation',
    name: 'CPU saturation by runaway worker',
    category: 'Resources',
    rootCause: 'A runaway worker in a tight loop is saturating the CPU.',
    playbook: ['throttle-workload', 'restart-service'],
    score(ctx) {
      const evidence = [];
      let score = 0;
      if (hasAnomaly(ctx, 'HIGH_CPU')) {
        score += 0.55;
        evidence.push(...ctx.anomalies.find((a) => a.type === 'HIGH_CPU').evidence);
      }
      const runaway = logsMatch(ctx, /runaway|tight loop/i);
      if (runaway.length) {
        score += 0.35;
        evidence.push('Logs identify a runaway worker');
      }
      return { score, evidence };
    },
  },
  {
    id: 'dependency-loss',
    name: 'Lost dependency connection',
    category: 'Connectivity',
    rootCause: 'The connection pool to a downstream dependency was lost.',
    playbook: ['reconnect-dependency', 'restart-service'],
    score(ctx) {
      const evidence = [];
      let score = 0;
      if (hasAnomaly(ctx, 'DEPENDENCY_FAILURE')) {
        score += 0.55;
        evidence.push(`${ctx.service.dependency} reported as disconnected`);
      }
      const conn = logsMatch(ctx, /ECONNREFUSED|ECONNRESET|lost connection|pool/i);
      if (conn.length) {
        score += 0.35;
        evidence.push(`${conn.length} connection errors in recent logs`);
      }
      return { score, evidence };
    },
  },
  {
    id: 'transient-operation-failure',
    name: 'Transient operation failures',
    category: 'Operations',
    rootCause: 'Background operations failed because of a transient upstream timeout and were not retried.',
    playbook: ['retry-failed-operations', 'restart-service'],
    score(ctx) {
      const evidence = [];
      let score = 0;
      if (hasAnomaly(ctx, 'JOB_FAILURES')) {
        score += 0.5;
        evidence.push(...ctx.anomalies.find((a) => a.type === 'JOB_FAILURES').evidence);
      }
      const timeouts = logsMatch(ctx, /ETIMEDOUT|timeout|transient/i);
      if (timeouts.length) {
        score += 0.4;
        evidence.push(`${timeouts.length} timeout errors indicate a transient upstream problem`);
      }
      return { score, evidence };
    },
  },
  {
    id: 'latency-degradation',
    name: 'Performance degradation',
    category: 'Performance',
    rootCause: 'Request handling is slowed by a saturated thread pool / bad cached query plan.',
    playbook: ['restart-service', 'throttle-workload'],
    score(ctx) {
      const evidence = [];
      let score = 0;
      if (hasAnomaly(ctx, 'HIGH_LATENCY')) {
        score += 0.55;
        evidence.push(...ctx.anomalies.find((a) => a.type === 'HIGH_LATENCY').evidence);
      }
      const slow = logsMatch(ctx, /saturated|slow query|delayed/i);
      if (slow.length) {
        score += 0.3;
        evidence.push('Logs report thread-pool saturation');
      }
      return { score, evidence };
    },
  },
];

/** Used when nothing matches well: restarting is the safest generic remedy. */
export const UNKNOWN_SIGNATURE = {
  id: 'unknown',
  name: 'Unclassified failure',
  category: 'Unknown',
  rootCause: 'Symptoms do not match a known failure signature.',
  playbook: ['restart-service'],
};

export const getSignature = (id) => SIGNATURES.find((s) => s.id === id) || (id === 'unknown' ? UNKNOWN_SIGNATURE : null);
