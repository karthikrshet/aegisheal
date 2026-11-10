import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { ACTION_IDS } from '../settings/defaults.js';

export function settingsRoutes(engine) {
  const { settings, audit, config } = engine;
  const r = Router();

  r.get('/', (_req, res) => res.json({ settings: settings.get(), actionIds: ACTION_IDS, aiKeyConfigured: Boolean(config.ai.apiKey) }));

  r.put('/', requireRole('admin'), (req, res) => {
    const updated = settings.update(req.body);
    audit.record({ actor: req.user.email, action: 'settings.updated', detail: Object.keys(req.body || {}).join(', '), ip: req.ip });
    res.json({ settings: updated });
  });

  r.post('/reset', requireRole('admin'), (req, res) => {
    const updated = settings.reset();
    audit.record({ actor: req.user.email, action: 'settings.reset', ip: req.ip });
    res.json({ settings: updated });
  });

  return r;
}
