import { PageHeader, Card, Badge } from '../components/ui/index.js';

const OBJECTIVES = [
  'Continuously monitor the health of software applications.',
  'Automatically detect common software failures.',
  'Analyse errors and logs using an AI agent.',
  'Identify the possible cause of software failures.',
  'Perform suitable recovery actions automatically.',
  'Verify the success of the recovery process.',
  'Reduce manual troubleshooting and application downtime.',
];

const STEPS = [
  ['System monitoring', 'Health, CPU, memory, services and response time are probed every 2 seconds.'],
  ['Failure detection', 'Rules detect crashes, error spikes, memory leaks, CPU saturation, latency, dependency loss and failing jobs.'],
  ['Log & data collection', 'Recent logs, metric windows, deployment history and past incidents are bundled as evidence.'],
  ['AI-based analysis', 'The agent scores known failure signatures (and optionally asks Claude) to find the root cause with a confidence score.'],
  ['Recovery decision', 'The best predefined action is chosen using the playbook and learned success rates, then checked by guardrails.'],
  ['Automated recovery', 'DevOps automation restarts, rolls back, clears cache, reconnects, retries or throttles the service.'],
  ['Verification', 'The service must pass several consecutive health checks; otherwise the next action is tried or a human is called.'],
];

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About this project" description="Agentic AI-Enabled Autonomous Framework for Intelligent Software Fault Recovery and Resilience" />
      <div className="grid grid-2">
        <Card title="Objectives" className="span-2">
          <ul className="evidence">
            {OBJECTIVES.map((o) => (
              <li key={o} style={{ marginBottom: 6 }}>
                {o}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Methodology" className="span-2">
          <ol className="about-steps">
            {STEPS.map(([title, text]) => (
              <li key={title}>
                <div>
                  <strong>{title}</strong>
                  <div className="small muted">{text}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Technology" className="span-2">
          <div className="chip-list">
            {['React 18', 'Vite', 'React Router', 'react-icons', 'Recharts', 'Node.js', 'Express', 'Server-Sent Events', 'Zod validation', 'JWT + bcrypt', 'Helmet', 'Rate limiting', 'Claude API (optional)', 'Vitest'].map((t) => (
              <Badge key={t} tone="blue">
                {t}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
