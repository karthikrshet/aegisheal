export const INCIDENT_STATUS = {
  detected: { label: 'Detected', tone: 'amber' },
  analyzing: { label: 'Analyzing', tone: 'blue' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'violet' },
  recovering: { label: 'Recovering', tone: 'blue' },
  verifying: { label: 'Verifying', tone: 'cyan' },
  open: { label: 'Open (observe)', tone: 'amber' },
  escalated: { label: 'Escalated', tone: 'red' },
  resolved: { label: 'Resolved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'gray' },
};

export const SEVERITY = {
  critical: { label: 'Critical', tone: 'red' },
  high: { label: 'High', tone: 'amber' },
  medium: { label: 'Medium', tone: 'blue' },
  low: { label: 'Low', tone: 'gray' },
};

export const HEALTH = {
  healthy: { label: 'Healthy', dot: 'green', tone: 'green' },
  degraded: { label: 'Degraded', dot: 'amber', tone: 'amber' },
  down: { label: 'Down', dot: 'red', tone: 'red' },
  unknown: { label: 'Unknown', dot: 'gray', tone: 'gray' },
};

export const AGENT_MODES = [
  { id: 'autonomous', label: 'Autonomous', description: 'Detects, decides and recovers on its own (within guardrails).' },
  { id: 'supervised', label: 'Supervised', description: 'Proposes a recovery and waits for a human to approve it.' },
  { id: 'observe', label: 'Observe only', description: 'Detects and diagnoses, but never takes action.' },
];

export const ACTIVE_STATUSES = ['detected', 'analyzing', 'awaiting_approval', 'recovering', 'verifying', 'open', 'escalated'];

export const PIPELINE_STEPS = [
  { key: 'monitor', label: 'Monitor' },
  { key: 'detect', label: 'Detect' },
  { key: 'collect', label: 'Collect' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'decide', label: 'Decide' },
  { key: 'recover', label: 'Recover' },
  { key: 'verify', label: 'Verify' },
];

export const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@aegisheal.local', password: 'Admin@12345' },
  { role: 'Operator', email: 'operator@aegisheal.local', password: 'Operator@123' },
  { role: 'Viewer', email: 'viewer@aegisheal.local', password: 'Viewer@1234' },
];
