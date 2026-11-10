const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[34m', debug: '\x1b[90m' };
const RESET = '\x1b[0m';

let currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

export function setLogLevel(level) {
  if (level in LEVELS) currentLevel = LEVELS[level];
}

function write(level, scope, message, meta) {
  if (LEVELS[level] > currentLevel) return;
  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length ? ` ${safeJson(meta)}` : '';
  const line = `${ts} ${COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET} [${scope}] ${message}${metaStr}`;
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

function safeJson(value) {
  try {
    return JSON.stringify(value, (_k, v) => (v instanceof Error ? { message: v.message, stack: v.stack } : v));
  } catch {
    return '[unserialisable]';
  }
}

export function createLogger(scope = 'app') {
  return {
    error: (msg, meta) => write('error', scope, msg, meta),
    warn: (msg, meta) => write('warn', scope, msg, meta),
    info: (msg, meta) => write('info', scope, msg, meta),
    debug: (msg, meta) => write('debug', scope, msg, meta),
    child: (sub) => createLogger(`${scope}:${sub}`),
  };
}

export const logger = createLogger('aegis');
