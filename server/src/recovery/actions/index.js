import restartService from './restartService.js';
import rollbackDeployment from './rollbackDeployment.js';
import clearCache from './clearCache.js';
import reconnectDependency from './reconnectDependency.js';
import retryFailedOperations from './retryFailedOperations.js';
import throttleWorkload from './throttleWorkload.js';

/** The ONLY actions the agent can ever execute (predefined recovery actions, Step 5). */
export const ACTIONS = Object.freeze(
  Object.fromEntries(
    [restartService, rollbackDeployment, clearCache, reconnectDependency, retryFailedOperations, throttleWorkload].map((a) => [a.id, Object.freeze(a)]),
  ),
);

export const getAction = (id) => (Object.hasOwn(ACTIONS, id) ? ACTIONS[id] : null);

export const describeActions = () =>
  Object.values(ACTIONS).map(({ id, name, description, risk }) => ({ id, name, description, risk }));
