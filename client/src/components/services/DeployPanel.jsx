import { useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import { servicesApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Field } from '../ui/Field.jsx';

const VERSION_RE = /^\d+\.\d+\.\d+([-.][\w.]+)?$/;

export function DeployPanel({ service, disabled, onDeployed }) {
  const toast = useToast();
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const invalid = version && !VERSION_RE.test(version);

  const deploy = async (e) => {
    e.preventDefault();
    if (!VERSION_RE.test(version)) return;
    setBusy(true);
    try {
      await servicesApi.deploy(service.id, version);
      toast.success('Deployment started', `${service.name} → v${version}`);
      setVersion('');
      onDeployed?.();
    } catch (err) {
      toast.error('Deployment failed', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={deploy} className="stack-sm">
      <Field label="Deploy a version" hint={`Current v${service.version}, last known good v${service.lastGoodVersion}. v${service.nextVersion} contains a regression.`} error={invalid ? 'Use semantic versioning, e.g. 1.2.3' : null}>
        {(a11y) => <input {...a11y} className="input" placeholder={service.nextVersion} value={version} onChange={(e) => setVersion(e.target.value.trim())} maxLength={30} disabled={disabled} />}
      </Field>
      <div>
        <Button type="submit" icon={FiUploadCloud} disabled={disabled || !version || invalid} loading={busy}>
          Deploy
        </Button>
      </div>
    </form>
  );
}
