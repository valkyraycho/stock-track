/**
 * Minimal toast pub/sub.
 *
 * Why not React Context? Toasts are stateless from the consumer's POV —
 * code anywhere can fire `showToast(...)` without caring if a provider is
 * mounted. A module-level emitter keeps call sites trivial. ToastContainer
 * subscribes and renders the list.
 */

export type Toast = {
  id: string;
  message: string;
  /** Optional action button rendered on the right side (e.g. Undo). */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before auto-dismiss. 0 = persistent. Default 5000. */
  durationMs?: number;
  /** Visual tint. */
  tone?: "neutral" | "success" | "warning" | "danger";
};

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

export function showToast(t: Omit<Toast, "id">): string {
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const toast: Toast = { id, durationMs: 5000, tone: "neutral", ...t };
  toasts = [toast, ...toasts].slice(0, 5); // cap at 5 visible
  emit();
  if (toast.durationMs && toast.durationMs > 0) {
    setTimeout(() => dismissToast(id), toast.durationMs);
  }
  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn);
  fn(toasts);
  return () => {
    listeners.delete(fn);
  };
}
