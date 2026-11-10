export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const nowIso = () => new Date().toISOString();

/** Reject if `promise` does not settle within `ms`. */
export function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function msSince(iso) {
  return Date.now() - new Date(iso).getTime();
}
