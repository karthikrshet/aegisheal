import { FiActivity, FiAlertTriangle, FiCheckCircle, FiCpu, FiDatabase, FiGitBranch, FiTool } from 'react-icons/fi';
import { PIPELINE_STEPS } from '../../utils/constants.js';

const ICONS = {
  monitor: FiActivity,
  detect: FiAlertTriangle,
  collect: FiDatabase,
  analyze: FiCpu,
  decide: FiGitBranch,
  recover: FiTool,
  verify: FiCheckCircle,
};

/**
 * The agent's 7-step methodology as a live visual pipeline.
 * `steps` comes from an incident; without it every step shows idle.
 */
export function PipelineFlow({ steps, showDetail = true }) {
  const byKey = Object.fromEntries((steps || []).map((s) => [s.key, s]));
  return (
    <ol className="pipeline" aria-label="Agent pipeline" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {PIPELINE_STEPS.map((def, i) => {
        const s = byKey[def.key];
        const status = s?.status || 'pending';
        const Icon = ICONS[def.key];
        return (
          <li key={def.key} className={`pipe-step ${status}`} aria-label={`Step ${i + 1} ${s?.label || def.label}: ${status}`}>
            <div className="pipe-icon" aria-hidden>
              <Icon />
            </div>
            <div className="pipe-num">STEP {i + 1}</div>
            <div className="pipe-label">{s?.label || def.label}</div>
            {showDetail && s?.detail && <div className="pipe-detail" title={s.detail}>{s.detail}</div>}
          </li>
        );
      })}
    </ol>
  );
}
