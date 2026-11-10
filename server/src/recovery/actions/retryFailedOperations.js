export default {
  id: 'retry-failed-operations',
  name: 'Retry failed operations',
  description: 'Replays failed background jobs with exponential backoff (for transient errors).',
  risk: 'low',
  precondition({ supervisor, serviceId }) {
    return supervisor.snapshot(serviceId).pid ? null : 'Service is not running';
  },
  async run({ supervisor, serviceId }) {
    const result = await supervisor.callService(serviceId, '/admin/retry-jobs');
    return `Retried ${result?.retried ?? 0} failed operations successfully`;
  },
};
