import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);
const toastIcons = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const notify = useCallback((message, options = {}) => {
    const id = ++idRef.current;
    const toast = {
      id,
      message,
      tone: options.tone || "info",
      duration: options.duration ?? 4200,
    };
    setToasts((current) => [...current.slice(-3), toast]);
    if (toast.duration > 0) timersRef.current.set(id, window.setTimeout(() => dismiss(id), toast.duration));
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({
    notify,
    success: (message, options) => notify(message, { ...options, tone: "success" }),
    error: (message, options) => notify(message, { ...options, tone: "error" }),
    info: (message, options) => notify(message, { ...options, tone: "info" }),
    dismiss,
  }), [dismiss, notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-region" aria-label="Notifications">
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.tone] || Info;
          return (
            <div className={`ui-toast ui-toast--${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"} key={toast.id}>
              <Icon size={19} aria-hidden="true" />
              <p>{toast.message}</p>
              <button className="ui-button--icon" type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X size={17} aria-hidden="true" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
