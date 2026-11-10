import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { createLogger } from '../lib/logger.js';
import { sleep, withTimeout } from '../lib/time.js';
import { eventBus } from '../lib/eventBus.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_SCRIPT = path.join(here, 'targets', 'demoService.js');
const log = createLogger('supervisor');

/**
 * DevOps automation layer. Owns the lifecycle of every managed service process:
 * start, stop, restart, deploy a version and roll back to the previous one.
 * It deliberately does NOT auto-restart crashed processes — recovery is the
 * agent's job, so every recovery is analysed, decided, verified and recorded.
 */
export class Supervisor extends EventEmitter {
  constructor({ definitions, basePort, logStore, store }) {
    super();
    this.basePort = basePort;
    this.logStore = logStore;
    this.store = store;
    this.token = crypto.randomBytes(24).toString('hex');
    this.services = new Map();
    this.shuttingDown = false;
    for (const def of definitions) {
      this.services.set(def.id, {
        def,
        port: basePort + def.portOffset,
        child: null,
        status: 'stopped',
        pid: null,
        version: def.stableVersion,
        previousVersion: null,
        lastGoodVersion: def.stableVersion,
        startedAt: null,
        exitCode: null,
        lastExitAt: null,
        restarts: 0,
        expectedExit: false,
      });
    }
  }

  get(id) {
    const svc = this.services.get(id);
    if (!svc) throw Object.assign(new Error(`Unknown service: ${id}`), { status: 404 });
    return svc;
  }

  ids() {
    return [...this.services.keys()];
  }

  snapshot(id) {
    const s = this.get(id);
    return {
      id: s.def.id,
      name: s.def.name,
      description: s.def.description,
      dependency: s.def.dependency,
      tier: s.def.tier,
      port: s.port,
      status: s.status,
      pid: s.pid,
      version: s.version,
      previousVersion: s.previousVersion,
      lastGoodVersion: s.lastGoodVersion,
      nextVersion: s.def.nextVersion,
      startedAt: s.startedAt,
      exitCode: s.exitCode,
      lastExitAt: s.lastExitAt,
      restarts: s.restarts,
    };
  }

  list() {
    return this.ids().map((id) => this.snapshot(id));
  }

  setStatus(svc, status) {
    svc.status = status;
    const snap = this.snapshot(svc.def.id);
    this.emit('status', snap);
    eventBus.publish('service', snap);
  }

  async start(id) {
    const svc = this.get(id);
    if (svc.child) return this.snapshot(id);
    svc.expectedExit = false;
    svc.exitCode = null;
    this.setStatus(svc, 'starting');

    const child = spawn(process.execPath, [SERVICE_SCRIPT], {
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        SERVICE_ID: svc.def.id,
        SERVICE_NAME: svc.def.name,
        PORT: String(svc.port),
        VERSION: svc.version,
        BUGGY_VERSIONS: svc.def.buggyVersions.join(','),
        DEPENDENCY: svc.def.dependency,
        AEGIS_TOKEN: this.token,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    svc.child = child;
    svc.pid = child.pid;
    svc.startedAt = new Date().toISOString();

    readline.createInterface({ input: child.stdout }).on('line', (l) => this.logStore.ingest(id, l));
    readline.createInterface({ input: child.stderr }).on('line', (l) => this.logStore.add(id, 'error', l));

    child.on('exit', (code, signal) => {
      svc.child = null;
      svc.pid = null;
      svc.exitCode = code;
      svc.lastExitAt = new Date().toISOString();
      if (svc.expectedExit || this.shuttingDown) {
        this.setStatus(svc, 'stopped');
      } else {
        this.logStore.add(id, 'fatal', `Process exited unexpectedly (code=${code}, signal=${signal || 'none'})`);
        log.warn(`${id} exited unexpectedly`, { code, signal });
        this.setStatus(svc, 'crashed');
        this.emit('crash', this.snapshot(id));
      }
    });
    child.on('error', (err) => {
      this.logStore.add(id, 'fatal', `Failed to spawn process: ${err.message}`);
    });

    const ready = await this.waitUntilListening(svc, 6000);
    if (svc.child === child) this.setStatus(svc, ready ? 'running' : 'unhealthy');
    return this.snapshot(id);
  }

  async waitUntilListening(svc, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!svc.child) return false;
      try {
        const res = await fetch(`http://127.0.0.1:${svc.port}/metrics`, { signal: AbortSignal.timeout(500) });
        if (res.ok) return true;
      } catch {
        /* not up yet */
      }
      await sleep(150);
    }
    return false;
  }

  async stop(id) {
    const svc = this.get(id);
    if (!svc.child) {
      if (svc.status !== 'stopped') this.setStatus(svc, 'stopped');
      return this.snapshot(id);
    }
    svc.expectedExit = true;
    this.setStatus(svc, 'stopping');
    const child = svc.child;
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill('SIGTERM');
    try {
      await withTimeout(exited, 3000, 'graceful stop');
    } catch {
      child.kill('SIGKILL');
      await withTimeout(exited, 2000, 'forced stop').catch(() => {});
    }
    return this.snapshot(id);
  }

  async restart(id) {
    const svc = this.get(id);
    await this.stop(id);
    svc.restarts += 1;
    this.logStore.add(id, 'info', `[aegis] Restarting ${svc.def.name} (restart #${svc.restarts})`);
    return this.start(id);
  }

  async deploy(id, version, actor = 'system') {
    const svc = this.get(id);
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+([-.\w]*)$/.test(version)) {
      throw Object.assign(new Error('Version must look like 1.2.3'), { status: 400 });
    }
    if (version === svc.version) return this.snapshot(id);
    const from = svc.version;
    svc.previousVersion = from;
    svc.version = version;
    this.logStore.add(id, 'info', `[aegis] Deploying ${svc.def.name} ${from} -> ${version} (by ${actor})`);
    this.recordDeployment(id, from, version, 'deploy', actor);
    await this.stop(id);
    return this.start(id);
  }

  async rollback(id, actor = 'agent') {
    const svc = this.get(id);
    const target = svc.lastGoodVersion;
    if (target === svc.version) {
      throw Object.assign(new Error(`Already running last known good version ${target}`), { status: 409 });
    }
    const from = svc.version;
    svc.version = target;
    svc.previousVersion = from;
    this.logStore.add(id, 'info', `[aegis] Rolling back ${svc.def.name} ${from} -> ${target}`);
    this.recordDeployment(id, from, target, 'rollback', actor);
    await this.stop(id);
    return this.start(id);
  }

  /** Called after a verified recovery: the running version is proven healthy. */
  markGood(id) {
    const svc = this.get(id);
    svc.lastGoodVersion = svc.version;
  }

  recordDeployment(serviceId, fromVersion, toVersion, kind, actor) {
    this.store?.insert('deployments', { serviceId, fromVersion, toVersion, kind, actor, at: new Date().toISOString() }, 'dep');
  }

  lastDeployment(serviceId) {
    const deps = this.store?.filter('deployments', (d) => d.serviceId === serviceId) || [];
    return deps[deps.length - 1] || null;
  }

  /** Call an authenticated admin/chaos endpoint on the managed process. */
  async callService(id, pathname) {
    const svc = this.get(id);
    if (!svc.child) throw Object.assign(new Error(`${svc.def.name} is not running`), { status: 409 });
    const res = await fetch(`http://127.0.0.1:${svc.port}${pathname}`, {
      method: 'POST',
      headers: { 'x-aegis-token': this.token },
      signal: AbortSignal.timeout(4000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Service returned HTTP ${res.status}`);
    return body.result;
  }

  async startAll() {
    await Promise.all(this.ids().map((id) => this.start(id).catch((e) => log.error(`start ${id} failed`, { e: e.message }))));
  }

  async stopAll() {
    this.shuttingDown = true;
    await Promise.all(this.ids().map((id) => this.stop(id).catch(() => {})));
  }
}
