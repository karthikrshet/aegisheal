import { useState } from 'react';
import { FiCheck, FiUserCheck, FiX } from 'react-icons/fi';
import { Button } from '../ui/Button.jsx';
import { humanize } from '../../utils/format.js';

/** Human-in-the-loop decision bar shown for awaiting_approval / open / escalated incidents. */
export function ApprovalBar({ incident, actions = [], onApprove, onReject, busy }) {
  const [choice, setChoice] = useState(incident.pendingAction || incident.analysis?.recommendedActions?.[0] || 'restart-service');
  const reason =
    incident.status === 'awaiting_approval'
      ? incident.decision?.guardrail?.reason
      : incident.status === 'escalated'
        ? incident.escalation?.reason
        : 'Agent is in observe-only mode.';

  return (
    <div className="approval-bar" role="region" aria-label="Approval required">
      <div className="ab-icon" aria-hidden>
        <FiUserCheck />
      </div>
      <div className="grow" style={{ minWidth: 220 }}>
        <strong>{incident.status === 'escalated' ? 'Escalated — choose a recovery action' : `The agent proposes: ${humanize(incident.pendingAction)}`}</strong>
        <div className="small muted">{reason}</div>
      </div>
      <label className="sr-only" htmlFor="approve-action">
        Recovery action
      </label>
      <select id="approve-action" className="select" style={{ width: 220 }} value={choice} onChange={(e) => setChoice(e.target.value)}>
        {actions.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.risk} risk)
          </option>
        ))}
      </select>
      <Button variant="success" icon={FiCheck} loading={busy === 'approve'} disabled={!!busy} onClick={() => onApprove(choice)}>
        Approve & run
      </Button>
      {incident.status !== 'escalated' && (
        <Button variant="secondary" icon={FiX} loading={busy === 'reject'} disabled={!!busy} onClick={onReject}>
          Reject
        </Button>
      )}
    </div>
  );
}
