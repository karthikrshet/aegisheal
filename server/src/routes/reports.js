import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const query = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  // Minutes east of UTC (e.g. 330 for IST) so days are bucketed in the viewer's local time.
  tz: z.coerce.number().int().min(-720).max(840).default(0),
});

/** Analytics for the Reports page: trends, failure mix and action effectiveness. */
export function reportRoutes(engine) {
  const { incidents, learning } = engine;
  const r = Router();

  r.get('/summary', validate({ query }), (req, res) => {
    const { days, tz } = req.validQuery;
    const dayKey = (ms) => new Date(ms + tz * 60000).toISOString().slice(0, 10);
    const since = Date.now() - days * 86400000;
    const rows = incidents.all().filter((i) => new Date(i.detectedAt).getTime() >= since);

    const byDay = new Map();
    for (let d = days - 1; d >= 0; d -= 1) {
      const key = dayKey(Date.now() - d * 86400000);
      byDay.set(key, { date: key, incidents: 0, resolved: 0, escalated: 0, mttrTotal: 0, mttrCount: 0 });
    }
    for (const i of rows) {
      const b = byDay.get(dayKey(new Date(i.detectedAt).getTime()));
      if (!b) continue;
      b.incidents += 1;
      if (i.status === 'resolved') b.resolved += 1;
      if (i.status === 'escalated') b.escalated += 1;
      if (i.mttrMs != null) {
        b.mttrTotal += i.mttrMs;
        b.mttrCount += 1;
      }
    }
    const trend = [...byDay.values()].map(({ mttrTotal, mttrCount, ...b }) => ({ ...b, mttrSec: mttrCount ? +(mttrTotal / mttrCount / 1000).toFixed(1) : null }));

    const count = (fn) => {
      const m = {};
      for (const i of rows) {
        const k = fn(i);
        if (k) m[k] = (m[k] || 0) + 1;
      }
      return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    };

    res.json({
      days,
      total: rows.length,
      trend,
      byType: count((i) => i.type),
      byService: count((i) => i.serviceName),
      bySeverity: count((i) => i.severity),
      byRootCause: count((i) => i.analysis?.signatureName),
      byStatus: count((i) => i.status),
      actions: learning.summary(),
    });
  });

  return r;
}
