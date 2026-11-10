/**
 * Probe one managed service: health endpoint (status + response time) and metrics endpoint.
 * Never throws — a failed probe is data ("down"), not an exception.
 */
export async function probeService(port, { timeoutMs = 1500 } = {}) {
  const started = performance.now();
  const sample = {
    ts: Date.now(),
    up: false,
    statusCode: null,
    responseMs: null,
    error: null,
    cpuPercent: null,
    memoryMB: null,
    errorRate: null,
    failedJobs: null,
    dependency: null,
    version: null,
  };

  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    sample.statusCode = res.status;
    sample.responseMs = Math.round(performance.now() - started);
    sample.up = res.status < 500 && res.status !== 503;
    await res.text().catch(() => '');
  } catch (err) {
    sample.responseMs = Math.round(performance.now() - started);
    sample.error = err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : 'connection refused';
  }

  try {
    const res = await fetch(`http://127.0.0.1:${port}/metrics`, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.ok) {
      const m = await res.json();
      sample.cpuPercent = m.cpuPercent;
      sample.memoryMB = m.memoryMB;
      sample.errorRate = m.errorRate;
      sample.failedJobs = m.failedJobs;
      sample.dependency = m.dependency;
      sample.version = m.version;
      sample.cacheMB = m.cacheMB;
      sample.uptimeSec = m.uptimeSec;
    }
  } catch {
    /* metrics unavailable: process likely down */
  }
  return sample;
}
