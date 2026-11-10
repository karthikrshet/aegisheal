export function ProgressBar({ value = 0, max = 1, tone, label }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / (Number(max) || 1)) * 100));
  const auto = tone ?? (pct >= 85 ? 'red' : pct >= 65 ? 'amber' : '');
  return (
    <div className={`progress ${auto}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
