export function Toggle({ checked, onChange, label, disabled, id }) {
  return (
    <label className="toggle" htmlFor={id} style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      {label && <span>{label}</span>}
    </label>
  );
}
