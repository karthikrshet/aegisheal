/**
 * Log & data collection (methodology Step 3).
 * Builds the evidence bundle handed to the AI agent for one incident.
 */
export function collectContext({ serviceId, anomalies, supervisor, monitor, logStore, store }) {
  const proc = supervisor.snapshot(serviceId);
  const samples = monitor.history(serviceId).last(15);
  const logs = logStore.recent(serviceId, 40);
  const lastDeployment = supervisor.lastDeployment(serviceId);
  const recentIncidents = store
    .filter('incidents', (i) => i.serviceId === serviceId)
    .slice(-5)
    .map((i) => ({ number: i.number, type: i.type, status: i.status, rootCause: i.analysis?.rootCause || null, at: i.detectedAt }));

  const errorLogs = logs.filter((l) => l.level === 'error' || l.level === 'fatal');
  const latest = samples[samples.length - 1] || null;

  return {
    service: {
      id: proc.id,
      name: proc.name,
      dependency: proc.dependency,
      status: proc.status,
      version: proc.version,
      lastGoodVersion: proc.lastGoodVersion,
      previousVersion: proc.previousVersion,
      exitCode: proc.exitCode,
      restarts: proc.restarts,
      uptimeSec: latest?.uptimeSec ?? null,
    },
    anomalies,
    latestSample: latest,
    samples,
    logs,
    errorLogs,
    lastDeployment,
    deployedRecently: lastDeployment ? Date.now() - new Date(lastDeployment.at).getTime() < 15 * 60 * 1000 : false,
    recentIncidents,
    collectedAt: new Date().toISOString(),
  };
}

/** Compact summary stored on the incident (the full bundle can be large). */
export function summariseContext(ctx) {
  return {
    service: ctx.service,
    latestSample: ctx.latestSample,
    errorLogCount: ctx.errorLogs.length,
    logExcerpt: ctx.logs.slice(-12).map((l) => `[${l.level}] ${l.message}`),
    lastDeployment: ctx.lastDeployment,
    deployedRecently: ctx.deployedRecently,
    collectedAt: ctx.collectedAt,
  };
}
