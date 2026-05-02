import { useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";

type Props = {
  open: boolean;
  title: string;
  /** Body can be a plain string or rich JSX (e.g. bolded counts). */
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styling (red accents). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Reusable confirmation modal.
 *
 * Used for genuinely destructive actions that fan out to multiple objects
 * (tag-delete-globally, bulk-remove). For single-object reversible actions
 * (remove one stock), we still prefer the Undo toast pattern — confirm
 * dialogs interrupt the flow for no reason when undo is available.
 *
 * Rules of thumb for when to use this over a toast:
 *   - The action affects more than one object.
 *   - The user may not realize how many objects are affected.
 *   - The blast radius needs to be visible BEFORE the action fires.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass = destructive
    ? "bg-[var(--color-loss)] text-white hover:bg-[#ff4f82]"
    : "bg-[var(--color-lime)] text-ink-950 hover:bg-[#d4ff6b]";

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onCancel}
      />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        className="glass-strong relative z-10 w-full max-w-md overflow-hidden rounded-[var(--radius-card)]"
      >
        <div className="flex items-start gap-3 p-6">
          {destructive && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-loss)]/15 ring-1 ring-[var(--color-loss)]/40">
              <AlertTriangle className="size-4 text-[var(--color-loss)]" />
            </div>
          )}
          <div className="flex-1">
            <h2
              id="confirm-title"
              className="font-display text-lg font-semibold leading-tight tracking-tight text-bone-50"
            >
              {title}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-bone-200">
              {body}
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1 text-bone-400 hover:text-bone-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-white/[0.02] px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300 hover:text-bone-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] transition ${confirmClass}`}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
