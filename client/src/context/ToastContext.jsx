import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';

const ToastContext = createContext(null);
const ICONS = { success: FiCheckCircle, error: FiXCircle, warning: FiAlertTriangle, info: FiInfo };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, title, message) => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-3), { id, type, title, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4500);
      return id;
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (title, msg) => push('success', title, msg),
      error: (title, msg) => push('error', title, msg),
      warning: (title, msg) => push('warning', title, msg),
      info: (title, msg) => push('info', title, msg),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || FiInfo;
          return (
            <div key={t.id} className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <Icon aria-hidden />
              <div className="grow">
                <div className="toast-title">{t.title}</div>
                {t.message && <div className="small muted">{t.message}</div>}
              </div>
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <FiX />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
