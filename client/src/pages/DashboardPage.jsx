import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiClock, FiCpu, FiServer, FiTrendingUp, FiZap } from 'react-icons/fi';
import { PageHeader, Card, StatCard, Button, EmptyState, ErrorState, PageLoader } from '../components/ui/index.js';
import { ServiceCard } from '../components/services/ServiceCard.jsx';
import { PipelineFlow } from '../components/agent/PipelineFlow.jsx';
import { ActivityFeed } from '../components/agent/ActivityFeed.jsx';
import { IncidentTable } from '../components/incidents/IncidentTable.jsx';
import { LiveLineChart } from '../components/charts/LiveLineChart.jsx';
import { useApi } from '../hooks/useApi.js';
import { useThrottledReload } from '../hooks/useThrottledReload.js';
import { useLive, useLiveEvent } from '../context/LiveContext.jsx';
import { servicesApi, metricsApi, incidentsApi, settingsApi } from '../api/endpoints.js';
import { formatDuration, formatPercent } from '../utils/format.js';

export default function DashboardPage() {
  const { agent } = useOutletContext() || {};
  const { metrics } = useLive();
  const services = useApi(() => servicesApi.list(), []);
  const overview = useApi(() => metricsApi.overview(), []);
  const recent = useApi(() => incidentsApi.list({ limit: 6 }), []);
  const settings = useApi(() => settingsApi.get(), []);
  const latestIncident = useApi(async () => {
    const list = await incidentsApi.list({ limit: 1 });
    return list.items[0] ? (await incidentsApi.get(list.items[0].id)).incident : null;
  }, []);

  const refreshAll = useThrottledReload(() => {
    services.reload({ silent: true });
    overview.reload({ silent: true });
    recent.reload({ silent: true });
    latestIncident.reload({ silent: true });
  }, 1500);
  useLiveEvent('incident', refreshAll);
  useLiveEvent('service', refreshAll);

  const systemSeries = useMemo(() => metrics.system.map((s) => ({ ts: s.ts, cpu: s.cpuPercent, mem: s.memoryPercent })), [metrics.system]);
  const latencySeries = useMemo(() => {
    const ids = Object.keys(metrics.services);
    const len = Math.max(0, ...ids.map((id) => metrics.services[id].length));
    return Array.from({ length: len }, (_, i) => {
      const row = { ts: null };
      for (const id of ids) {
        const s = metrics.services[id][metrics.services[id].length - len + i];
        if (s) {
          row.ts ??= s.ts;
          row[id] = s.up ? s.responseMs : null;
        }
      }
      return row;
    });
  }, [metrics.services]);

  if (services.loading && !services.data) return <PageLoader />;
  if (services.error) return <ErrorState error={services.error} onRetry={services.reload} />;

  const o = overview.data || {};
  const thresholds = settings.data?.settings.thresholds;
  const inc = latestIncident.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Real-time health of every managed service and what the AI agent is doing about it."
        actions={
          <Link to="/chaos" className="btn btn-primary">
            <FiZap aria-hidden /> Open chaos lab
          </Link>
        }
      />

      <div className="hero-banner">
        <div className="hb-icon" aria-hidden>
          <FiCpu />
        </div>
        <div className="grow">
          <h2>
            {o.activeIncidents ? `${o.activeIncidents} active incident${o.activeIncidents > 1 ? 's' : ''} — agent is on it` : 'All systems operational'}
          </h2>
          <p>
            {o.servicesHealthy ?? '—'} of {o.servicesTotal ?? '—'} services healthy · availability {o.availability ?? '—'}% · agent mode{' '}
            <strong>{agent?.paused ? 'paused' : agent?.mode || '—'}</strong>
          </p>
        </div>
        <Link to="/agent" className="btn btn-secondary">
          Agent control
        </Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={FiServer} label="Healthy services" value={`${o.servicesHealthy ?? '—'} / ${o.servicesTotal ?? '—'}`} hint={`${o.availability ?? '—'}% availability (last minute)`} loading={overview.loading} />
        <StatCard icon={FiAlertTriangle} tone={o.activeIncidents ? 'red' : 'green'} label="Active incidents" value={o.activeIncidents ?? '—'} hint={`${o.incidents24h ?? 0} in the last 24 h`} loading={overview.loading} />
        <StatCard icon={FiClock} tone="violet" label="Mean time to recovery" value={formatDuration(o.mttrMs)} hint="Detection → verified healthy" loading={overview.loading} />
        <StatCard icon={FiCheckCircle} tone="green" label="Autonomous recovery rate" value={o.autoRecoveryRate != null ? formatPercent(o.autoRecoveryRate) : '—'} hint={`Success rate ${o.successRate != null ? formatPercent(o.successRate) : '—'}`} loading={overview.loading} />
      </div>

      <Card title="Agent pipeline" subtitle={inc ? `Latest: ${inc.number} · ${inc.title}` : 'Waiting for the first incident'} actions={inc && <Link to={`/incidents/${inc.id}`} className="btn btn-ghost btn-sm">View incident</Link>} style={{ marginBottom: 16 }}>
        <PipelineFlow steps={inc?.steps} />
      </Card>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        {services.data.services.map((s) => (
          <ServiceCard key={s.id} service={s} live={metrics.services[s.id] || []} thresholds={thresholds} />
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Service response time" subtitle="Live health-check latency (ms)">
          <LiveLineChart data={latencySeries} series={Object.keys(metrics.services).map((id) => ({ key: id, label: id }))} unit=" ms" threshold={thresholds?.latencyMs} />
        </Card>
        <Card title="Host resources" subtitle="CPU and memory of the machine running AegisHeal">
          <LiveLineChart data={systemSeries} series={[{ key: 'cpu', label: 'CPU %' }, { key: 'mem', label: 'Memory %', color: '#7c3aed' }]} unit="%" domain={[0, 100]} />
        </Card>
      </div>

      <div className="grid grid-3">
        <Card className="span-2" title="Recent incidents" actions={<Link to="/incidents" className="btn btn-ghost btn-sm">View all</Link>} flush>
          {recent.data?.items.length ? (
            <IncidentTable items={recent.data.items} compact />
          ) : (
            <EmptyState icon={FiTrendingUp} title="No incidents yet" action={<Link to="/chaos" className="btn btn-secondary btn-sm">Inject a fault</Link>}>
              When a service fails, the agent's work appears here.
            </EmptyState>
          )}
        </Card>
        <Card title="Agent activity" actions={<FiActivity color="var(--primary)" aria-hidden />}>
          <ActivityFeed items={agent?.activity || []} />
          {!agent && <Button variant="ghost" size="sm">Loading…</Button>}
        </Card>
      </div>
    </>
  );
}
