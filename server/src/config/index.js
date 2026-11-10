import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..', '..');

// server/.env wins; a .env in the repository root is also read (handy for Docker Compose users).
// Real environment variables always take precedence over both files.
dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });
dotenv.config({ path: path.join(SERVER_ROOT, '..', '.env'), quiet: true });

const toInt = (fallback) =>
  z.preprocess((v) => (v === undefined || v === '' ? fallback : Number(v)), z.number().int());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // API_PORT (not PORT) so tools that export PORT for other apps never collide with the API.
  API_PORT: toInt(4000).pipe(z.number().min(1).max(65535)),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('8h'),
  DATA_DIR: z.string().default('./data'),
  SERVICE_BASE_PORT: toInt(5101).pipe(z.number().min(1024).max(65000)),
  MONITOR_INTERVAL_MS: toInt(2000).pipe(z.number().min(500).max(60000)),
  AGENT_MODE: z.enum(['autonomous', 'supervised', 'observe']).default('autonomous'),
  ADMIN_NAME: z.string().default('Administrator'),
  ADMIN_EMAIL: z.string().email().default('admin@aegisheal.local'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@12345'),
  AI_PROVIDER: z.enum(['local', 'claude']).default('local'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-opus-5-5'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  // Secure cookies need HTTPS. Defaults to true in production; set false for plain-HTTP LAN demos.
  COOKIE_SECURE: z.enum(['true', 'false', 'auto']).default('auto'),
});

/**
 * Development convenience: generate a strong secret once and keep it in the
 * (git-ignored) data folder so sessions survive server restarts.
 */
function devSecret(dataDir) {
  const file = path.join(dataDir, '.jwt-secret');
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= 64) return existing;
  } catch {
    /* not created yet */
  }
  const secret = crypto.randomBytes(48).toString('hex');
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
  } catch {
    /* read-only disk: fall back to a per-process secret */
  }
  return secret;
}

function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}\nCheck server/.env (see .env.example).`);
  }
  const c = parsed.data;

  let jwtSecret = c.JWT_SECRET;
  const weak = !jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('change-me');
  if (weak) {
    if (c.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set to 32+ random characters in production.');
    }
    jwtSecret = c.NODE_ENV === 'test' ? crypto.randomBytes(48).toString('hex') : devSecret(path.resolve(SERVER_ROOT, c.DATA_DIR));
  }

  return Object.freeze({
    env: c.NODE_ENV,
    isProd: c.NODE_ENV === 'production',
    isTest: c.NODE_ENV === 'test',
    port: c.API_PORT,
    clientOrigin: c.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
    jwtSecret,
    jwtSecretGenerated: weak,
    jwtExpiresIn: c.JWT_EXPIRES_IN,
    dataDir: path.resolve(SERVER_ROOT, c.DATA_DIR),
    serviceBasePort: c.SERVICE_BASE_PORT,
    monitorIntervalMs: c.MONITOR_INTERVAL_MS,
    agentMode: c.AGENT_MODE,
    admin: { name: c.ADMIN_NAME, email: c.ADMIN_EMAIL.toLowerCase(), password: c.ADMIN_PASSWORD },
    ai: {
      provider: c.AI_PROVIDER,
      apiKey: c.ANTHROPIC_API_KEY || '',
      model: c.AI_MODEL,
    },
    logLevel: c.LOG_LEVEL,
    cookieSecure: c.COOKIE_SECURE === 'auto' ? c.NODE_ENV === 'production' : c.COOKIE_SECURE === 'true',
  });
}

export const config = loadConfig();
export { loadConfig };
