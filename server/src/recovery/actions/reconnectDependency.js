export default {
  id: 'reconnect-dependency',
  name: 'Reconnect dependency',
  description: 'Re-establishes the connection pool to the downstream database or API.',
  risk: 'low',
  precondition({ supervisor, serviceId }) {
    return supervisor.snapshot(serviceId).pid ? null : 'Service is not running';
  },
  async run({ supervisor, serviceId }) {
    const snap = supervisor.snapshot(serviceId);
    await supervisor.callService(serviceId, '/admin/reconnect');
    return `Reconnected ${snap.name} to ${snap.dependency}`;
  },
};
