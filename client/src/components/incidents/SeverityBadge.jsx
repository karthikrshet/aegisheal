import { Badge } from '../ui/Badge.jsx';
import { SEVERITY } from '../../utils/constants.js';
import { humanize } from '../../utils/format.js';

export function SeverityBadge({ severity }) {
  const meta = SEVERITY[severity] || { label: humanize(severity), tone: 'gray' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
