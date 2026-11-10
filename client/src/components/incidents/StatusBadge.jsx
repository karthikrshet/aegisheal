import { FiAlertOctagon, FiCheckCircle, FiClock, FiEye, FiLoader, FiSearch, FiShield, FiUserCheck, FiXCircle } from 'react-icons/fi';
import { Badge } from '../ui/Badge.jsx';
import { INCIDENT_STATUS } from '../../utils/constants.js';
import { humanize } from '../../utils/format.js';

const ICONS = {
  detected: FiAlertOctagon,
  analyzing: FiSearch,
  awaiting_approval: FiUserCheck,
  recovering: FiLoader,
  verifying: FiShield,
  open: FiEye,
  escalated: FiAlertOctagon,
  resolved: FiCheckCircle,
  rejected: FiXCircle,
};

export function StatusBadge({ status }) {
  const meta = INCIDENT_STATUS[status] || { label: humanize(status), tone: 'gray' };
  return (
    <Badge tone={meta.tone} icon={ICONS[status] || FiClock}>
      {meta.label}
    </Badge>
  );
}
