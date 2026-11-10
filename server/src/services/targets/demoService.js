/**
 * Managed demo micro-service.
 *
 * Runs as a REAL separate Node.js process started by the Supervisor. It has no
 * dependencies so it starts instantly on any machine. Faults injected through
 * the chaos endpoints genuinely change the process (it really crashes, really
 * leaks memory, really burns CPU), so the AegisHeal agent has to really recover it.
 *
 * Env: SERVICE_ID, SERVICE_NAME, PORT, VERSION, BUGGY_VERSIONS, DEPENDENCY, AEGIS_TOKEN
 */
import http from 'node:http';

const ID = process.env.SERVICE_ID || 'demo';
const PORT = Number(process.env.PORT || 5101);
const VERSION = process.env.VERSION || '1.0.0';
const DEPENDENCY = process.env.DEPENDENCY || 'database';
const TOKEN = process.env.AEGIS_TOKEN || '';
const BUGGY = (process.env.BUGGY_VERSIONS || '').split(',').map((v) => v.trim()).filter(Boolean);
const IS_BUGGY_BUILD = BUGGY.includes(VERSION);

const state = {
  startedAt: Date.now(),
  dependencyConnected: true,
  latencyMs: 0,
  leak: [],
  leakTimer: null,
  cpuTimer: null,
  failedJobs: [],
  jobTimer: null,
  requests: [],
  jobSeq: 1000,
};

// ── structured logging to stdout (captured by the Supervisor) ─────────
function log(level, msg) {
  process.stdout.write(JSON.stringify({ level, msg, ts: new Date().toISOString() }) + '\n');
}

// ── rolling request window for error-rate ─────────────────────────────
function record(ok) {
  state.requests.push(ok ? 1 : 0);
  if (state.requests.length > 50) state.requests.shift();
}
const errorRate = () => {
  if (!state.requests.length) return 0;
  const failures = state.requests.filter((r) => r === 0).length;
  return +(failures / state.requests.length).toFixed(3);
};

// ── CPU measurement ───────────────────────────────────────────────────
let lastCpu = process.cpuUsage();
let lastCpuAt = process.hrtime.bigint();
let cpuPercent = 0;
setInterval(() => {
  const usage = process.cpuUsage(lastCpu);
  const now = process.hrtime.bigint();
  const elapsedUs = Number(now - lastCpuAt) / 1000;
  cpuPercent = Math.min(100, +(((usage.user + usage.system) / elapsedUs) * 100).toFixed(1));
  lastCpu = process.cpuUsage();
  lastCpuAt = now;
}, 1000).unref();

// ── background "business" traffic so the service has realistic logs ──
setInterval(() => {
  if (IS_BUGGY_BUILD && Math.random() < 0.7) {
    record(false);
    log('error', `TypeError: Cannot read properties of undefined (reading 'customerId') at OrderMapper.toDto (build ${VERSION})`);
    return;
  }
  if (!state.dependencyConnected) {
    record(false);
    log('error', `ECONNREFUSED: connection to ${DEPENDENCY} refused (pool exhausted, 0/10 connections alive)`);
    return;
  }
  record(true);
  if (Math.random() < 0.15) log('info', `Processed request batch OK (${Math.floor(Math.random() * 40) + 5} req)`);
}, 1500).unref();

// ── faults ────────────────────────────────────────────────────────────
const faults = {
  crash() {
    log('fatal', 'Unhandled exception: RangeError: Maximum call stack size exceeded at RequestRouter.dispatch');
    setTimeout(() => process.exit(1), 50);
    return 'process will crash';
  },
  'memory-leak'() {
    if (state.leakTimer) return 'already leaking';
    log('warn', 'Session cache eviction disabled: cache is growing without bound');
    state.leakTimer = setInterval(() => {
      state.leak.push(Buffer.alloc(8 * 1024 * 1024, 1)); // 8 MB per tick
      if (state.leak.length % 5 === 0) log('warn', `Session cache grew to ${state.leak.length * 8} MB (no eviction)`);
      if (state.leak.length >= 60) clearInterval(state.leakTimer); // hard safety cap ~480 MB
    }, 400);
    return 'memory leak started';
  },
  'cpu-spike'() {
    if (state.cpuTimer) return 'already spiking';
    log('warn', 'Runaway report-generation worker detected: tight loop in PdfRenderer.layout');
    state.cpuTimer = setInterval(() => {
      const until = Date.now() + 90;
      while (Date.now() < until) Math.sqrt(Math.random() * 1e9);
    }, 100);
    return 'cpu spike started';
  },
  latency() {
    state.latencyMs = 1200;
    log('warn', 'Thread pool saturated: request handling delayed by ~1200 ms (slow query plan cached)');
    return 'latency injected';
  },
  'dependency-loss'() {
    state.dependencyConnected = false;
    log('error', `Lost connection to ${DEPENDENCY}: ECONNRESET, pool marked unhealthy`);
    return 'dependency disconnected';
  },
  'job-failure'() {
    if (state.jobTimer) return 'already failing';
    log('error', 'Upstream timeout: background jobs failing with ETIMEDOUT (transient network issue)');
    state.jobTimer = setInterval(() => {
      const id = ++state.jobSeq;
      state.failedJobs.push(id);
      log('error', `Job #${id} failed: ETIMEDOUT after 3000 ms calling upstream (attempt 1/1, will not auto-retry)`);
      if (state.failedJobs.length >= 12) {
        clearInterval(state.jobTimer);
        state.jobTimer = null;
      }
    }, 500);
    return 'jobs failing';
  },
};

// ── admin (recovery) operations used by the DevOps executor ──────────
const admin = {
  'clear-cache'() {
    const freed = state.leak.length * 8;
    clearInterval(state.leakTimer);
    state.leakTimer = null;
    state.leak = [];
    // Backing stores of freed Buffers are released on the GC *after* the one
    // that finds them unreachable, so collect a few times over the next second.
    if (global.gc) [0, 50, 500].forEach((ms) => setTimeout(() => global.gc(), ms));
    log('info', `Cache cleared, eviction policy re-enabled (${freed} MB released)`);
    return { freedMB: freed };
  },
  reconnect() {
    state.dependencyConnected = true;
    log('info', `Reconnected to ${DEPENDENCY}: pool healthy (10/10 connections)`);
    return { dependency: 'connected' };
  },
  'retry-jobs'() {
    const count = state.failedJobs.length;
    clearInterval(state.jobTimer);
    state.jobTimer = null;
    state.failedJobs = [];
    log('info', `Retried ${count} failed jobs with exponential backoff: all succeeded`);
    return { retried: count };
  },
  throttle() {
    const wasSpiking = Boolean(state.cpuTimer);
    clearInterval(state.cpuTimer);
    state.cpuTimer = null;
    log('info', `Workload throttled: runaway worker ${wasSpiking ? 'terminated' : 'not found'}, concurrency limited to 4`);
    return { throttled: true };
  },
  reset() {
    admin['clear-cache']();
    admin.reconnect();
    admin['retry-jobs']();
    admin.throttle();
    state.latencyMs = 0;
    return { reset: true };
  },
};

// ── HTTP server ───────────────────────────────────────────────────────
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function metrics() {
  const mem = process.memoryUsage();
  return {
    service: ID,
    version: VERSION,
    uptimeSec: Math.round((Date.now() - state.startedAt) / 1000),
    cpuPercent,
    // heap + off-heap buffers: reflects leaks and drops immediately after GC
    memoryMB: +((mem.heapUsed + mem.external) / 1048576).toFixed(1),
    rssMB: +(mem.rss / 1048576).toFixed(1),
    heapUsedMB: +(mem.heapUsed / 1048576).toFixed(1),
    cacheMB: state.leak.length * 8,
    errorRate: errorRate(),
    failedJobs: state.failedJobs.length,
    latencyMs: state.latencyMs,
    dependency: state.dependencyConnected ? 'connected' : 'disconnected',
    pid: process.pid,
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/health') {
    setTimeout(() => {
      if (IS_BUGGY_BUILD && Math.random() < 0.75) {
        record(false);
        return send(res, 500, { status: 'error', version: VERSION, error: 'Internal Server Error' });
      }
      if (!state.dependencyConnected) {
        return send(res, 503, { status: 'degraded', version: VERSION, dependency: 'disconnected' });
      }
      return send(res, 200, { status: 'ok', version: VERSION, dependency: 'connected' });
    }, state.latencyMs);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/metrics') return send(res, 200, metrics());

  // Everything below changes state: require the shared secret from the Supervisor.
  if (req.headers['x-aegis-token'] !== TOKEN || !TOKEN) return send(res, 401, { error: 'unauthorised' });

  if (req.method === 'POST' && parts[0] === 'chaos' && faults[parts[1]]) {
    return send(res, 200, { ok: true, result: faults[parts[1]]() });
  }
  if (req.method === 'POST' && parts[0] === 'admin' && admin[parts[1]]) {
    return send(res, 200, { ok: true, result: admin[parts[1]]() });
  }
  return send(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  log('info', `${process.env.SERVICE_NAME || ID} v${VERSION} listening on 127.0.0.1:${PORT}`);
  if (IS_BUGGY_BUILD) log('warn', `Build ${VERSION} started with migration warnings: field 'customerId' missing in DTO mapping`);
});

server.on('error', (err) => {
  log('fatal', `Cannot bind port ${PORT}: ${err.message}`);
  process.exit(2);
});

process.on('SIGTERM', () => {
  log('info', 'SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
});
