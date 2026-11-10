import { Link } from 'react-router-dom';
import { FiInfo } from 'react-icons/fi';
import { PageHeader, Card, ErrorState, PageLoader } from '../components/ui/index.js';
import { ChaosPanel } from '../components/services/ChaosPanel.jsx';
import { HealthBadge } from '../components/services/HealthBadge.jsx';
import { GuidedDemo } from '../components/services/GuidedDemo.jsx';
import { StatusBadge } from '../components/incidents/StatusBadge.jsx';
import { useApi } from '../hooks/useApi.js';
import { useThrottledReload } from '../hooks/useThrottledReload.js';
import { useLiveEvent } from '../context/LiveContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { servicesApi } from '../api/endpoints.js';
import { isOperator } from '../utils/permissions.js';

export default function ChaosLabPage() {
  const { user } = useAuth();
  const services = useApi(() => servicesApi.list(), []);
  const catalog = useApi(() => servicesApi.catalog(), []);
  const refresh = useThrottledReload(services.reload, 1000);
  useLiveEvent('service', refresh);
  useLiveEvent('incident', refresh);

  if (services.loading && !services.data) return <PageLoader />;
  if (services.error) return <ErrorState error={services.error} onRetry={services.reload} />;

  return (
    <>
      <PageHeader
        title="Chaos lab"
        description="Inject real faults into real processes and watch the agent detect, diagnose, recover and verify — live."
        actions={<GuidedDemo disabled={!isOperator(user)} onDone={() => services.reload({ silent: true })} />}
      />
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <FiInfo aria-hidden />
        <div>
          Tip: keep the <Link to="/">Dashboard</Link> open in another tab to watch the pipeline light up. Try switching the agent to <strong>Supervised</strong> on the{' '}
          <Link to="/agent">Agent page</Link> to approve recoveries yourself.
          {!isOperator(user) && <div><strong>Viewer accounts cannot inject faults.</strong></div>}
        </div>
      </div>
      <div className="stack">
        {services.data.services.map((s) => (
          <Card
            key={s.id}
            title={s.name}
            subtitle={`v${s.version} · ${s.dependency}`}
            actions={
              <>
                <HealthBadge health={s.health} />
                {s.activeIncident && (
                  <Link to={`/incidents/${s.activeIncident.id}`} className="row" style={{ color: 'inherit' }}>
                    <StatusBadge status={s.activeIncident.status} />
                  </Link>
                )}
              </>
            }
          >
            <ChaosPanel service={s} faults={catalog.data?.faults || []} disabled={!isOperator(user)} onInjected={() => services.reload({ silent: true })} />
          </Card>
        ))}
      </div>
    </>
  );
}
