export function Segmented({ options, value, onChange, disabled, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={value === o.id ? 'active' : ''}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            title={o.description}
          >
            {Icon && <Icon aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
