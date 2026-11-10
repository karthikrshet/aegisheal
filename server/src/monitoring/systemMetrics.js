import os from 'node:os';

let previous = snapshotCpu();

function snapshotCpu() {
  return os.cpus().reduce(
    (acc, cpu) => {
      const t = cpu.times;
      acc.idle += t.idle;
      acc.total += t.user + t.nice + t.sys + t.idle + t.irq;
      return acc;
    },
    { idle: 0, total: 0 },
  );
}

/** Host-level CPU and memory, cross-platform (works on Windows, macOS, Linux). */
export function readSystemMetrics() {
  const current = snapshotCpu();
  const idle = current.idle - previous.idle;
  const total = current.total - previous.total;
  previous = current;
  const cpuPercent = total > 0 ? +(100 * (1 - idle / total)).toFixed(1) : 0;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  return {
    ts: Date.now(),
    cpuPercent: Math.max(0, Math.min(100, cpuPercent)),
    memoryPercent: +((100 * (totalMem - freeMem)) / totalMem).toFixed(1),
    memoryUsedMB: Math.round((totalMem - freeMem) / 1048576),
    memoryTotalMB: Math.round(totalMem / 1048576),
    cores: os.cpus().length,
    platform: `${os.type()} ${os.release()}`,
    uptimeSec: Math.round(os.uptime()),
    agentMemoryMB: +(process.memoryUsage().rss / 1048576).toFixed(1),
  };
}
