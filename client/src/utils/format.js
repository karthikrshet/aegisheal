/** Human friendly duration, e.g. 950 -> "950 ms", 12400 -> "12.4 s", 125000 -> "2m 5s". */
export function formatDuration(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return '—';
  const n = Number(ms);
  if (n < 1000) return `${Math.round(n)} ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)} s`;
  const m = Math.floor(n / 60000);
  const s = Math.round((n % 60000) / 1000);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** "just now", "5 min ago", "3 h ago", or a date for older values. */
export function timeAgo(value, now = Date.now()) {
  if (!value) return '—';
  const t = typeof value === 'number' ? value : new Date(value).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Math.max(0, now - t) / 1000;
  if (diff < 10) return 'just now';
  if (diff < 60) return `${Math.floor(diff)} s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}

export function formatTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' });
}

export function formatPercent(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatNumber(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** "SERVICE_DOWN" -> "Service down", "rollback-deployment" -> "Rollback deployment". */
export function humanize(value) {
  if (!value) return '';
  const s = String(value).replace(/[_-]+/g, ' ').toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?'
  );
}
