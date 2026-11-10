/** Tiny dependency-free SVG sparkline for service cards. */
export function Sparkline({ values = [], width = 120, height = 32, color = '#2563eb', max }) {
  const clean = values.map((v) => (Number.isFinite(v) ? v : 0));
  if (clean.length < 2) return <svg width={width} height={height} aria-hidden />;
  const top = max ?? Math.max(...clean, 1);
  const step = width / (clean.length - 1);
  const points = clean.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - (v / top) * (height - 4)).toFixed(1)}`);
  const area = `0,${height} ${points.join(' ')} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polygon points={area} fill={color} opacity="0.08" />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
