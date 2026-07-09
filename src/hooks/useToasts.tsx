import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { Toast } from "../types";
import { Icon } from "../components/Icon";

interface ToastContextValue {
  pushToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({ pushToast: () => {} });

export function useToasts() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<Toast & { leaving?: boolean }>>([]);
  const nextId = useRef(1);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    }, 3600);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3900);
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="qcx-toast-host" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`qcx-toast tone-${toast.tone} ${toast.leaving ? "leaving" : ""}`}>
            <span className={`qcx-toast-icon tone-${toast.tone}`}><Icon icon={toast.icon} size={18} fill /></span>
            <div>
              <strong>{toast.title}</strong>
              {toast.message ? <p>{toast.message}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
