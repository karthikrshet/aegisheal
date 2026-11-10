import { useEffect, useState } from 'react';
import { FiRotateCcw, FiSave } from 'react-icons/fi';
import { PageHeader, Card, Button, Field, Toggle, ErrorState, PageLoader, Segmented, ConfirmDialog, Badge } from '../components/ui/index.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { settingsApi } from '../api/endpoints.js';
import { humanize } from '../utils/format.js';

const THRESHOLDS = [
  { key: 'cpuPercent', label: 'CPU threshold', unit: '%', min: 10, max: 100, step: 1 },
  { key: 'memoryMB', label: 'Memory threshold', unit: 'MB', min: 64, max: 4096, step: 1 },
  { key: 'latencyMs', label: 'Response-time threshold', unit: 'ms', min: 50, max: 10000, step: 10 },
  { key: 'errorRate', label: 'Error-rate threshold', unit: '0–1', min: 0.01, max: 1, step: 0.01 },
  { key: 'failedJobs', label: 'Failed jobs threshold', unit: 'jobs', min: 1, max: 1000, step: 1 },
  { key: 'consecutiveSamples', label: 'Consecutive samples to confirm', unit: 'checks', min: 1, max: 20, step: 1 },
];
const GUARDRAILS = [
  { key: 'maxAttemptsPerIncident', label: 'Max attempts per incident', min: 1, max: 10, step: 1 },
  { key: 'cooldownMs', label: 'Cooldown between same action (ms)', min: 0, max: 600000, step: 500 },
  { key: 'circuitBreakerFailures', label: 'Circuit breaker: failures to open', min: 1, max: 50, step: 1 },
  { key: 'circuitBreakerWindowMs', label: 'Circuit breaker window (ms)', min: 60000, max: 86400000, step: 60000 },
  { key: 'maxConcurrentRecoveries', label: 'Max concurrent recoveries', min: 1, max: 10, step: 1 },
  { key: 'minConfidenceForAutonomy', label: 'Min confidence for autonomy (0–1)', min: 0, max: 1, step: 0.05 },
  { key: 'verificationChecks', label: 'Healthy checks to verify', min: 1, max: 10, step: 1 },
  { key: 'verificationTimeoutMs', label: 'Verification timeout (ms)', min: 3000, max: 120000, step: 1000 },
];

function NumberField({ def, value, onChange }) {
  const invalid = value === '' || Number.isNaN(Number(value)) || Number(value) < def.min || Number(value) > def.max;
  return (
    <Field label={def.label} hint={`${def.min} – ${def.max}${def.unit ? ` ${def.unit}` : ''}`} error={invalid ? `Must be between ${def.min} and ${def.max}` : null}>
      {(a) => <input {...a} className="input" type="number" min={def.min} max={def.max} step={def.step} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => settingsApi.get(), []);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (data) setDraft(structuredClone(data.settings));
  }, [data]);

  if ((loading && !data) || !draft) return error ? <ErrorState error={error} onRetry={reload} /> : <PageLoader />;

  const set = (section, key, value) => setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
  const allValid = [...THRESHOLDS.map((t) => [t, draft.thresholds[t.key]]), ...GUARDRAILS.map((g) => [g, draft.guardrails[g.key]])].every(
    ([def, v]) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= def.min && Number(v) <= def.max,
  );

  const save = async () => {
    setSaving(true);
    try {
      const toNumbers = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Number(v)]));
      const payload = { ...draft, thresholds: toNumbers(draft.thresholds), guardrails: toNumbers(draft.guardrails) };
      for (const k of ['maxAttemptsPerIncident', 'cooldownMs', 'circuitBreakerFailures', 'circuitBreakerWindowMs', 'maxConcurrentRecoveries', 'verificationChecks', 'verificationTimeoutMs']) {
        payload.guardrails[k] = Math.round(payload.guardrails[k]);
      }
      payload.thresholds.failedJobs = Math.round(payload.thresholds.failedJobs);
      payload.thresholds.consecutiveSamples = Math.round(payload.thresholds.consecutiveSamples);
      await settingsApi.update(payload);
      toast.success('Settings saved', 'The agent uses the new values immediately.');
      reload({ silent: true });
    } catch (err) {
      toast.error('Could not save settings', err.details?.map((d) => `${d.path}: ${d.message}`).join('; ') || err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAction = (id, on) =>
    setDraft((d) => ({ ...d, allowedActions: on ? [...new Set([...d.allowedActions, id])] : d.allowedActions.filter((a) => a !== id) }));

  return (
    <>
      <PageHeader
        title="Settings"
        description="Detection thresholds, agent guardrails, allowed actions and AI provider."
        actions={
          <>
            <Button variant="secondary" icon={FiRotateCcw} onClick={() => setConfirmReset(true)}>
              Reset defaults
            </Button>
            <Button icon={FiSave} loading={saving} disabled={!allValid} onClick={save}>
              Save changes
            </Button>
          </>
        }
      />
      <div className="grid grid-2">
        <Card title="Detection thresholds" subtitle="When does a metric count as a failure?">
          <div className="grid grid-2">
            {THRESHOLDS.map((t) => (
              <NumberField key={t.key} def={t} value={draft.thresholds[t.key]} onChange={(v) => set('thresholds', t.key, v)} />
            ))}
          </div>
        </Card>
        <Card title="Guardrails" subtitle="Restrictions that keep the autonomous agent safe">
          <div className="grid grid-2">
            {GUARDRAILS.map((g) => (
              <NumberField key={g.key} def={g} value={draft.guardrails[g.key]} onChange={(v) => set('guardrails', g.key, v)} />
            ))}
          </div>
        </Card>
        <Card title="Allowed recovery actions" subtitle="The agent can never run a disabled action">
          <div className="stack-sm">
            {data.actionIds.map((id) => (
              <Toggle key={id} id={`act-${id}`} checked={draft.allowedActions.includes(id)} onChange={(on) => toggleAction(id, on)} label={humanize(id)} />
            ))}
          </div>
        </Card>
        <Card title="AI analysis engine">
          <div className="stack">
            <Segmented
              label="AI provider"
              value={draft.ai.provider}
              onChange={(v) => setDraft((d) => ({ ...d, ai: { ...d.ai, provider: v } }))}
              options={[
                { id: 'local', label: 'Local engine (offline)' },
                { id: 'claude', label: 'Claude (Anthropic)' },
              ]}
            />
            <Field label="Claude model" hint="Used only when the provider is Claude">
              {(a) => <input {...a} className="input" value={draft.ai.model} maxLength={80} onChange={(e) => setDraft((d) => ({ ...d, ai: { ...d.ai, model: e.target.value.trim() } }))} />}
            </Field>
            <div className="small">
              API key: {data.aiKeyConfigured ? <Badge tone="green">configured in server/.env</Badge> : <Badge tone="amber">not set — the local engine will be used</Badge>}
            </div>
            <p className="small muted">The key is read only from the server environment and is never sent to the browser.</p>
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmReset}
        title="Reset all settings to defaults?"
        confirmLabel="Reset"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          try {
            await settingsApi.reset();
            toast.success('Settings reset to defaults');
            setConfirmReset(false);
            reload({ silent: true });
          } catch (err) {
            toast.error('Reset failed', err.message);
          }
        }}
      />
    </>
  );
}
