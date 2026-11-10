import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { formatTime } from '../../utils/format.js';

const COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#16a34a', '#d97706'];

/**
 * Real-time line chart.
 * series: [{ key, label, color? }] — data: [{ ts, [key]: number }]
 */
export function LiveLineChart({ data = [], series, unit = '', threshold, height = 240, domain }) {
  return (
    <div className="chart-box" style={{ height }} aria-label="Live chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#eef2f9" vertical={false} />
          <XAxis dataKey="ts" tickFormatter={(t) => formatTime(t).slice(0, 5)} tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={40} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit={unit} domain={domain || [0, 'auto']} width={56} />
          <Tooltip
            labelFormatter={(t) => formatTime(t)}
            formatter={(v, name) => [v == null ? '—' : `${v}${unit}`, name]}
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f3', boxShadow: '0 6px 16px rgba(30,64,175,.08)' }}
          />
          {threshold != null && <ReferenceLine y={threshold} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'threshold', fontSize: 10, fill: '#dc2626', position: 'insideTopRight' }} />}
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || COLORS[i % COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
