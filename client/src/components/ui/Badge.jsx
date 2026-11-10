export function Badge({ tone = 'blue', icon: Icon, children, title }) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {Icon && <Icon aria-hidden />}
      {children}
    </span>
  );
}
