import { useState } from 'react';
import { FiActivity, FiAlertOctagon, FiClock, FiCpu, FiDatabase, FiGitCommit, FiHardDrive, FiZap } from 'react-icons/fi';
import { servicesApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';

const ICONS = {
  crash: FiAlertOctagon,
  'memory-leak': FiHardDrive,
  'cpu-spike': FiCpu,
  latency: FiClock,
  'dependency-loss': FiDatabase,
  'job-failure': FiActivity,
  'bad-deploy': FiGitCommit,
};

/** Fault-injection buttons for one service (operator+ only). */
export function ChaosPanel({ service, faults = [], disabled, onInjected }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const inject = async (fault) => {
    setBusy(fault.id);
    try {
      const r = await servicesApi.injectFault(service.id, fault.id);
      toast.warning(`Fault injected: ${fault.name}`, `${service.name}: ${r.result}. Watch the agent react.`);
      onInjected?.(fault);
    } catch (err) {
      toast.error('Fault injection failed', err.message);
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const notRunning = service.status !== 'running';
  return (
    <>
      <div className="fault-grid">
        {faults.map((f) => {
          const Icon = ICONS[f.id] || FiZap;
          const blocked = disabled || (notRunning && f.id !== 'bad-deploy') || !!busy;
          return (
            <button key={f.id} type="button" className="fault-btn" disabled={blocked} onClick={() => setConfirm(f)} aria-label={`Inject ${f.name} into ${service.name}`}>
              <span className="f-icon" aria-hidden>
                {busy === f.id ? <span className="spinner sm" /> : <Icon />}
              </span>
              <span>
                <span className="f-name">{f.name}</span>
                <br />
                <span className="f-desc">{f.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {notRunning && <p className="small muted" style={{ marginTop: 8 }}>Service is {service.status}; most faults need a running process.</p>}
      <ConfirmDialog
        open={!!confirm}
        title={`Inject "${confirm?.name}"?`}
        message={`This deliberately breaks ${service.name} so you can watch AegisHeal detect, diagnose and recover it.`}
        confirmLabel="Inject fault"
        tone="danger"
        loading={!!busy}
        onConfirm={() => inject(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
