import { api, qs } from './client.js';

const enc = encodeURIComponent;

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const servicesApi = {
  list: () => api.get('/services'),
  catalog: () => api.get('/services/catalog'),
  get: (id, points = 60) => api.get(`/services/${enc(id)}${qs({ points })}`),
  runAction: (id, actionId) => api.post(`/services/${enc(id)}/actions/${enc(actionId)}`),
  injectFault: (id, fault) => api.post(`/services/${enc(id)}/chaos/${enc(fault)}`),
  deploy: (id, version) => api.post(`/services/${enc(id)}/deploy`, { version }),
  start: (id) => api.post(`/services/${enc(id)}/start`),
  stop: (id) => api.post(`/services/${enc(id)}/stop`),
};

export const incidentsApi = {
  list: (params) => api.get(`/incidents${qs(params)}`),
  get: (id) => api.get(`/incidents/${enc(id)}`),
  approve: (id, actionId) => api.post(`/incidents/${enc(id)}/approve`, actionId ? { actionId } : {}),
  reject: (id, reason) => api.post(`/incidents/${enc(id)}/reject`, reason ? { reason } : {}),
  resolve: (id, note) => api.post(`/incidents/${enc(id)}/resolve`, note ? { note } : {}),
  addNote: (id, text) => api.post(`/incidents/${enc(id)}/notes`, { text }),
  exportUrl: '/api/incidents/export.csv',
};

export const agentApi = {
  state: () => api.get('/agent'),
  setMode: (mode) => api.put('/agent/mode', { mode }),
  pause: () => api.post('/agent/pause'),
  resume: () => api.post('/agent/resume'),
  resetCircuit: (serviceId) => api.post(`/agent/circuits/${enc(serviceId)}/reset`),
  playbooks: () => api.get('/agent/playbooks'),
};

export const metricsApi = {
  overview: () => api.get('/metrics/overview'),
  system: (points = 60) => api.get(`/metrics/system${qs({ points })}`),
};

export const logsApi = {
  query: (params) => api.get(`/logs${qs(params)}`),
};

export const reportsApi = {
  summary: (days = 7) => api.get(`/reports/summary${qs({ days, tz: -new Date().getTimezoneOffset() })}`),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (patch) => api.put('/settings', patch),
  reset: () => api.post('/settings/reset'),
};

export const usersApi = {
  list: () => api.get('/users'),
  create: (user) => api.post('/users', user),
  update: (id, patch) => api.patch(`/users/${enc(id)}`, patch),
  resetPassword: (id, password) => api.post(`/users/${enc(id)}/reset-password`, { password }),
  remove: (id) => api.del(`/users/${enc(id)}`),
};

export const auditApi = {
  list: (params) => api.get(`/audit${qs(params)}`),
};

export const healthApi = {
  get: () => api.get('/health'),
};
