import { Link } from 'react-router-dom';
import { FiServer, FiArrowRight } from 'react-icons/fi';
import { HealthBadge } from './HealthBadge.jsx';
import { Sparkline } from '../charts/Sparkline.jsx';
import { Badge } from '../ui/Badge.jsx';
import { StatusBadge } from '../incidents/StatusBadge.jsx';
import { formatNumber } from '../../utils/format.js';

function Metric({ label, value, bad }) {
  return (
    <div className={`metric-mini ${bad ? 'bad' : ''}`}>
      <div className="m-label">{label}</div>
      <div className="m-value">{value}</div>
    </div>
  );
}

export function ServiceCard({ service, live = [], thresholds }) {
  const latest = live[live.length - 1] || service.latest || {};
  const t = thresholds || { cpuPercent: 80, memoryMB: 220, latencyMs: 800 };
  return (
    <article className="card service-card">
      <div className="spread">
        <div className="row">
          <div className="svc-icon" aria-hidden>
            <FiServer />
          </div>
          <div>
            <h3>{service.name}</h3>
            <div className="small muted">
              v{service.version} · port {service.port}
            </div>
          </div>
        </div>
        <HealthBadge health={service.health} />
      </div>

      <div className="service-metrics">
        <Metric label="Response" value={latest.responseMs != null ? `${latest.responseMs} ms` : '—'} bad={latest.responseMs > t.latencyMs} />
        <Metric label="CPU" value={latest.cpuPercent != null ? `${formatNumber(latest.cpuPercent)}%` : '—'} bad={latest.cpuPercent > t.cpuPercent} />
        <Metric label="Memory" value={latest.memoryMB != null ? `${formatNumber(latest.memoryMB)} MB` : '—'} bad={latest.memoryMB > t.memoryMB} />
        <Metric label="Uptime" value={service.uptimePercent != null ? `${service.uptimePercent}%` : '—'} bad={service.uptimePercent != null && service.uptimePercent < 90} />
      </div>

      <div className="spread">
        <Sparkline values={live.map((s) => s.responseMs)} />
        <Link to={`/services/${service.id}`} className="btn btn-ghost btn-sm" aria-label={`Open ${service.name}`}>
          Details <FiArrowRight aria-hidden />
        </Link>
      </div>

      {service.activeIncident ? (
        <Link to={`/incidents/${service.activeIncident.id}`} className="row small" style={{ color: 'inherit' }}>
          <Badge tone="red">{service.activeIncident.number}</Badge>
          <StatusBadge status={service.activeIncident.status} />
        </Link>
      ) : (
        <div className="small muted">Dependency: {service.dependency}</div>
      )}
    </article>
  );
}
