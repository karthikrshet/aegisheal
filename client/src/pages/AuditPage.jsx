import { useState } from 'react';
import { FiFileText } from 'react-icons/fi';
import { PageHeader, Card, Badge, ErrorState, EmptyState, Pagination, Spinner } from '../components/ui/index.js';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { auditApi } from '../api/endpoints.js';
import { formatDateTime } from '../utils/format.js';

const LIMIT = 25;
const toneFor = (action) =>
  action.startsWith('chaos') ? 'red' : action.startsWith('recovery') || action.startsWith('manual') ? 'blue' : action.startsWith('incident') ? 'violet' : action.startsWith('auth') ? 'gray' : 'cyan';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const q = useDebounce(action, 300);
  const { data, loading, error, reload } = useApi(() => auditApi.list({ action: q, limit: LIMIT, offset: (page - 1) * LIMIT }), [q, page]);

  return (
    <>
      <PageHeader title="Audit log" description="Tamper-evident record of every human and agent action — who did what, when." />
      <Card flush>
        <div className="row-wrap" style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <input
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Filter by action prefix, e.g. chaos, recovery, auth"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by action"
            maxLength={60}
          />
          {loading && <Spinner size="sm" />}
        </div>
        {error ? (
          <div style={{ padding: 16 }}>
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : data?.items.length ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap small">{formatDateTime(r.at)}</td>
                      <td className="nowrap">{r.actor === 'agent' ? <Badge tone="blue">AI agent</Badge> : r.actor}</td>
                      <td>
                        <Badge tone={toneFor(r.action)}>{r.action}</Badge>
                      </td>
                      <td className="small">{r.target || '—'}</td>
                      <td className="small muted" style={{ maxWidth: 360 }}>
                        {r.detail || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={Math.max(1, Math.ceil(data.total / LIMIT))} total={data.total} onChange={setPage} />
          </>
        ) : (
          !loading && <EmptyState icon={FiFileText} title="No audit entries" />
        )}
      </Card>
    </>
  );
}
