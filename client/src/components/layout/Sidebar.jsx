import { NavLink } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiBookOpen,
  FiBarChart2,
  FiCpu,
  FiFileText,
  FiGrid,
  FiInfo,
  FiServer,
  FiSettings,
  FiShield,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';
import { isAdmin } from '../../utils/permissions.js';

const SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: FiGrid, end: true },
      { to: '/services', label: 'Services', icon: FiServer },
      { to: '/incidents', label: 'Incidents', icon: FiAlertTriangle, badge: 'incidents' },
    ],
  },
  {
    title: 'AI Agent',
    items: [
      { to: '/agent', label: 'Agent control', icon: FiCpu, badge: 'approvals' },
      { to: '/playbooks', label: 'Playbooks', icon: FiBookOpen },
      { to: '/chaos', label: 'Chaos lab', icon: FiZap },
    ],
  },
  {
    title: 'Insights',
    items: [
      { to: '/logs', label: 'Live logs', icon: FiActivity },
      { to: '/reports', label: 'Reports', icon: FiBarChart2 },
    ],
  },
  {
    title: 'Administration',
    admin: true,
    items: [
      { to: '/users', label: 'Users', icon: FiUsers },
      { to: '/audit', label: 'Audit log', icon: FiFileText },
      { to: '/settings', label: 'Settings', icon: FiSettings },
    ],
  },
  { title: 'Project', items: [{ to: '/about', label: 'About project', icon: FiInfo }] },
];

export function Sidebar({ open, onNavigate, counts = {} }) {
  const { user } = useAuth();
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="brand">
        <div className="brand-logo" aria-hidden>
          <FiShield size={20} />
        </div>
        <div>
          <div className="brand-name">AegisHeal</div>
          <div className="brand-sub">Self-healing control center</div>
        </div>
      </div>
      <nav>
        {SECTIONS.filter((s) => !s.admin || isAdmin(user)).map((section) => (
          <div key={section.title}>
            <div className="nav-section">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const count = item.badge ? counts[item.badge] : 0;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                  <Icon aria-hidden />
                  <span>{item.label}</span>
                  {count > 0 && (
                    <span className="nav-count" aria-label={`${count} pending`}>
                      {count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer" style={{ marginTop: 18 }}>
        <strong>Agentic AI framework</strong>
        <div className="muted">Monitor → Detect → Analyze → Recover → Verify</div>
      </div>
    </aside>
  );
}
