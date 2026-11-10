import { useMemo, useRef, useState } from 'react';
import { FiPause, FiPlay, FiSearch, FiTrash2 } from 'react-icons/fi';
import { PageHeader, Card, Button, ErrorState, EmptyState } from '../components/ui/index.js';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useLiveEvent } from '../context/LiveContext.jsx';
import { logsApi } from '../api/endpoints.js';
import { formatTime } from '../utils/format.js';

const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const MAX = 500;

export default function LogsPage() {
  const [source, setSource] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const q = useDebounce(search, 300);

  const { data, error, reload, setData } = useApi(() => logsApi.query({ source, level, search: q, limit: 300 }), [source, level, q]);

  useLiveEvent('log', (entry) => {
    if (pausedRef.current) return;
    if (source && entry.source !== source) return;
    if (level && entry.level !== level) return;
    if (q && !entry.message.toLowerCase().includes(q.toLowerCase())) return;
    setData((d) => (d ? { ...d, logs: [...d.logs, entry].slice(-MAX) } : d));
  });

  const logs = useMemo(() => (data?.logs || []).slice().reverse(), [data]);

  return (
    <>
      <PageHeader title="Live logs" description="Logs collected from every managed service and from the agent itself (methodology step 3)." />
      <Card flush>
        <div className="row-wrap" style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <select className="select" style={{ width: 190 }} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source">
            <option value="">All sources</option>
            {(data?.sources || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 150 }} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level">
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <div className="input-icon grow" style={{ minWidth: 200 }}>
            <FiSearch aria-hidden />
            <input className="input" placeholder="Search messages…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search logs" maxLength={100} />
          </div>
          <Button variant="secondary" icon={paused ? FiPlay : FiPause} onClick={() => setPaused((p) => !p)}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="ghost" icon={FiTrash2} onClick={() => setData((d) => (d ? { ...d, logs: [] } : d))} aria-label="Clear view">
            Clear
          </Button>
        </div>
        {error ? (
          <div style={{ padding: 16 }}>
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : logs.length ? (
          <div className="log-view" style={{ borderRadius: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, maxHeight: 'calc(100vh - 260px)' }} role="log" aria-live="off">
            {logs.map((l) => (
              <div key={l.id} className="log-line">
                <span className="l-time">{formatTime(l.ts)}</span>
                <span className={`lvl-${l.level}`}>{l.level.toUpperCase()}</span>
                <span className="l-src">{l.source}</span>
                <span className="l-msg">{l.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No log lines match">Change the filters or wait for new activity.</EmptyState>
        )}
      </Card>
    </>
  );
}
