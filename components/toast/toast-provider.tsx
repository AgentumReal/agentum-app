"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle, X, ExternalLink } from "lucide-react";
import { BSC_TESTNET_EXPLORER } from "@/lib/web3/contracts";

type ToastType = "loading" | "success" | "error";
export type Toast = { id: number; type: ToastType; message: string; txHash?: string };
type ToastInput = { type: ToastType; message: string; txHash?: string };

type Ctx = {
  push: (t: ToastInput) => number;
  update: (id: number, patch: Partial<ToastInput>) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const AUTO_DISMISS_MS = 7000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const scheduleAutoDismiss = useCallback(
    (id: number, type: ToastType) => {
      if (timers.current[id]) clearTimeout(timers.current[id]);
      if (type !== "loading") {
        timers.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      }
    },
    [dismiss],
  );

  const push = useCallback(
    (t: ToastInput) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts, { id, ...t }]);
      scheduleAutoDismiss(id, t.type);
      return id;
    },
    [scheduleAutoDismiss],
  );

  const update = useCallback(
    (id: number, patch: Partial<ToastInput>) => {
      setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (patch.type) scheduleAutoDismiss(id, patch.type);
    },
    [scheduleAutoDismiss],
  );

  return (
    <ToastContext.Provider value={{ push, update, dismiss }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = toast.type === "loading" ? Loader2 : toast.type === "success" ? CheckCircle2 : XCircle;
  const tone =
    toast.type === "success" ? "text-teal" : toast.type === "error" ? "text-danger" : "text-mint";
  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface-2/95 p-3.5 shadow-2xl backdrop-blur">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone} ${toast.type === "loading" ? "animate-spin" : ""}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{toast.message}</p>
        {toast.txHash && (
          <a
            href={`${BSC_TESTNET_EXPLORER}/tx/${toast.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal hover:text-mint"
          >
            View on BscScan <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <button onClick={onClose} className="shrink-0 text-faint hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
