export default {
  id: 'clear-cache',
  name: 'Clear cache / free memory',
  description: 'Flushes the in-process cache and re-enables eviction to release leaked memory.',
  risk: 'low',
  precondition({ supervisor, serviceId }) {
    return supervisor.snapshot(serviceId).pid ? null : 'Service is not running';
  },
  async run({ supervisor, serviceId }) {
    const result = await supervisor.callService(serviceId, '/admin/clear-cache');
    return `Cache cleared, ${result?.freedMB ?? 0} MB released`;
  },
};
