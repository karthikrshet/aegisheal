import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { PageHeader, Card, Segmented, ErrorState, PageLoader, StatCard } from '../components/ui/index.js';
import { TrendBarChart } from '../components/charts/TrendBarChart.jsx';
import { DonutChart } from '../components/charts/DonutChart.jsx';
import { HorizontalBars } from '../components/charts/HorizontalBars.jsx';
import { useApi } from '../hooks/useApi.js';
import { reportsApi, metricsApi, incidentsApi } from '../api/endpoints.js';
import { formatDuration, formatPercent, humanize } from '../utils/format.js';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiTrendingDown } from 'react-icons/fi';

const RANGES = [
  { id: 1, label: '24 h' },
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
];

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const { data, loading, error, reload } = useApi(() => reportsApi.summary(days), [days]);
  const overview = useApi(() => metricsApi.overview(), []);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const o = overview.data || {};

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        description="Measure how much the agent reduces downtime and manual troubleshooting."
        actions={
          <>
            <Segmented options={RANGES} value={days} onChange={setDays} label="Time range" />
            <a className="btn btn-secondary" href={incidentsApi.exportUrl} download>
              <FiDownload aria-hidden /> CSV
            </a>
          </>
        }
      />
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={FiAlertTriangle} label={`Incidents (${days === 1 ? '24 h' : `${days} d`})`} value={data.total} />
        <StatCard icon={FiClock} tone="violet" label="Mean time to recovery" value={formatDuration(o.mttrMs)} />
        <StatCard icon={FiCheckCircle} tone="green" label="Recovery success rate" value={o.successRate != null ? formatPercent(o.successRate) : '—'} />
        <StatCard icon={FiTrendingDown} tone="amber" label="Downtime avoided (est.)" value={o.downtimeSavedMin != null ? `${Math.max(0, o.downtimeSavedMin)} min` : '—'} hint="vs. ~25 min manual MTTR" />
      </div>
      <Card title="Incident trend" subtitle="Resolved vs escalated per day, with average MTTR" style={{ marginBottom: 16 }}>
        <TrendBarChart data={data.trend} />
      </Card>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <Card title="By failure type">
          <DonutChart data={data.byType} />
        </Card>
        <Card title="By root cause">
          <HorizontalBars data={data.byRootCause} humanizeNames={false} />
        </Card>
        <Card title="By service">
          <HorizontalBars data={data.byService} humanizeNames={false} />
        </Card>
      </div>
      <Card title="Recovery action effectiveness" subtitle="What the learning model has observed" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Failure signature</th>
                <th>Action</th>
                <th>Attempts</th>
                <th>Successes</th>
                <th>Success rate</th>
                <th>Avg recovery</th>
              </tr>
            </thead>
            <tbody>
              {data.actions.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No recovery actions recorded yet.
                  </td>
                </tr>
              )}
              {data.actions.map((a) => (
                <tr key={`${a.signatureId}-${a.actionId}`}>
                  <td>{humanize(a.signatureId)}</td>
                  <td>{humanize(a.actionId)}</td>
                  <td>{a.attempts}</td>
                  <td>{a.successes}</td>
                  <td>{formatPercent(a.successRate)}</td>
                  <td>{formatDuration(a.avgRecoveryMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
