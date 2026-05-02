import { useEffect, useState } from "react";
import { Bell, BellOff, Trash2, Plus, Check } from "lucide-react";
import type { PriceAlert } from "../types";
import {
  notificationsPermission,
  requestNotificationPermission,
} from "../lib/notifications";
import { showToast } from "../lib/toast";

type Props = {
  symbol: string;
  alerts: PriceAlert[];
  currentPrice: number | null;
  onAdd: (a: Omit<PriceAlert, "id" | "createdAt">) => void;
  onRemove: (id: string) => void;
  onToggleMute: (id: string) => void;
};

/**
 * Alert editor within the detail modal.
 * - Shows existing alerts for this symbol as a list with mute/delete.
 * - Create new: direction + threshold price, with live "above/below
 *   current" validation so users don't set an alert that's already past.
 * - Requests notification permission lazily, only when the user creates
 *   their first alert. If denied, alerts still fire as in-app toasts.
 */
export function AlertEditor({
  symbol,
  alerts,
  currentPrice,
  onAdd,
  onRemove,
  onToggleMute,
}: Props) {
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [thresholdStr, setThresholdStr] = useState("");
  const [perm, setPerm] = useState(notificationsPermission());

  useEffect(() => {
    setThresholdStr("");
  }, [symbol]);

  const threshold = parseFloat(thresholdStr);
  const valid = !Number.isNaN(threshold) && threshold > 0;
  const alreadyPast =
    valid && currentPrice !== null
      ? direction === "above"
        ? currentPrice >= threshold
        : currentPrice <= threshold
      : false;

  const create = async () => {
    if (!valid) return;
    // Lazy permission request on first alert creation.
    if (perm === "default") {
      const next = await requestNotificationPermission();
      setPerm(next);
      if (next !== "granted") {
        showToast({
          message:
            "Notifications blocked — alerts will still show as in-app toasts.",
          tone: "warning",
          durationMs: 5000,
        });
      }
    }
    onAdd({ symbol, direction, threshold });
    setThresholdStr("");
  };

  return (
    <div className="border-t border-white/5 px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="size-3.5 text-[var(--color-lime)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-300">
          price alerts
        </span>
        {perm === "denied" && (
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-ember)]">
            · os notifications blocked
          </span>
        )}
      </div>

      {/* Existing alerts */}
      {alerts.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1.5">
          {alerts.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              onRemove={onRemove}
              onToggleMute={onToggleMute}
            />
          ))}
        </ul>
      )}

      {/* Create form */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass inline-flex items-center rounded-lg p-0.5">
          <DirBtn
            active={direction === "above"}
            onClick={() => setDirection("above")}
          >
            above
          </DirBtn>
          <DirBtn
            active={direction === "below"}
            onClick={() => setDirection("below")}
          >
            below
          </DirBtn>
        </div>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-2.5 font-mono text-xs text-bone-400">
            $
          </span>
          <input
            value={thresholdStr}
            onChange={(e) =>
              setThresholdStr(e.target.value.replace(/[^0-9.]/g, ""))
            }
            placeholder={
              currentPrice !== null ? currentPrice.toFixed(2) : "0.00"
            }
            inputMode="decimal"
            className="w-28 rounded-md border border-white/10 bg-ink-800 py-1.5 pl-5 pr-2.5 font-mono text-sm tabular text-bone-50 placeholder:text-bone-400 focus:border-[var(--color-lime)]/60 focus:outline-none"
          />
        </div>
        <button
          onClick={() => void create()}
          disabled={!valid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-lime)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-950 transition hover:bg-[#d4ff6b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3" />
          add alert
        </button>
        {valid && alreadyPast && (
          <span className="font-mono text-[10px] text-[var(--color-ember)]">
            already {direction === "above" ? "above" : "below"} — will fire on
            next reversal cross.
          </span>
        )}
      </div>
    </div>
  );
}

function DirBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
        active
          ? "bg-[var(--color-lime)]/15 text-[var(--color-lime)]"
          : "text-bone-300 hover:text-bone-100"
      }`}
    >
      {children}
    </button>
  );
}

function AlertRow({
  alert,
  onRemove,
  onToggleMute,
}: {
  alert: PriceAlert;
  onRemove: (id: string) => void;
  onToggleMute: (id: string) => void;
}) {
  const triggered = Boolean(alert.triggeredAt);
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
        triggered
          ? "border-[var(--color-ember)]/40 bg-[var(--color-ember)]/5"
          : alert.muted
          ? "border-white/5 bg-white/[0.02] opacity-60"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="uppercase tracking-[0.2em] text-bone-300">
          {alert.direction}
        </span>
        <span className="text-bone-50 tabular">
          ${alert.threshold.toFixed(2)}
        </span>
        {triggered && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-ember)]/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-[var(--color-ember)]">
            <Check className="size-2.5" />
            triggered
          </span>
        )}
        {alert.muted && !triggered && (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-bone-400">
            muted
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggleMute(alert.id)}
          className="rounded-md p-1.5 text-bone-400 hover:text-bone-100"
          aria-label={alert.muted ? "Unmute alert" : "Mute alert"}
        >
          {alert.muted ? (
            <BellOff className="size-3.5" />
          ) : (
            <Bell className="size-3.5" />
          )}
        </button>
        <button
          onClick={() => onRemove(alert.id)}
          className="rounded-md p-1.5 text-bone-400 hover:text-[var(--color-loss)]"
          aria-label="Remove alert"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
