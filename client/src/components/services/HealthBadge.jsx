import { HEALTH } from '../../utils/constants.js';

export function HealthBadge({ health }) {
  const meta = HEALTH[health] || HEALTH.unknown;
  return (
    <span className={`badge badge-${meta.tone}`}>
      <span className={`dot dot-${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}
