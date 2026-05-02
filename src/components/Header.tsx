import { Plus, Settings2, HelpCircle } from "lucide-react";
import { useFinnhubConnectionState } from "../hooks/useFinnhubSocket";
import { PortfolioSummary } from "./PortfolioSummary";
import type { Favorite } from "../types";

type Props = {
  onAdd: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  favoritesCount: number;
  favorites: Favorite[];
};

/**
 * Top bar. The visual anchor of the app.
 * Holds the brand, connection status, a live clock, and the primary action.
 */
export function Header({
  onAdd,
  onOpenSettings,
  onOpenHelp,
  favoritesCount,
  favorites,
}: Props) {
  const connState = useFinnhubConnectionState();
  const isLive = connState === "open";

  return (
    <header className="sticky top-0 z-40">
      <div className="glass border-x-0 border-t-0 px-6 py-4 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          {/* Brand block */}
          <div className="flex items-center gap-5">
            <Wordmark />
            <span className="hidden h-8 w-px bg-white/10 md:block" />
            <ConnectionBadge live={isLive} state={connState} />
            <span className="hidden h-8 w-px bg-white/10 md:block" />
            <LiveClock className="hidden md:flex" />
            <PortfolioSummary favorites={favorites} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="mr-2 hidden font-mono text-[11px] uppercase tracking-[0.2em] text-bone-300 md:block">
              {favoritesCount.toString().padStart(2, "0")}
              <span className="text-bone-400"> / watching</span>
            </div>
            <button
              onClick={onOpenHelp}
              aria-label="Help and shortcuts"
              title="Help (?)"
              className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-bone-200 transition hover:border-white/20 hover:text-bone-50"
            >
              <HelpCircle className="size-4" />
            </button>
            <button
              onClick={onOpenSettings}
              aria-label="Settings"
              className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-bone-200 transition hover:border-white/20 hover:text-bone-50"
            >
              <Settings2 className="size-4" />
            </button>
            <button
              onClick={onAdd}
              className="group inline-flex items-center gap-2 rounded-lg bg-[var(--color-lime)] px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink-950 transition hover:bg-[#d4ff6b]"
            >
              <Plus className="size-4" />
              Add stock
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Display-font brand mark. The double slash is a small terminal flourish. */
function Wordmark() {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-2xl font-bold leading-none tracking-tight">
        STOCK
      </span>
      <span className="translate-y-[-2px] font-mono text-sm text-[var(--color-lime)]">
        //
      </span>
      <span className="font-display text-2xl font-light italic leading-none tracking-tight text-bone-200">
        track
      </span>
    </div>
  );
}

function ConnectionBadge({ live, state }: { live: boolean; state: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`pulse-dot ${live ? "" : "dim"}`} />
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-300">
          {live ? "streaming" : state}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
          finnhub · wss
        </span>
      </div>
    </div>
  );
}

/**
 * Ticks every second. We intentionally build the clock in the render instead
 * of storing the whole Date in state — only the displayed string is stateful,
 * which means no re-render cascade for children.
 */
import { useEffect, useState } from "react";
function LiveClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`items-center gap-2 ${className}`}>
      <span className="font-mono text-lg text-bone-50 tabular">{time}</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
        local
      </span>
    </div>
  );
}

function formatClock(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
