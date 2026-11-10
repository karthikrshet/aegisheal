import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge.jsx';
import { SeverityBadge } from './SeverityBadge.jsx';
import { formatDuration, humanize, timeAgo, formatPercent } from '../../utils/format.js';

export function IncidentTable({ items = [], compact = false }) {
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Incident</th>
            <th>Service</th>
            <th>Severity</th>
            <th>Status</th>
            {!compact && <th>Root cause</th>}
            {!compact && <th>Confidence</th>}
            <th>MTTR</th>
            <th>Detected</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr
              key={i.id}
              className="clickable"
              tabIndex={0}
              onClick={() => navigate(`/incidents/${i.id}`)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/incidents/${i.id}`)}
              aria-label={`Open ${i.number}`}
            >
              <td>
                <div style={{ fontWeight: 650 }}>{i.number}</div>
                <div className="small muted">{humanize(i.type)}</div>
              </td>
              <td className="nowrap">{i.serviceName}</td>
              <td>
                <SeverityBadge severity={i.severity} />
              </td>
              <td>
                <StatusBadge status={i.status} />
              </td>
              {!compact && (
                <td style={{ maxWidth: 320 }}>
                  <span className="small">{i.rootCause || <span className="faint">Analyzing…</span>}</span>
                </td>
              )}
              {!compact && <td>{i.confidence != null ? formatPercent(i.confidence) : '—'}</td>}
              <td className="nowrap">{formatDuration(i.mttrMs)}</td>
              <td className="nowrap small muted">{timeAgo(i.detectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
