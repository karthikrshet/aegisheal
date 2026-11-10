export default {
  id: 'restart-service',
  name: 'Restart service',
  description: 'Gracefully stops the process and starts a fresh instance (clears in-memory faults).',
  risk: 'medium',
  async run({ supervisor, serviceId }) {
    const snap = await supervisor.restart(serviceId);
    if (snap.status !== 'running') throw new Error(`Service did not come back up (status: ${snap.status})`);
    return `Restarted ${snap.name}; new PID ${snap.pid}`;
  },
};
