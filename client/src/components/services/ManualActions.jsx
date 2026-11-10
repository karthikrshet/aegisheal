import { useState } from 'react';
import { FiPlay } from 'react-icons/fi';
import { servicesApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';

const RISK_TONE = { low: 'green', medium: 'amber', high: 'red' };

/** Run any predefined recovery action by hand (operator override). */
export function ManualActions({ service, actions = [], disabled, onDone }) {
  const toast = useToast();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await servicesApi.runAction(service.id, pending.id);
      toast.success(pending.name, r.result.output);
      onDone?.();
    } catch (err) {
      toast.error(`${pending.name} failed`, err.message);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <>
      <div className="stack-sm">
        {actions.map((a) => (
          <div key={a.id} className="spread" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="grow">
              <div className="row">
                <strong>{a.name}</strong>
                <Badge tone={RISK_TONE[a.risk]}>{a.risk} risk</Badge>
              </div>
              <div className="small muted">{a.description}</div>
            </div>
            <Button size="sm" variant="secondary" icon={FiPlay} disabled={disabled} onClick={() => setPending(a)}>
              Run
            </Button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!pending}
        title={`Run "${pending?.name}" on ${service.name}?`}
        message={pending?.description}
        confirmLabel="Run action"
        loading={busy}
        onConfirm={run}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
