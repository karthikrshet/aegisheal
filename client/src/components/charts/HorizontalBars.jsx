import { humanize } from '../../utils/format.js';
import { ProgressBar } from '../ui/ProgressBar.jsx';

/** Simple ranked list with bars (accessible, no canvas). */
export function HorizontalBars({ data = [], format = (v) => v, humanizeNames = true }) {
  const label = (n) => (humanizeNames ? humanize(n) : n);
  if (!data.length) return <div className="center-fill muted small">No data yet</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="stack-sm">
      {data.map((d) => (
        <div key={d.name}>
          <div className="spread small" style={{ marginBottom: 4 }}>
            <span className="truncate">{label(d.name)}</span>
            <strong>{format(d.value)}</strong>
          </div>
          <ProgressBar value={d.value} max={max} tone="" label={label(d.name)} />
        </div>
      ))}
    </div>
  );
}
