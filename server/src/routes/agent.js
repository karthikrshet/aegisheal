import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import { SIGNATURES, UNKNOWN_SIGNATURE } from '../agent/knowledgeBase.js';
import { describeActions } from '../recovery/actions/index.js';

const modeSchema = z.object({ mode: z.enum(['autonomous', 'supervised', 'observe']) }).strict();
const circuitParam = z.object({ serviceId: z.string().regex(/^[a-z0-9-]{2,40}$/) });

export function agentRoutes(engine) {
  const { agent, settings, audit, learning, guardrails } = engine;
  const r = Router();

  r.get('/', (_req, res) => res.json({ agent: agent.state() }));

  r.put('/mode', requireRole('admin'), validate({ body: modeSchema }), (req, res) => {
    settings.update({ agentMode: req.body.mode });
    audit.record({ actor: req.user.email, action: 'agent.mode', detail: req.body.mode, ip: req.ip });
    agent.note(`Mode changed to ${req.body.mode} by ${req.user.email}`);
    res.json({ agent: agent.state() });
  });

  r.post('/pause', requireRole('admin'), (req, res) => {
    agent.setPaused(true, req.user);
    res.json({ agent: agent.state() });
  });

  r.post('/resume', requireRole('admin'), (req, res) => {
    agent.setPaused(false, req.user);
    res.json({ agent: agent.state() });
  });

  r.post('/circuits/:serviceId/reset', requireRole('admin'), validate({ params: circuitParam }), (req, res) => {
    guardrails.resetCircuit(req.params.serviceId);
    audit.record({ actor: req.user.email, action: 'agent.circuit_reset', target: req.params.serviceId, ip: req.ip });
    res.json({ agent: agent.state() });
  });

  /** Knowledge base + learned statistics (the agent's "playbooks"). */
  r.get('/playbooks', (_req, res) => {
    const actions = describeActions();
    const stats = learning.summary();
    const playbooks = [...SIGNATURES, UNKNOWN_SIGNATURE].map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      rootCause: s.rootCause,
      steps: learning.rank(s.id, s.playbook).map((r) => ({ ...r, ...actions.find((a) => a.id === r.actionId) })),
      stats: stats.filter((x) => x.signatureId === s.id),
    }));
    res.json({ playbooks, actions });
  });

  return r;
}
