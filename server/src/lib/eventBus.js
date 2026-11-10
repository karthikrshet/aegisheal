import { EventEmitter } from 'node:events';

/**
 * Process-wide event bus. Engine components publish here; the SSE route
 * forwards events to connected dashboards.
 *
 * Event names: metrics, incident, agent, log, service, audit
 */
class EventBus extends EventEmitter {
  publish(type, payload) {
    this.emit('event', { type, payload, at: new Date().toISOString() });
    this.emit(type, payload);
  }
}

export const eventBus = new EventBus();
eventBus.setMaxListeners(200);
