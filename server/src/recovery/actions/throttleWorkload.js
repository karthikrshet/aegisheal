export default {
  id: 'throttle-workload',
  name: 'Throttle workload',
  description: 'Terminates runaway workers and limits concurrency to shed CPU load.',
  risk: 'low',
  precondition({ supervisor, serviceId }) {
    return supervisor.snapshot(serviceId).pid ? null : 'Service is not running';
  },
  async run({ supervisor, serviceId }) {
    await supervisor.callService(serviceId, '/admin/throttle');
    return 'Runaway worker terminated and concurrency limited';
  },
};
