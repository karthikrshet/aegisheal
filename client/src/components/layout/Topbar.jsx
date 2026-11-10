import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiLogOut, FiMenu, FiUser, FiWifi, FiWifiOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLive } from '../../context/LiveContext.jsx';
import { Badge } from '../ui/Badge.jsx';
import { initials, humanize } from '../../utils/format.js';

export function Topbar({ onMenu, agent }) {
  const { user, logout } = useAuth();
  const { connected } = useLive();
  const [busy, setBusy] = useState(false);

  return (
    <header className="topbar">
      <button className="btn btn-ghost icon-btn menu-btn" onClick={onMenu} aria-label="Open navigation">
        <FiMenu />
      </button>
      <div className="row-wrap grow">
        {agent && (
          <Badge tone={agent.paused ? 'amber' : agent.mode === 'autonomous' ? 'blue' : agent.mode === 'supervised' ? 'violet' : 'gray'}>
            Agent: {agent.paused ? 'Paused' : humanize(agent.mode)}
          </Badge>
        )}
        <Badge tone={connected ? 'green' : 'red'} icon={connected ? FiWifi : FiWifiOff} title={connected ? 'Receiving live updates' : 'Live updates disconnected — retrying'}>
          {connected ? 'Live' : 'Reconnecting'}
        </Badge>
      </div>
      <Link to="/profile" className="row" style={{ color: 'inherit' }} aria-label="Your profile">
        <span
          aria-hidden
          style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--blue-50)', color: 'var(--primary)', display: 'grid', placeItems: 'center', fontWeight: 700 }}
        >
          {user ? initials(user.name) : <FiUser />}
        </span>
        <span className="hide-sm">
          <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{user?.name}</div>
          <div className="small muted" style={{ lineHeight: 1.2 }}>
            {humanize(user?.role)}
          </div>
        </span>
      </Link>
      <button
        className="btn btn-ghost icon-btn"
        aria-label="Sign out"
        title="Sign out"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await logout();
        }}
      >
        <FiLogOut />
      </button>
    </header>
  );
}
