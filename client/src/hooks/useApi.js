import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data from an API function with loading / error state.
 *   const { data, loading, error, reload, setData } = useApi(() => servicesApi.list(), [])
 * Stale responses from earlier calls are ignored (no race conditions).
 */
export function useApi(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const callId = useRef(0);
  const mounted = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async ({ silent = false } = {}) => {
    const id = ++callId.current;
    if (!silent) setLoading(true);
    try {
      const result = await fnRef.current();
      if (mounted.current && id === callId.current) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (err) {
      if (mounted.current && id === callId.current) setError(err);
      return null;
    } finally {
      if (mounted.current && id === callId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}
