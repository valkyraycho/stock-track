import { useEffect, useState } from "react";
import { CircleDashed } from "lucide-react";
import { isMarketOpen, nextOpenAt, formatUntil } from "../lib/marketHours";

/**
 * Slim bar shown above the grid when the US equities market is closed.
 * Explains *why* nothing is flashing — eliminates the "is my app broken?"
 * panic for anyone who opens it overnight or on a weekend.
 *
 * Re-evaluates every 30 seconds. We don't need per-second precision; the
 * minute-level granularity is plenty for a "market opens in 2h 14m" label.
 */
export function MarketClockBanner() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (isMarketOpen(now)) return null;

  const openAt = nextOpenAt(now);
  const until = formatUntil(openAt.getTime(), now.getTime());
  const openLocal = openAt.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="glass-strong mb-6 flex items-center gap-3 rounded-xl px-4 py-2.5 ring-1 ring-[var(--color-ember)]/30">
      <div className="flex size-6 items-center justify-center rounded-full bg-[var(--color-ember)]/15">
        <CircleDashed className="size-3.5 text-[var(--color-ember)]" />
      </div>
      <div className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-0">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ember)]">
          US markets closed
        </span>
        <span className="font-sans text-sm text-bone-200">
          Live ticks resume{" "}
          <span className="font-semibold text-bone-50">{openLocal}</span>{" "}
          <span className="text-bone-400">({until})</span>
        </span>
      </div>
      <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400 md:inline">
        09:30 ET · M–F
      </span>
    </div>
  );
}
