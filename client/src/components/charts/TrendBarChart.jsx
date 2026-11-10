import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

/** Incidents per day (bars) with average MTTR in seconds (line). */
export function TrendBarChart({ data = [], height = 260 }) {
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#eef2f9" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" unit="s" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f3' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="resolved" name="Resolved" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
          <Bar yAxisId="left" dataKey="escalated" name="Escalated" stackId="a" fill="#f87171" radius={[6, 6, 0, 0]} />
          <Line yAxisId="right" dataKey="mttrSec" name="Avg MTTR (s)" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
