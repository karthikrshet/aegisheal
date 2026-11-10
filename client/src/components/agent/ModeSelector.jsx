import { useState } from 'react';
import { FiCpu, FiEye, FiUserCheck } from 'react-icons/fi';
import { Segmented } from '../ui/Segmented.jsx';
import { agentApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { AGENT_MODES } from '../../utils/constants.js';

const ICONS = { autonomous: FiCpu, supervised: FiUserCheck, observe: FiEye };

export function ModeSelector({ mode, canEdit, onChanged }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const options = AGENT_MODES.map((m) => ({ ...m, icon: ICONS[m.id] }));

  const change = async (next) => {
    if (next === mode) return;
    setSaving(true);
    try {
      await agentApi.setMode(next);
      toast.success('Agent mode updated', AGENT_MODES.find((m) => m.id === next)?.description);
      onChanged?.();
    } catch (err) {
      toast.error('Could not change mode', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack-sm">
      <Segmented options={options} value={mode} onChange={change} disabled={!canEdit || saving} label="Agent mode" />
      <span className="small muted">{AGENT_MODES.find((m) => m.id === mode)?.description}</span>
      {!canEdit && <span className="small faint">Only administrators can change the mode.</span>}
    </div>
  );
}
