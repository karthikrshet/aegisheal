import path from 'node:path';
import { JsonStore } from './lib/store.js';
import { LogStore } from './collection/logStore.js';
import { Supervisor } from './services/supervisor.js';
import { SERVICE_DEFINITIONS } from './services/registry.js';
import { SettingsService } from './settings/settingsService.js';
import { Monitor } from './monitoring/monitor.js';
import { IncidentRepository } from './incidents/incidentRepository.js';
import { Guardrails } from './agent/guardrails.js';
import { LearningModel } from './agent/learning.js';
import { AgentOrchestrator } from './agent/orchestrator.js';
import { AuditService } from './audit/auditService.js';
import { UserService } from './users/userService.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('engine');

/**
 * Composition root: wires every component together. `inMemory` gives an
 * isolated engine for tests (no files written).
 */
export function createEngine(config, { inMemory = false, definitions = SERVICE_DEFINITIONS, basePort } = {}) {
  const store = new JsonStore(inMemory ? null : path.join(config.dataDir, 'aegisheal.json'));
  const logStore = new LogStore();
  const settings = new SettingsService(store, config);
  const audit = new AuditService(store);
  const users = new UserService(store);
  const supervisor = new Supervisor({ definitions, basePort: basePort ?? config.serviceBasePort, logStore, store });
  const incidents = new IncidentRepository(store);
  const guardrails = new Guardrails(settings);
  const learning = new LearningModel(store);

  const monitor = new Monitor({ supervisor, settings, intervalMs: config.monitorIntervalMs });
  const agent = new AgentOrchestrator({ supervisor, monitor, logStore, store, incidents, settings, guardrails, learning, audit, config });
  monitor.onAnomalies = (serviceId, anomalies) => agent.onServiceChecked(serviceId, anomalies);
  supervisor.on('status', (snap) => {
    if (snap.status === 'starting') monitor.markBaseline(snap.id);
  });

  // Incidents left "in progress" by a previous crash/stop cannot be resumed safely.
  for (const inc of store.list('incidents')) {
    if (['detected', 'analyzing', 'recovering', 'verifying'].includes(inc.status)) {
      inc.status = 'escalated';
      inc.escalation = { reason: 'AegisHeal restarted while this incident was in progress', at: new Date().toISOString() };
    }
  }

  return {
    config,
    store,
    logStore,
    settings,
    audit,
    users,
    supervisor,
    incidents,
    guardrails,
    learning,
    monitor,
    agent,
    async start() {
      await supervisor.startAll();
      monitor.start();
      logStore.add('aegis', 'info', `AegisHeal agent online — ${supervisor.ids().length} services under management`);
      log.info('Engine started');
    },
    async stop() {
      monitor.stop();
      await supervisor.stopAll();
      store.flushSync();
      log.info('Engine stopped');
    },
  };
}
