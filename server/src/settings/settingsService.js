import { badRequest } from '../lib/errors.js';
import { eventBus } from '../lib/eventBus.js';
import { defaultSettings, settingsSchema } from './defaults.js';

/** Deep-merge plain objects (arrays are replaced, not merged). */
function merge(base, patch) {
  if (patch === undefined) return base;
  if (Array.isArray(patch) || typeof patch !== 'object' || patch === null) return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) out[k] = merge(base?.[k], v);
  return out;
}

export class SettingsService {
  constructor(store, config) {
    this.store = store;
    this.defaults = defaultSettings(config);
    const saved = store.getDoc('settings');
    const merged = merge(this.defaults, saved || {});
    const parsed = settingsSchema.safeParse(merged);
    this.current = parsed.success ? parsed.data : this.defaults;
    store.setDoc('settings', this.current);
  }

  get() {
    return this.current;
  }

  update(patch) {
    if (!patch || typeof patch !== 'object') throw badRequest('Settings payload must be an object');
    const next = merge(this.current, patch);
    const parsed = settingsSchema.safeParse(next);
    if (!parsed.success) {
      throw badRequest('Invalid settings', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    }
    this.current = parsed.data;
    this.store.setDoc('settings', this.current);
    eventBus.publish('settings', this.current);
    return this.current;
  }

  reset() {
    this.current = structuredClone(this.defaults);
    this.store.setDoc('settings', this.current);
    eventBus.publish('settings', this.current);
    return this.current;
  }
}
