import { useCallback, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { ErrorBoundary } from '../ui/ErrorBoundary.jsx';
import { useApi } from '../../hooks/useApi.js';
import { agentApi } from '../../api/endpoints.js';
import { useLiveEvent } from '../../context/LiveContext.jsx';
import { useThrottledReload } from '../../hooks/useThrottledReload.js';
import { useToast } from '../../context/ToastContext.jsx';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toast = useToast();
  const { data, reload } = useApi(() => agentApi.state(), []);
  const refresh = useThrottledReload(reload, 2000);
  const agent = data?.agent;
  const notified = useRef(new Set());

  useLiveEvent('agent', refresh);
  useLiveEvent(
    'incident',
    useCallback(
      (inc) => {
        refresh();
        // Notify once per incident status change, and only for fresh changes.
        const key = `${inc.id}:${inc.status}`;
        const fresh = Date.now() - new Date(inc.updatedAt).getTime() < 5000;
        if (!fresh || notified.current.has(key)) return;
        notified.current.add(key);
        if (inc.status === 'resolved') toast.success(`${inc.number} resolved`, inc.resolution || `${inc.serviceName} is healthy again`);
        else if (inc.status === 'escalated') toast.error(`${inc.number} escalated`, inc.escalation?.reason);
        else if (inc.status === 'awaiting_approval') toast.info(`${inc.number} needs approval`, inc.title);
        else if (inc.status === 'detected') toast.warning(`${inc.number} detected`, inc.title);
      },
      [refresh, toast],
    ),
  );

  const counts = {
    approvals: agent?.pendingApprovals?.length || 0,
    incidents: agent ? agent.stats.escalated : 0,
  };

  return (
    <div className="app-shell">
      <a href="#main" className="sr-only">
        Skip to content
      </a>
      <Sidebar open={open} onNavigate={() => setOpen(false)} counts={counts} />
      <div className={`sidebar-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden />
      <div className="main">
        <Topbar onMenu={() => setOpen(true)} agent={agent} />
        <main id="main" className="content">
          <ErrorBoundary key={location.pathname}>
            <Outlet context={{ agent, reloadAgent: reload }} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
