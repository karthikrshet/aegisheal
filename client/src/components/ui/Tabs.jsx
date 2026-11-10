export function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={`tab ${value === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && (
            <span className="badge badge-gray" style={{ marginLeft: 6 }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
