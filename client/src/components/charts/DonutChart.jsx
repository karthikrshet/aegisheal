import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { humanize } from '../../utils/format.js';

const PALETTE = ['#2563eb', '#60a5fa', '#0891b2', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#94a3b8'];

export function DonutChart({ data = [], height = 240 }) {
  if (!data.length) return <div className="center-fill muted small">No data yet</div>;
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [v, humanize(n)]} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f3' }} />
          <Legend formatter={(v) => <span style={{ color: '#334155', fontSize: 12 }}>{humanize(v)}</span>} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
