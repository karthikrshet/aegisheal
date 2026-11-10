import { useState } from 'react';
import { FiPlayCircle } from 'react-icons/fi';
import { servicesApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../ui/Button.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';

/** Three different failures at once — the quickest way to show the agent in a viva / demo. */
const SCENARIO = [
  { service: 'api-gateway', fault: 'crash', label: 'Crash the API Gateway' },
  { service: 'order-service', fault: 'memory-leak', label: 'Leak memory in the Order Service' },
  { service: 'payment-service', fault: 'bad-deploy', label: 'Ship a faulty Payment Service release' },
];

export function GuidedDemo({ disabled, onDone }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    let ok = 0;
    for (const step of SCENARIO) {
      try {
        await servicesApi.injectFault(step.service, step.fault);
        ok += 1;
      } catch (err) {
        toast.error(`Skipped: ${step.label}`, err.message);
      }
    }
    setRunning(false);
    setOpen(false);
    if (ok) toast.warning(`Demo started: ${ok} faults injected`, 'Open the Dashboard to watch the agent recover all of them.');
    onDone?.();
  };

  return (
    <>
      <Button icon={FiPlayCircle} disabled={disabled} onClick={() => setOpen(true)}>
        Run guided demo
      </Button>
      <ConfirmDialog
        open={open}
        title="Run the guided demo?"
        confirmLabel="Start demo"
        tone="danger"
        loading={running}
        onConfirm={run}
        onCancel={() => setOpen(false)}
      >
        <p className="muted" style={{ marginBottom: 10 }}>
          AegisHeal will inject three different real failures at the same time:
        </p>
        <ol className="evidence">
          {SCENARIO.map((s) => (
            <li key={s.service}>{s.label}</li>
          ))}
        </ol>
        <p className="small muted" style={{ marginTop: 10 }}>
          Expected result: each is detected, diagnosed with a different root cause, recovered with a different action and verified — usually within a few seconds.
        </p>
      </ConfirmDialog>
    </>
  );
}
