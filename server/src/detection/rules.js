/**
 * Failure-detection rules (methodology Step 2).
 * Each rule inspects the latest metric samples of one service and returns
 * `null` (healthy) or an anomaly description with human-readable evidence.
 */

const lastN = (samples, n) => samples.slice(-n);
const allMatch = (samples, n, fn) => samples.length >= n && lastN(samples, n).every(fn);

export const RULES = [
  {
    type: 'SERVICE_DOWN',
    title: 'Service is down',
    severity: 'critical',
    evaluate({ samples, process }) {
      if (process.status === 'crashed') {
        return { evidence: [`Process exited unexpectedly with code ${process.exitCode}`] };
      }
      if (process.status === 'unhealthy') {
        return { evidence: ['Process started but never became reachable on its port'] };
      }
      if (process.status === 'running' && allMatch(samples, 2, (s) => s.error === 'connection refused')) {
        return { evidence: ['Health endpoint refused 2 consecutive connections'] };
      }
      return null;
    },
  },
  {
    type: 'ERROR_SPIKE',
    title: 'Error rate spike',
    severity: 'high',
    evaluate({ samples, thresholds }) {
      const n = Math.max(thresholds.consecutiveSamples, 2);
      const window = lastN(samples, n + 2);
      if (window.length < n) return null;
      const failedHealth = window.filter((s) => s.statusCode >= 500 && s.statusCode !== 503).length;
      const latest = samples[samples.length - 1];
      const rate = latest?.errorRate ?? 0;
      // The application error rate must stay high for n samples (not a single stale reading).
      const sustainedRate = allMatch(samples, n, (s) => (s.errorRate ?? 0) >= thresholds.errorRate && s.dependency === 'connected');
      if (failedHealth >= n || sustainedRate) {
        return {
          evidence: [
            `${failedHealth}/${window.length} recent health checks returned HTTP 5xx`,
            `Application error rate ${(rate * 100).toFixed(0)}% (threshold ${(thresholds.errorRate * 100).toFixed(0)}%)`,
          ],
          value: rate,
        };
      }
      return null;
    },
  },
  {
    type: 'DEPENDENCY_FAILURE',
    title: 'Dependency connection lost',
    severity: 'high',
    evaluate({ samples, thresholds }) {
      if (allMatch(samples, thresholds.consecutiveSamples, (s) => s.dependency === 'disconnected')) {
        return { evidence: ['Service reports its downstream dependency as disconnected', 'Health endpoint returns HTTP 503 (degraded)'] };
      }
      return null;
    },
  },
  {
    type: 'MEMORY_LEAK',
    title: 'Memory usage too high',
    severity: 'high',
    evaluate({ samples, thresholds }) {
      const n = thresholds.consecutiveSamples;
      if (!allMatch(samples, n, (s) => (s.memoryMB ?? 0) > thresholds.memoryMB)) return null;
      const w = lastN(samples, 5).map((s) => s.memoryMB ?? 0);
      const growing = w.length >= 3 && w.every((v, i) => i === 0 || v >= w[i - 1] - 1);
      const latest = w[w.length - 1];
      return {
        evidence: [
          `Resident memory ${latest} MB exceeds ${thresholds.memoryMB} MB for ${n} samples`,
          growing ? 'Memory is growing monotonically (leak pattern)' : 'Memory is high but stable',
        ],
        value: latest,
      };
    },
  },
  {
    type: 'HIGH_CPU',
    title: 'CPU saturation',
    severity: 'high',
    evaluate({ samples, thresholds }) {
      const n = thresholds.consecutiveSamples;
      if (!allMatch(samples, n, (s) => (s.cpuPercent ?? 0) > thresholds.cpuPercent)) return null;
      const latest = samples[samples.length - 1].cpuPercent;
      return { evidence: [`Process CPU ${latest}% above ${thresholds.cpuPercent}% for ${n} consecutive samples`], value: latest };
    },
  },
  {
    type: 'HIGH_LATENCY',
    title: 'Response time degraded',
    severity: 'medium',
    evaluate({ samples, thresholds }) {
      const n = thresholds.consecutiveSamples;
      if (!allMatch(samples, n, (s) => s.up && (s.responseMs ?? 0) > thresholds.latencyMs)) return null;
      const latest = samples[samples.length - 1].responseMs;
      return { evidence: [`Health response time ${latest} ms above ${thresholds.latencyMs} ms for ${n} samples`], value: latest };
    },
  },
  {
    type: 'JOB_FAILURES',
    title: 'Background operations failing',
    severity: 'medium',
    evaluate({ samples, thresholds }) {
      const latest = samples[samples.length - 1];
      if (!latest || (latest.failedJobs ?? 0) < thresholds.failedJobs) return null;
      return { evidence: [`${latest.failedJobs} failed background jobs waiting (threshold ${thresholds.failedJobs})`], value: latest.failedJobs };
    },
  },
];

/** True when one fresh sample shows no symptom at all (used by the verifier). */
export function isSampleHealthy(sample, thresholds) {
  return Boolean(
    sample.up &&
      sample.statusCode === 200 &&
      (sample.responseMs ?? 0) <= thresholds.latencyMs &&
      (sample.cpuPercent ?? 0) <= thresholds.cpuPercent &&
      (sample.memoryMB ?? 0) <= thresholds.memoryMB &&
      sample.dependency === 'connected' &&
      (sample.failedJobs ?? 0) < thresholds.failedJobs,
  );
}
