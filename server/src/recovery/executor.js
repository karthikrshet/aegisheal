import { getAction } from './actions/index.js';
import { withTimeout } from '../lib/time.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('executor');
const ACTION_TIMEOUT_MS = 20000;

/**
 * Automated recovery (methodology Step 6). Runs one predefined action with a
 * timeout and returns a structured, never-throwing result.
 */
export async function executeAction(actionId, { supervisor, serviceId, logStore, actor = 'agent' }) {
  const action = getAction(actionId);
  const started = Date.now();
  if (!action) return { actionId, ok: false, error: `Unknown action ${actionId}`, durationMs: 0 };

  const pre = action.precondition?.({ supervisor, serviceId });
  if (pre) return { actionId, name: action.name, ok: false, error: `Precondition failed: ${pre}`, durationMs: 0 };

  logStore?.add(serviceId, 'info', `[aegis] ${actor} executing "${action.name}"`);
  try {
    const output = await withTimeout(action.run({ supervisor, serviceId }), ACTION_TIMEOUT_MS, action.name);
    const result = { actionId, name: action.name, ok: true, output, durationMs: Date.now() - started };
    logStore?.add(serviceId, 'info', `[aegis] ${action.name} completed: ${output}`);
    return result;
  } catch (err) {
    log.warn(`action ${actionId} failed on ${serviceId}`, { error: err.message });
    logStore?.add(serviceId, 'error', `[aegis] ${action.name} failed: ${err.message}`);
    return { actionId, name: action.name, ok: false, error: err.message, durationMs: Date.now() - started };
  }
}
