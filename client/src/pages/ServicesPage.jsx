import { FiRefreshCw } from 'react-icons/fi';
import { PageHeader, Button, ErrorState, PageLoader } from '../components/ui/index.js';
import { ServiceCard } from '../components/services/ServiceCard.jsx';
import { useApi } from '../hooks/useApi.js';
import { useThrottledReload } from '../hooks/useThrottledReload.js';
import { useLive, useLiveEvent } from '../context/LiveContext.jsx';
import { servicesApi, settingsApi } from '../api/endpoints.js';

export default function ServicesPage() {
  const { metrics } = useLive();
  const { data, loading, error, reload } = useApi(() => servicesApi.list(), []);
  const settings = useApi(() => settingsApi.get(), []);
  const refresh = useThrottledReload(reload, 1500);
  useLiveEvent('service', refresh);
  useLiveEvent('incident', refresh);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Managed services"
        description="Each service runs as a real, separate process supervised by AegisHeal's DevOps automation layer."
        actions={
          <Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()}>
            Refresh
          </Button>
        }
      />
      <div className="grid grid-3">
        {data.services.map((s) => (
          <ServiceCard key={s.id} service={s} live={metrics.services[s.id] || []} thresholds={settings.data?.settings.thresholds} />
        ))}
      </div>
    </>
  );
}
