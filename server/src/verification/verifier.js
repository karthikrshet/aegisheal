import { isSampleHealthy } from '../detection/rules.js';
import { sleep } from '../lib/time.js';

/**
 * Recovery verification (methodology Step 7).
 * The service must pass `checks` CONSECUTIVE fully-healthy probes before the
 * deadline. One unhealthy probe resets the streak, so flapping is caught.
 */
export async function verifyRecovery({ serviceId, monitor, thresholds, checks = 3, timeoutMs = 20000, intervalMs = 1000 }) {
  const started = Date.now();
  const probes = [];
  let streak = 0;
  while (Date.now() - started < timeoutMs) {
    const sample = await monitor.probe(serviceId);
    const healthy = isSampleHealthy(sample, thresholds);
    probes.push({
      at: new Date(sample.ts).toISOString(),
      healthy,
      statusCode: sample.statusCode,
      responseMs: sample.responseMs,
      cpuPercent: sample.cpuPercent,
      memoryMB: sample.memoryMB,
      dependency: sample.dependency,
      failedJobs: sample.failedJobs,
    });
    streak = healthy ? streak + 1 : 0;
    if (streak >= checks) {
      return { passed: true, checks, probes: probes.slice(-10), durationMs: Date.now() - started, summary: `${checks}/${checks} consecutive health checks passed` };
    }
    await sleep(intervalMs);
  }
  const last = probes[probes.length - 1];
  return {
    passed: false,
    checks,
    probes: probes.slice(-10),
    durationMs: Date.now() - started,
    summary: `Service still unhealthy after ${Math.round(timeoutMs / 1000)} s (last status ${last?.statusCode ?? 'unreachable'})`,
  };
}
