/**
 * Catalogue of applications managed by AegisHeal.
 * Each entry is launched as its own OS process by the Supervisor.
 * `stableVersion` is deployed at boot; `buggyVersions` are releases that ship
 * with a regression (used to demo automatic rollback).
 */
export const SERVICE_DEFINITIONS = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    description: 'Public entry point that routes and authenticates client traffic',
    dependency: 'auth-cache (Redis)',
    stableVersion: '2.3.1',
    nextVersion: '2.4.0',
    buggyVersions: ['2.4.0'],
    portOffset: 0,
    tier: 'critical',
  },
  {
    id: 'order-service',
    name: 'Order Service',
    description: 'Creates and tracks customer orders',
    dependency: 'orders-db (PostgreSQL)',
    stableVersion: '1.8.0',
    nextVersion: '1.9.0',
    buggyVersions: ['1.9.0'],
    portOffset: 1,
    tier: 'high',
  },
  {
    id: 'payment-service',
    name: 'Payment Service',
    description: 'Processes payments and refunds through the payment gateway',
    dependency: 'payment-gateway (sandbox)',
    stableVersion: '3.1.4',
    nextVersion: '3.2.0',
    buggyVersions: ['3.2.0'],
    portOffset: 2,
    tier: 'critical',
  },
];

export const CHAOS_FAULTS = [
  { id: 'crash', name: 'Crash process', description: 'Kills the process with an unhandled exception', detects: 'SERVICE_DOWN' },
  { id: 'memory-leak', name: 'Memory leak', description: 'Cache grows ~20 MB/s without eviction', detects: 'MEMORY_LEAK' },
  { id: 'cpu-spike', name: 'CPU spike', description: 'Runaway worker burns ~90 % of a core', detects: 'HIGH_CPU' },
  { id: 'latency', name: 'High latency', description: 'Adds ~1.2 s to every request', detects: 'HIGH_LATENCY' },
  { id: 'dependency-loss', name: 'Dependency loss', description: 'Drops the database / upstream connection', detects: 'DEPENDENCY_FAILURE' },
  { id: 'job-failure', name: 'Failing jobs', description: 'Background jobs fail with transient timeouts', detects: 'JOB_FAILURES' },
  { id: 'bad-deploy', name: 'Bad deployment', description: 'Deploys a release that contains a regression', detects: 'ERROR_SPIKE' },
];

export const getDefinition = (id) => SERVICE_DEFINITIONS.find((s) => s.id === id) || null;
