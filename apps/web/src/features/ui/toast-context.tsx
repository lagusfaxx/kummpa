"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
  dismissToast: (id: string) => void;
}

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200/90 bg-white text-slate-900",
  error: "border-rose-200/90 bg-white text-slate-900",
  info: "border-sky-200/90 bg-white text-slate-900",
  warning: "border-amber-200/90 bg-white text-slate-900"
};

const dotClasses: Record<ToastTone, string> = {
  success: "bg-emerald-500",
  error: "bg-rose-500",
  info: "bg-sky-500",
  warning: "bg-amber-500"
};

const labelClasses: Record<ToastTone, string> = {
  success: "text-emerald-700",
  error: "text-rose-700",
  info: "text-sky-700",
  warning: "text-amber-700"
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ durationMs = 4200, tone = "info", ...input }: ToastInput) => {
      const id = createToastId();
      setToasts((current) => [...current.slice(-2), { ...input, durationMs, tone, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] md:justify-end md:pb-6">
        <div className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((toast) => {
            const tone = toast.tone ?? "info";

            return (
              <section
                key={toast.id}
                className={`pointer-events-auto rounded-[1.5rem] border p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur ${toneClasses[tone]}`}
                role="status"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotClasses[tone]}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${labelClasses[tone]}`}>
                      {tone}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{toast.title}</p>
                    {toast.description && (
                      <p className="mt-1 text-sm leading-5 text-slate-600">{toast.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition active:scale-[0.98]"
                  >
                    Cerrar
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
