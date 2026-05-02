import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { dismissToast, subscribeToasts, type Toast } from "../lib/toast";

/**
 * Bottom-right stack of toasts.
 * - Each toast is rendered with an entry animation.
 * - Click the action button to trigger its handler (e.g. Undo).
 * - Click X to dismiss early.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => subscribeToasts(setToasts), []);

  return (
    <div className="pointer-events-none fixed bottom-16 right-6 z-[60] flex w-[320px] flex-col items-end gap-2">
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastRow({ toast }: { toast: Toast }) {
  const toneRing = {
    neutral: "ring-white/10",
    success: "ring-[var(--color-gain)]/30",
    warning: "ring-[var(--color-ember)]/40",
    danger: "ring-[var(--color-loss)]/40",
  }[toast.tone ?? "neutral"];

  return (
    <div
      className={`glass-strong pointer-events-auto flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${toneRing}`}
      style={{ animation: "toast-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
    >
      <span className="flex-1 text-bone-100">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            dismissToast(toast.id);
          }}
          className="rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-lime)] hover:bg-[var(--color-lime)]/10"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => dismissToast(toast.id)}
        className="rounded p-1 text-bone-400 hover:text-bone-100"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
