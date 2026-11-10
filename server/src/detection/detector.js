import { RULES } from './rules.js';

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Runs every rule against a service and returns anomalies sorted by severity.
 * A crashed service only reports SERVICE_DOWN (other symptoms are meaningless).
 */
export function detectAnomalies({ serviceId, serviceName, samples, process, thresholds }) {
  if (process.status === 'stopped' || process.status === 'stopping' || process.status === 'starting') return [];
  const found = [];
  for (const rule of RULES) {
    let result = null;
    try {
      result = rule.evaluate({ samples, process, thresholds });
    } catch {
      result = null; // a buggy rule must never break the monitoring loop
    }
    if (result) {
      found.push({
        serviceId,
        serviceName,
        type: rule.type,
        title: rule.title,
        severity: rule.severity,
        evidence: result.evidence,
        value: result.value ?? null,
        detectedAt: new Date().toISOString(),
      });
      if (rule.type === 'SERVICE_DOWN') break;
    }
  }
  return found.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

export { SEVERITY_RANK };
