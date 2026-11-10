/**
 * Button with variants (primary | secondary | ghost | danger | success),
 * sizes (sm | md | lg), optional icon and built-in loading state.
 */
export function Button({ variant = 'primary', size, icon: Icon, loading = false, block = false, className = '', children, disabled, type = 'button', ...rest }) {
  const classes = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', !children && 'icon-btn', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner sm" aria-hidden /> : Icon ? <Icon aria-hidden /> : null}
      {children}
    </button>
  );
}
