export function Spinner({ size, label = 'Loading' }) {
  return <span className={`spinner ${size === 'sm' ? 'sm' : ''}`} role="status" aria-label={label} />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="center-fill">
      <Spinner />
      <span className="muted">{label}</span>
    </div>
  );
}
