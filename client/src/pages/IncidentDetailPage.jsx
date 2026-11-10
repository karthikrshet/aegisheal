import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheckSquare, FiMessageSquare } from 'react-icons/fi';
import { PageHeader, Card, Button, ErrorState, PageLoader, Badge, Field, ConfirmDialog } from '../components/ui/index.js';
import { PipelineFlow } from '../components/agent/PipelineFlow.jsx';
import { AnalysisCard } from '../components/incidents/AnalysisCard.jsx';
import { AttemptsList } from '../components/incidents/AttemptsList.jsx';
import { ApprovalBar } from '../components/incidents/ApprovalBar.jsx';
import { IncidentTimeline } from '../components/incidents/IncidentTimeline.jsx';
import { StatusBadge } from '../components/incidents/StatusBadge.jsx';
import { SeverityBadge } from '../components/incidents/SeverityBadge.jsx';
import { useApi } from '../hooks/useApi.js';
import { useLiveEvent } from '../context/LiveContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { incidentsApi, servicesApi } from '../api/endpoints.js';
import { isOperator } from '../utils/permissions.js';
import { formatDateTime, formatDuration, humanize, timeAgo } from '../utils/format.js';

const DECIDABLE = ['awaiting_approval', 'open', 'escalated'];

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState('');
  const [confirmResolve, setConfirmResolve] = useState(false);

  const { data, loading, error, reload, setData } = useApi(() => incidentsApi.get(id), [id]);
  const catalog = useApi(() => servicesApi.catalog(), []);
  useLiveEvent('incident', (inc) => inc.id === id && setData({ incident: inc }));

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const inc = data.incident;

  const act = async (kind, fn, success) => {
    setBusy(kind);
    try {
      const r = await fn();
      if (r?.incident) setData({ incident: r.incident });
      toast.success(success);
    } catch (err) {
      toast.error('Action failed', err.message);
    } finally {
      setBusy(null);
    }
  };

  const ctx = inc.context;
  return (
    <>
      <Link to="/incidents" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
        <FiArrowLeft aria-hidden /> All incidents
      </Link>
      <PageHeader
        title={`${inc.number} · ${inc.title}`}
        description={`Detected ${timeAgo(inc.detectedAt)} on ${inc.serviceName} · mode: ${inc.mode}`}
        actions={
          <>
            <SeverityBadge severity={inc.severity} />
            <StatusBadge status={inc.status} />
          </>
        }
      />

      {isOperator(user) && DECIDABLE.includes(inc.status) && (
        <div style={{ marginBottom: 16 }}>
          <ApprovalBar
            incident={inc}
            actions={catalog.data?.actions || []}
            busy={busy}
            onApprove={(actionId) => act('approve', () => incidentsApi.approve(inc.id, actionId), 'Approved — the agent is executing the action')}
            onReject={() => act('reject', () => incidentsApi.reject(inc.id, 'Rejected from dashboard'), 'Proposal rejected')}
          />
        </div>
      )}
      {inc.status === 'escalated' && inc.escalation && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <strong>Escalated:</strong>&nbsp;{inc.escalation.reason}
        </div>
      )}
      {inc.status === 'resolved' && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <strong>Resolved in {formatDuration(inc.mttrMs)}.</strong>&nbsp;{inc.resolution}
        </div>
      )}

      <Card title="Self-healing pipeline" subtitle="Methodology steps 1–7 for this incident" style={{ marginBottom: 16 }}>
        <PipelineFlow steps={inc.steps} />
      </Card>

      <div className="grid grid-3">
        <div className="span-2 stack">
          <AnalysisCard analysis={inc.analysis} />
          <Card title="Recovery attempts" subtitle="Automated recovery (step 6) and verification (step 7)">
            <AttemptsList attempts={inc.attempts} />
          </Card>
          {ctx && (
            <Card title="Collected evidence" subtitle={`Snapshot taken ${formatDateTime(ctx.collectedAt)}`}>
              <div className="grid grid-2">
                <dl className="kv">
                  <dt>Status</dt>
                  <dd>{humanize(ctx.service.status)}</dd>
                  <dt>Version</dt>
                  <dd>v{ctx.service.version}</dd>
                  <dt>Exit code</dt>
                  <dd>{ctx.service.exitCode ?? '—'}</dd>
                  <dt>Restarts</dt>
                  <dd>{ctx.service.restarts}</dd>
                  <dt>Error logs</dt>
                  <dd>{ctx.errorLogCount}</dd>
                </dl>
                <dl className="kv">
                  <dt>HTTP</dt>
                  <dd>{ctx.latestSample?.statusCode ?? ctx.latestSample?.error ?? '—'}</dd>
                  <dt>Response</dt>
                  <dd>{ctx.latestSample?.responseMs ?? '—'} ms</dd>
                  <dt>CPU</dt>
                  <dd>{ctx.latestSample?.cpuPercent ?? '—'}%</dd>
                  <dt>Memory</dt>
                  <dd>{ctx.latestSample?.memoryMB ?? '—'} MB</dd>
                  <dt>Last deploy</dt>
                  <dd>{ctx.lastDeployment ? `${ctx.lastDeployment.kind} → v${ctx.lastDeployment.toVersion}` : '—'}</dd>
                </dl>
              </div>
              <div className="divider" />
              <div className="small muted" style={{ marginBottom: 6 }}>
                Log excerpt
              </div>
              <div className="log-view" style={{ maxHeight: 240 }}>
                {ctx.logExcerpt.map((line, i) => (
                  <div key={i} className="log-line" style={{ gridTemplateColumns: '1fr' }}>
                    <span className="l-msg">{line}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        <div className="stack">
          <Card title="Summary">
            <dl className="kv">
              <dt>Service</dt>
              <dd>
                <Link to={`/services/${inc.serviceId}`}>{inc.serviceName}</Link>
              </dd>
              <dt>Type</dt>
              <dd>{humanize(inc.type)}</dd>
              <dt>Detected</dt>
              <dd>{formatDateTime(inc.detectedAt)}</dd>
              <dt>Resolved</dt>
              <dd>{formatDateTime(inc.resolvedAt)}</dd>
              <dt>MTTR</dt>
              <dd>{formatDuration(inc.mttrMs)}</dd>
              <dt>Attempts</dt>
              <dd>{inc.attempts.length}</dd>
            </dl>
            <div className="divider" />
            <div className="small muted" style={{ marginBottom: 6 }}>
              Symptoms
            </div>
            <div className="chip-list">
              {inc.anomalies.map((a) => (
                <Badge key={a.type} tone="amber">
                  {a.title}
                </Badge>
              ))}
            </div>
            {isOperator(user) && !['resolved', 'rejected'].includes(inc.status) && DECIDABLE.includes(inc.status) && (
              <Button variant="secondary" icon={FiCheckSquare} block style={{ marginTop: 14 }} onClick={() => setConfirmResolve(true)}>
                Mark as resolved
              </Button>
            )}
          </Card>
          <Card title="Timeline">
            <IncidentTimeline entries={inc.timeline} />
          </Card>
          <Card title="Notes" subtitle="Shared with your team">
            <div className="stack-sm">
              {inc.notes.length === 0 && <p className="small muted">No notes yet.</p>}
              {inc.notes.map((n, i) => (
                <div key={i} className="small">
                  <strong>{n.by}</strong> <span className="faint">{timeAgo(n.at)}</span>
                  <div>{n.text}</div>
                </div>
              ))}
              {isOperator(user) && (
                <form
                  className="stack-sm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!note.trim()) return;
                    act('note', () => incidentsApi.addNote(inc.id, note.trim()), 'Note added').then(() => setNote(''));
                  }}
                >
                  <Field label="Add a note">
                    {(a11y) => <textarea {...a11y} className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="What did you observe?" />}
                  </Field>
                  <Button type="submit" size="sm" variant="secondary" icon={FiMessageSquare} loading={busy === 'note'} disabled={!note.trim()}>
                    Add note
                  </Button>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResolve}
        title="Mark incident as resolved?"
        message="Use this when the problem was fixed outside AegisHeal. The incident will be closed and recorded as manually resolved."
        confirmLabel="Mark resolved"
        loading={busy === 'resolve'}
        onConfirm={() => act('resolve', () => incidentsApi.resolve(inc.id, 'Resolved from dashboard'), 'Incident resolved').then(() => setConfirmResolve(false))}
        onCancel={() => setConfirmResolve(false)}
      />
    </>
  );
}
