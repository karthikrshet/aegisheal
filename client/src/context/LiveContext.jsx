import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';

const LiveContext = createContext(null);
const EVENT_TYPES = ['metrics', 'incident', 'agent', 'log', 'service', 'settings', 'audit'];
const MAX_POINTS = 90;

/**
 * Single Server-Sent Events connection shared by the whole app.
 * - keeps a rolling client-side history of metrics for live charts
 * - lets any component subscribe to an event type with useLiveEvent()
 * - reconnects automatically (EventSource retry)
 */
export function LiveProvider({ enabled, children }) {
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState({ system: [], services: {} });
  const listeners = useRef(new Map());

  const subscribe = useCallback((type, fn) => {
    if (!listeners.current.has(type)) listeners.current.set(type, new Set());
    listeners.current.get(type).add(fn);
    return () => listeners.current.get(type)?.delete(fn);
  }, []);

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return undefined;
    const es = new EventSource('/api/events', { withCredentials: true });
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    const handlers = EVENT_TYPES.map((type) => {
      const handler = (e) => {
        let data;
        try {
          data = JSON.parse(e.data);
        } catch {
          return;
        }
        if (type === 'metrics') {
          setMetrics((prev) => {
            const services = { ...prev.services };
            for (const [id, sample] of Object.entries(data.services || {})) {
              services[id] = [...(services[id] || []), sample].slice(-MAX_POINTS);
            }
            return { system: [...prev.system, data.system].slice(-MAX_POINTS), services };
          });
        }
        listeners.current.get(type)?.forEach((fn) => {
          try {
            fn(data);
          } catch {
            /* a broken listener must not break the stream */
          }
        });
      };
      es.addEventListener(type, handler);
      return [type, handler];
    });

    return () => {
      handlers.forEach(([type, h]) => es.removeEventListener(type, h));
      es.close();
      setConnected(false);
    };
  }, [enabled]);

  const value = useMemo(() => ({ connected, metrics, subscribe }), [connected, metrics, subscribe]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used inside <LiveProvider>');
  return ctx;
}

/** Subscribe to one live event type for the lifetime of the component. */
export function useLiveEvent(type, handler) {
  const { subscribe } = useLive();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe(type, (d) => ref.current(d)), [subscribe, type]);
}
