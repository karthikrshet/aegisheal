import { Card } from './Card.jsx';

export function StatCard({ icon: Icon, tone = 'blue', label, value, hint, loading = false }) {
  return (
    <Card className="stat-card">
      <div className="stat" style={{ padding: 0 }}>
        {Icon && (
          <div className={`stat-icon ${tone}`} aria-hidden>
            <Icon />
          </div>
        )}
        <div className="grow">
          <div className="stat-label">{label}</div>
          {loading ? <div className="skeleton" style={{ height: 28, width: 80, marginTop: 4 }} /> : <div className="stat-value">{value}</div>}
          {hint && <div className="stat-hint">{hint}</div>}
        </div>
      </div>
    </Card>
  );
}
