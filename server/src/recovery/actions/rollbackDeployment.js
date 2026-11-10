export default {
  id: 'rollback-deployment',
  name: 'Roll back deployment',
  description: 'Redeploys the last known good version of the service.',
  risk: 'high',
  precondition({ supervisor, serviceId }) {
    const s = supervisor.snapshot(serviceId);
    return s.version !== s.lastGoodVersion ? null : `Already on last known good version ${s.lastGoodVersion}`;
  },
  async run({ supervisor, serviceId }) {
    const before = supervisor.snapshot(serviceId).version;
    const snap = await supervisor.rollback(serviceId, 'agent');
    if (snap.status !== 'running') throw new Error(`Rolled back but service status is ${snap.status}`);
    return `Rolled back ${snap.name} from ${before} to ${snap.version}`;
  },
};
