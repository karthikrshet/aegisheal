import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { makeApp, loginAgent, ADMIN } from './helpers.js';

let app;
let engine;
let admin;

beforeAll(async () => {
  ({ app, engine } = await makeApp());
  admin = await loginAgent(request, app);
  await engine.users.create({ name: 'Viewer', email: 'viewer@test.local', password: 'Viewer123', role: 'viewer' });
  await engine.users.create({ name: 'Operator', email: 'op@test.local', password: 'Operator1', role: 'operator' });
});

describe('public endpoints', () => {
  it('GET /api/health works without auth', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('unknown API routes return JSON 404', async () => {
    const res = await admin.get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('authentication', () => {
  it('rejects protected routes without a session', async () => {
    expect((await request(app).get('/api/services')).status).toBe(401);
    expect((await request(app).get('/api/services').set('Authorization', 'Bearer garbage')).status).toBe(401);
  });

  it('rejects bad credentials with a generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: 'wrong-password1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid e-mail or password');
  });

  it('validates the login payload', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects malformed JSON and non-JSON bodies', async () => {
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(bad.status).toBe(400);
    const form = await request(app).post('/api/auth/login').type('form').send('email=a&password=b');
    expect(form.status).toBe(415);
  });

  it('issues an httpOnly SameSite=Strict cookie and returns the user', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('GET /api/auth/me returns the current user', async () => {
    const res = await admin.get('/api/auth/me');
    expect(res.body.user.email).toBe(ADMIN.email);
  });

  it('logout clears the session cookie', async () => {
    const a = await loginAgent(request, app);
    await a.post('/api/auth/logout');
    expect((await a.get('/api/auth/me')).status).toBe(401);
  });
});

describe('role-based access', () => {
  it('viewers can read but not act', async () => {
    const viewer = await loginAgent(request, app, { email: 'viewer@test.local', password: 'Viewer123' });
    expect((await viewer.get('/api/incidents')).status).toBe(200);
    expect((await viewer.get('/api/agent')).status).toBe(200);
    expect((await viewer.put('/api/agent/mode').send({ mode: 'observe' })).status).toBe(403);
    expect((await viewer.get('/api/users')).status).toBe(403);
    expect((await viewer.get('/api/audit')).status).toBe(403);
    expect((await viewer.put('/api/settings').send({ agentMode: 'observe' })).status).toBe(403);
  });

  it('operators cannot manage users or settings', async () => {
    const op = await loginAgent(request, app, { email: 'op@test.local', password: 'Operator1' });
    expect((await op.get('/api/users')).status).toBe(403);
    expect((await op.post('/api/agent/pause')).status).toBe(403);
  });
});

describe('admin APIs', () => {
  it('updates agent mode with validation', async () => {
    expect((await admin.put('/api/agent/mode').send({ mode: 'supervised' })).body.agent.mode).toBe('supervised');
    expect((await admin.put('/api/agent/mode').send({ mode: 'chaos' })).status).toBe(400);
    await admin.put('/api/agent/mode').send({ mode: 'autonomous' });
  });

  it('validates settings updates', async () => {
    expect((await admin.put('/api/settings').send({ thresholds: { cpuPercent: 75 } })).status).toBe(200);
    const bad = await admin.put('/api/settings').send({ thresholds: { cpuPercent: -1 } });
    expect(bad.status).toBe(400);
    expect((await admin.get('/api/settings')).body.settings.thresholds.cpuPercent).toBe(75);
  });

  it('manages users end to end', async () => {
    const created = await admin.post('/api/users').send({ name: 'New Person', email: 'new@test.local', password: 'Newpass123', role: 'viewer' });
    expect(created.status).toBe(201);
    const id = created.body.user.id;
    expect((await admin.patch(`/api/users/${id}`).send({ role: 'operator' })).body.user.role).toBe('operator');
    expect((await admin.patch(`/api/users/${id}`).send({ evil: true })).status).toBe(400);
    expect((await admin.delete(`/api/users/${id}`)).status).toBe(200);
    expect((await admin.delete(`/api/users/${id}`)).status).toBe(404);
  });

  it('records an audit trail', async () => {
    const res = await admin.get('/api/audit?limit=50');
    expect(res.body.items.some((r) => r.action === 'auth.login')).toBe(true);
    expect(res.body.items.some((r) => r.action === 'user.created')).toBe(true);
  });
});

describe('read APIs', () => {
  it('lists the action and fault catalogue', async () => {
    const res = await admin.get('/api/services/catalog');
    expect(res.body.actions.map((a) => a.id)).toContain('rollback-deployment');
    expect(res.body.faults.map((f) => f.id)).toContain('bad-deploy');
  });

  it('returns playbooks, overview, reports and logs', async () => {
    expect((await admin.get('/api/agent/playbooks')).body.playbooks.length).toBeGreaterThanOrEqual(7);
    expect((await admin.get('/api/metrics/overview')).body).toHaveProperty('mttrMs');
    expect((await admin.get('/api/reports/summary?days=7')).body.trend).toHaveLength(7);
    expect((await admin.get('/api/logs?limit=10')).status).toBe(200);
    expect((await admin.get('/api/reports/summary?days=999')).status).toBe(400);
  });

  it('validates incident ids and filters', async () => {
    expect((await admin.get('/api/incidents/../../etc/passwd')).status).toBe(404);
    expect((await admin.get('/api/incidents/inc_doesnotexist_1')).status).toBe(404);
    expect((await admin.get('/api/incidents?status=bogus')).status).toBe(400);
    expect((await admin.get('/api/incidents?limit=5000')).status).toBe(400);
  });

  it('404s for unknown services', async () => {
    expect((await admin.get('/api/services/ghost-service')).status).toBe(404);
    expect((await admin.post('/api/services/ghost-service/actions/restart-service')).status).toBe(404);
    expect((await admin.post('/api/services/ghost-service/actions/format-disk')).status).toBe(400);
  });
});
