import { FiBookOpen } from 'react-icons/fi';
import { PageHeader, Card, Badge, ErrorState, PageLoader, ProgressBar } from '../components/ui/index.js';
import { useApi } from '../hooks/useApi.js';
import { agentApi } from '../api/endpoints.js';
import { formatDuration, formatPercent } from '../utils/format.js';

const RISK_TONE = { low: 'green', medium: 'amber', high: 'red' };

export default function PlaybooksPage() {
  const { data, loading, error, reload } = useApi(() => agentApi.playbooks(), []);
  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Recovery playbooks"
        description="The agent's knowledge base: known failure signatures, their root cause and ranked recovery actions. Rankings update as the agent learns from outcomes."
      />
      <div className="grid grid-2">
        {data.playbooks.map((p) => (
          <Card key={p.id} title={p.name} subtitle={p.rootCause} actions={<Badge tone="violet" icon={FiBookOpen}>{p.category}</Badge>}>
            <div className="stack-sm">
              {p.steps.map((s, i) => {
                const st = p.stats.find((x) => x.actionId === s.actionId);
                return (
                  <div key={s.actionId} className="card" style={{ padding: 12, boxShadow: 'none' }}>
                    <div className="spread">
                      <div className="row">
                        <Badge tone={i === 0 ? 'blue' : 'gray'}>#{i + 1}</Badge>
                        <strong>{s.name}</strong>
                        <Badge tone={RISK_TONE[s.risk]}>{s.risk}</Badge>
                      </div>
                      <span className="small muted">score {s.score}</span>
                    </div>
                    <div className="small muted" style={{ margin: '6px 0' }}>
                      {s.description}
                    </div>
                    <div className="confidence small">
                      <span className="muted" style={{ minWidth: 110 }}>
                        Learned success
                      </span>
                      <ProgressBar value={s.successRate} max={1} tone={s.successRate >= 0.6 ? 'green' : 'amber'} label="Success rate" />
                      <strong>{formatPercent(s.successRate)}</strong>
                    </div>
                    <div className="small faint" style={{ marginTop: 4 }}>
                      {st ? `${st.successes}/${st.attempts} successful · avg recovery ${formatDuration(st.avgRecoveryMs)}` : 'No history yet (prior estimate)'}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
