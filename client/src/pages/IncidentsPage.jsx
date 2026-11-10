import { useState } from 'react';
import { FiDownload, FiSearch, FiShield } from 'react-icons/fi';
import { PageHeader, Card, EmptyState, ErrorState, Pagination, Spinner } from '../components/ui/index.js';
import { IncidentTable } from '../components/incidents/IncidentTable.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useThrottledReload } from '../hooks/useThrottledReload.js';
import { useLiveEvent } from '../context/LiveContext.jsx';
import { incidentsApi } from '../api/endpoints.js';
import { INCIDENT_STATUS, SEVERITY } from '../utils/constants.js';

export default function IncidentsPage() {
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebounce(q, 300);

  const { data, loading, error, reload } = useApi(() => incidentsApi.list({ status, severity, q: query, page, limit: 15 }), [status, severity, query, page]);
  const refresh = useThrottledReload(reload, 2000);
  useLiveEvent('incident', refresh);

  const filter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Incident history"
        description="Every detected failure with the agent's analysis, actions and verification result."
        actions={
          <a className="btn btn-secondary" href={incidentsApi.exportUrl} download>
            <FiDownload aria-hidden /> Export CSV
          </a>
        }
      />
      <Card flush>
        <div className="row-wrap" style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div className="input-icon grow" style={{ minWidth: 220 }}>
            <FiSearch aria-hidden />
            <input className="input" placeholder="Search number, service, cause…" value={q} onChange={filter(setQ)} aria-label="Search incidents" maxLength={100} />
          </div>
          <select className="select" style={{ width: 190 }} value={status} onChange={filter(setStatus)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="active">Active (open)</option>
            {Object.entries(INCIDENT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 160 }} value={severity} onChange={filter(setSeverity)} aria-label="Filter by severity">
            <option value="">All severities</option>
            {Object.entries(SEVERITY).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          {loading && <Spinner size="sm" />}
        </div>
        {error ? (
          <div style={{ padding: 16 }}>
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : data?.items.length ? (
          <>
            <IncidentTable items={data.items} />
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          </>
        ) : (
          !loading && (
            <EmptyState icon={FiShield} title={q || status || severity ? 'No matching incidents' : 'No incidents recorded yet'}>
              {q || status || severity ? 'Try clearing the filters.' : 'Use the Chaos lab to inject a fault and watch the agent heal it.'}
            </EmptyState>
          )
        )}
      </Card>
    </>
  );
}
