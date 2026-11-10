import { formatTime } from '../../utils/format.js';

export function IncidentTimeline({ entries = [] }) {
  if (!entries.length) return <p className="muted small">No events yet.</p>;
  return (
    <ol className="timeline">
      {entries
        .slice()
        .reverse()
        .map((e, idx) => (
          <li key={`${e.at}-${idx}`} className={e.actor !== 'agent' ? 'human' : ''}>
            <div className="t-time">
              {formatTime(e.at)} · {e.actor === 'agent' ? 'AI agent' : e.actor}
            </div>
            <div className="t-msg">{e.message}</div>
          </li>
        ))}
    </ol>
  );
}
