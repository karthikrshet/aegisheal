import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Badge } from '../ui/Badge.jsx';
import { formatDuration, formatTime } from '../../utils/format.js';

export function AttemptsList({ attempts = [] }) {
  if (!attempts.length) return <p className="muted small">No recovery action has been executed yet.</p>;
  return (
    <div className="stack-sm">
      {attempts.map((a) => {
        const ok = a.result?.ok && a.verification?.passed;
        return (
          <div key={a.n} className="card" style={{ padding: 14, boxShadow: 'none' }}>
            <div className="spread">
              <div className="row">
                {ok ? <FiCheckCircle color="var(--success)" aria-hidden /> : <FiXCircle color="var(--danger)" aria-hidden />}
                <strong>
                  Attempt {a.n}: {a.name}
                </strong>
              </div>
              <Badge tone={ok ? 'green' : a.result ? 'red' : 'blue'}>{ok ? 'Verified' : a.result ? 'Failed' : 'Running'}</Badge>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              {formatTime(a.startedAt)} · by {a.actor} · action took {formatDuration(a.result?.durationMs)}
            </div>
            {a.result && <div className="small" style={{ marginTop: 6 }}>{a.result.ok ? a.result.output : a.result.error}</div>}
            {a.verification && (
              <div className="small" style={{ marginTop: 6 }}>
                <strong>Verification:</strong> {a.verification.summary}
                <div className="chip-list" style={{ marginTop: 6 }}>
                  {a.verification.probes.map((p) => (
                    <Badge key={p.at} tone={p.healthy ? 'green' : 'red'} title={`HTTP ${p.statusCode ?? '—'} · ${p.responseMs ?? '—'} ms`}>
                      {p.healthy ? '✓' : '✕'} {p.statusCode ?? 'down'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
