import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { FiCheckCircle, FiCpu, FiPause, FiPlay, FiShield, FiUserCheck } from 'react-icons/fi';
import { PageHeader, Card, Button, Badge, StatCard, PageLoader, EmptyState } from '../components/ui/index.js';
import { ModeSelector } from '../components/agent/ModeSelector.jsx';
import { CircuitTable } from '../components/agent/CircuitTable.jsx';
import { ActivityFeed } from '../components/agent/ActivityFeed.jsx';
import { PipelineFlow } from '../components/agent/PipelineFlow.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { agentApi } from '../api/endpoints.js';
import { isAdmin } from '../utils/permissions.js';
import { humanize } from '../utils/format.js';

const RESTRICTIONS = [
  'Can only execute predefined, whitelisted recovery actions — never arbitrary commands.',
  'AI output is schema-validated; an invalid or unsafe suggestion is discarded.',
  'Low-confidence diagnoses and high-risk actions (rollback) require human approval.',
  'Maximum recovery attempts per incident, then escalation to a human.',
  'Cooldown between identical actions on the same service (no flapping loops).',
  'Circuit breaker stops the agent on a service after repeated failed recoveries.',
  'Blast-radius limit on how many services can be recovered at the same time.',
  'Every action is verified and written to the audit log.',
];

export default function AgentPage() {
  const { agent, reloadAgent } = useOutletContext() || {};
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  if (!agent) return <PageLoader />;
  const admin = isAdmin(user);

  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      await fn();
      toast.success(msg);
      await reloadAgent?.({ silent: true });
    } catch (err) {
      toast.error('Action failed', err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Agent control"
        description="Configure how autonomous the AI agent is and inspect its guardrails."
        actions={
          admin &&
          (agent.paused ? (
            <Button icon={FiPlay} loading={busy === 'resume'} onClick={() => run('resume', agentApi.resume, 'Agent resumed')}>
              Resume agent
            </Button>
          ) : (
            <Button variant="secondary" icon={FiPause} loading={busy === 'pause'} onClick={() => run('pause', agentApi.pause, 'Agent paused — it will only observe')}>
              Pause agent
            </Button>
          ))
        }
      />

      {agent.paused && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          The agent is paused. It still detects and diagnoses incidents but will not execute any recovery action.
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={FiCpu} label="Incidents handled" value={agent.stats.totalIncidents} />
        <StatCard icon={FiCheckCircle} tone="green" label="Resolved" value={agent.stats.resolved} hint={`${agent.stats.autonomousRecoveries} fully autonomous`} />
        <StatCard icon={FiUserCheck} tone="violet" label="Waiting for approval" value={agent.pendingApprovals.length} />
        <StatCard icon={FiShield} tone={agent.stats.escalated ? 'red' : 'green'} label="Escalated" value={agent.stats.escalated} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Autonomy mode">
          <ModeSelector mode={agent.mode} canEdit={admin} onChanged={() => reloadAgent?.({ silent: true })} />
          <div className="divider" />
          <dl className="kv">
            <dt>AI engine</dt>
            <dd>
              {agent.aiProvider === 'claude' ? 'Claude (Anthropic) + local second opinion' : 'Local reasoning engine (offline)'}{' '}
              {agent.aiProvider === 'claude' && !agent.aiAvailable && <Badge tone="amber">API key missing — using local</Badge>}
            </dd>
            <dt>Monitor</dt>
            <dd>
              {agent.monitor.running ? <Badge tone="green">Running</Badge> : <Badge tone="red">Stopped</Badge>} every {agent.monitor.intervalMs} ms · {agent.monitor.ticks} checks
            </dd>
            <dt>Working on</dt>
            <dd>{agent.working.length ? `${agent.working.length} incident(s)` : 'Idle'}</dd>
          </dl>
        </Card>
        <Card title="Pending approvals" subtitle="Decisions waiting for a human">
          {agent.pendingApprovals.length ? (
            <ul className="feed">
              {agent.pendingApprovals.map((p) => (
                <li key={p.id}>
                  <FiUserCheck aria-hidden />
                  <div className="grow">
                    <Link to={`/incidents/${p.id}`}>
                      <strong>{p.number}</strong>
                    </Link>{' '}
                    — {p.title}
                    <div className="small muted">Proposed: {humanize(p.action)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FiCheckCircle} title="Nothing to approve">
              Switch to supervised mode to approve each recovery yourself.
            </EmptyState>
          )}
        </Card>
      </div>

      <Card title="How the agent works" subtitle="Each incident goes through these seven steps" style={{ marginBottom: 16 }}>
        <PipelineFlow steps={null} showDetail={false} />
      </Card>

      <div className="grid grid-2">
        <Card title="Circuit breakers" subtitle="Per-service safety switch" flush>
          <CircuitTable
            circuits={agent.circuits}
            canReset={admin}
            resetting={busy}
            onReset={(sid) => run(sid, () => agentApi.resetCircuit(sid), `Circuit reset for ${sid}`)}
          />
        </Card>
        <Card title="Agent restrictions (guardrails)">
          <ul className="evidence">
            {RESTRICTIONS.map((r) => (
              <li key={r} style={{ marginBottom: 6 }}>
                {r}
              </li>
            ))}
          </ul>
          <Link to="/settings" className="small">
            Tune guardrails in Settings →
          </Link>
        </Card>
      </div>

      <Card title="Recent agent activity" style={{ marginTop: 16 }}>
        <ActivityFeed items={agent.activity} limit={20} />
      </Card>
    </>
  );
}
