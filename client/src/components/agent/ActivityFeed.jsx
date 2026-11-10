import { FiZap } from 'react-icons/fi';
import { timeAgo } from '../../utils/format.js';

export function ActivityFeed({ items = [], limit = 8 }) {
  if (!items.length) return <p className="muted small">No agent activity yet. Inject a fault from the Chaos lab to watch the agent work.</p>;
  return (
    <ul className="feed">
      {items
        .slice(-limit)
        .reverse()
        .map((a, i) => (
          <li key={`${a.at}-${i}`}>
            <FiZap aria-hidden />
            <div className="grow">
              <div>{a.message}</div>
              <div className="small faint">{timeAgo(a.at)}</div>
            </div>
          </li>
        ))}
    </ul>
  );
}
