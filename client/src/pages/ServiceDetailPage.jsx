import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPlay, FiSquare } from 'react-icons/fi';
import { PageHeader, Card, Button, Tabs, ErrorState, PageLoader, Badge, EmptyState, ConfirmDialog } from '../components/ui/index.js';
import { HealthBadge } from '../components/services/HealthBadge.jsx';
import { ChaosPanel } from '../components/services/ChaosPanel.jsx';
import { ManualActions } from '../components/services/ManualActions.jsx';
import { DeployPanel } from '../components/services/DeployPanel.jsx';
import { LiveLineChart } from '../components/charts/LiveLineChart.jsx';
import { StatusBadge } from '../components/incidents/StatusBadge.jsx';
import { useApi } from '../hooks/useApi.js';
import { useThrottledReload } from '../hooks/useThrottledReload.js';
import { useLive, useLiveEvent } from '../context/LiveContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { logsApi, servicesApi, settingsApi } from '../api/endpoints.js';
import { isAdmin, isOperator } from '../utils/permissions.js';
import { formatDateTime, formatTime, humanize, timeAgo } from '../utils/format.js';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { metrics } = useLive();
  const [tab, setTab] = useState('overview');
  const [confirmStop, setConfirmStop] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useApi(() => servicesApi.get(id, 90), [id]);
  const catalog = useApi(() => servicesApi.catalog(), []);
  const settings = useApi(() => settingsApi.get(), []);
  const logs = useApi(() => logsApi.query({ source: id, limit: 120 }), [id]);
  const refresh = useThrottledReload(reload, 1500);
  useLiveEvent('service', (s) => s.id === id && refresh());
  useLiveEvent('incident', (i) => i.serviceId === id && refresh());
  useLiveEvent('log', (l) => l.source === id && logs.setData((d) => (d ? { ...d, logs: [...d.logs, l].slice(-200) } : d)));

  const history = useMemo(() => {
    const base = data?.service.history || [];
    const live = metrics.services[id] || [];
    const lastTs = base.length ? base[base.length - 1].ts : 0;
    return [...base, ...live.filter((s) => s.ts > lastTs)].slice(-120);
  }, [data, metrics.services, id]);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const s = data.service;
  const t = settings.data?.settings.thresholds;
  const lifecycle = async (op) => {
    setBusy(true);
    try {
      await servicesApi[op](id);
      toast.success(`${s.name} ${op === 'start' ? 'started' : 'stopped'}`);
      reload({ silent: true });
    } catch (err) {
      toast.error(`Could not ${op} service`, err.message);
    } finally {
      setBusy(false);
      setConfirmStop(false);
    }
  };

  return (
    <>
      <Link to="/services" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
        <FiArrowLeft aria-hidden /> All services
      </Link>
      <PageHeader
        title={s.name}
        description={s.description}
        actions={
          <>
            <HealthBadge health={s.health} />
            <Badge tone="gray">v{s.version}</Badge>
            {isAdmin(user) &&
              (s.status === 'running' ? (
                <Button variant="secondary" icon={FiSquare} onClick={() => setConfirmStop(true)} disabled={busy}>
                  Stop
                </Button>
              ) : (
                <Button icon={FiPlay} onClick={() => lifecycle('start')} loading={busy}>
                  Start
                </Button>
              ))}
          </>
        }
      />

      {s.activeIncident && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <div className="grow">
            <strong>{s.activeIncident.number}</strong> — {s.activeIncident.title}
          </div>
          <StatusBadge status={s.activeIncident.status} />
          <Link to={`/incidents/${s.activeIncident.id}`} className="btn btn-secondary btn-sm">
            Open incident
          </Link>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'recovery', label: 'Recovery & deploy' },
          { id: 'chaos', label: 'Chaos' },
          { id: 'logs', label: 'Logs' },
          { id: 'deployments', label: 'Deployments', count: data.deployments.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-2">
          <Card title="Response time" subtitle="Health-check latency">
            <LiveLineChart data={history} series={[{ key: 'responseMs', label: 'Response' }]} unit=" ms" threshold={t?.latencyMs} />
          </Card>
          <Card title="CPU usage" subtitle="Process CPU (% of one core)">
            <LiveLineChart data={history} series={[{ key: 'cpuPercent', label: 'CPU', color: '#0891b2' }]} unit="%" threshold={t?.cpuPercent} domain={[0, 100]} />
          </Card>
          <Card title="Memory" subtitle="Heap + buffers (MB)">
            <LiveLineChart data={history} series={[{ key: 'memoryMB', label: 'Memory', color: '#7c3aed' }]} unit=" MB" threshold={t?.memoryMB} />
          </Card>
          <Card title="Process details">
            <dl className="kv">
              <dt>Status</dt>
              <dd>{humanize(s.status)}</dd>
              <dt>PID</dt>
              <dd>{s.pid ?? '—'}</dd>
              <dt>Port</dt>
              <dd>{s.port}</dd>
              <dt>Version</dt>
              <dd>
                v{s.version} <span className="muted">(last good v{s.lastGoodVersion})</span>
              </dd>
              <dt>Dependency</dt>
              <dd>
                {s.dependency} {s.latest?.dependency && <Badge tone={s.latest.dependency === 'connected' ? 'green' : 'red'}>{s.latest.dependency}</Badge>}
              </dd>
              <dt>Started</dt>
              <dd>{formatDateTime(s.startedAt)}</dd>
              <dt>Restarts</dt>
              <dd>{s.restarts}</dd>
              <dt>Failed jobs</dt>
              <dd>{s.latest?.failedJobs ?? '—'}</dd>
              <dt>Error rate</dt>
              <dd>{s.latest?.errorRate != null ? `${Math.round(s.latest.errorRate * 100)}%` : '—'}</dd>
              <dt>Tier</dt>
              <dd>{humanize(s.tier)}</dd>
            </dl>
          </Card>
        </div>
      )}

      {tab === 'recovery' && (
        <div className="grid grid-2">
          <Card title="Manual recovery actions" subtitle="Operator override — the same predefined actions the agent uses">
            {isOperator(user) ? <ManualActions service={s} actions={catalog.data?.actions || []} onDone={() => reload({ silent: true })} /> : <p className="muted">Operators and admins can run actions.</p>}
          </Card>
          <Card title="Deployment">
            <DeployPanel service={s} disabled={!isOperator(user)} onDeployed={() => reload({ silent: true })} />
          </Card>
        </div>
      )}

      {tab === 'chaos' && (
        <Card title="Inject a fault" subtitle="Deliberately break this service to demonstrate self-healing">
          <ChaosPanel service={s} faults={catalog.data?.faults || []} disabled={!isOperator(user)} onInjected={() => reload({ silent: true })} />
        </Card>
      )}

      {tab === 'logs' && (
        <Card title="Service logs" subtitle="Live stream" flush>
          <div className="log-view" style={{ borderRadius: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
            {(logs.data?.logs || []).slice().reverse().map((l) => (
              <div key={l.id} className="log-line">
                <span className="l-time">{formatTime(l.ts)}</span>
                <span className={`lvl-${l.level}`}>{l.level.toUpperCase()}</span>
                <span className="l-src">{l.source}</span>
                <span className="l-msg">{l.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'deployments' && (
        <Card title="Deployment history" flush>
          {data.deployments.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deployments.map((d) => (
                    <tr key={d.id}>
                      <td>{timeAgo(d.at)}</td>
                      <td>
                        <Badge tone={d.kind === 'rollback' ? 'amber' : 'blue'}>{humanize(d.kind)}</Badge>
                      </td>
                      <td>v{d.fromVersion}</td>
                      <td>v{d.toVersion}</td>
                      <td>{d.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No deployments yet">Deploy a version or inject a bad deployment from the Chaos tab.</EmptyState>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={confirmStop}
        title={`Stop ${s.name}?`}
        message="Stopping is treated as intentional maintenance: the agent will not try to recover it until you start it again."
        confirmLabel="Stop service"
        tone="danger"
        loading={busy}
        onConfirm={() => lifecycle('stop')}
        onCancel={() => setConfirmStop(false)}
      />
    </>
  );
}
