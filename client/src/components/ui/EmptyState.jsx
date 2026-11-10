import { FiInbox } from 'react-icons/fi';

export function EmptyState({ icon: Icon = FiInbox, title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>
        <Icon />
      </div>
      <h3>{title}</h3>
      {children && <p className="small">{children}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}
