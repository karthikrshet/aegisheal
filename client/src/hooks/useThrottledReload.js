import { useCallback, useEffect, useRef } from 'react';

/**
 * Wrap a reload function so bursts of live events trigger at most one
 * silent reload per `wait` ms (keeps the UI fresh without hammering the API).
 */
export function useThrottledReload(reload, wait = 1500) {
  const timer = useRef(null);
  const pending = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(() => {
    if (timer.current) {
      pending.current = true;
      return;
    }
    reload({ silent: true });
    timer.current = setTimeout(() => {
      timer.current = null;
      if (pending.current) {
        pending.current = false;
        reload({ silent: true });
      }
    }, wait);
  }, [reload, wait]);
}
