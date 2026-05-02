import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { getLivePrice, useLivePriceVersion } from "../lib/livePrices";
import type { Favorite } from "../types";

type Props = {
  favorites: Favorite[];
};

/**
 * Header-mounted summary: total value across all positions + total P/L.
 * Subscribes to live prices via useSyncExternalStore (throttled to 250ms
 * in livePrices.ts), so this is effectively the only thing in the app
 * that re-renders on each tick. Cards don't know or care.
 */
export function PortfolioSummary({ favorites }: Props) {
  // Re-render when live prices change (throttled).
  useLivePriceVersion();

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let hasAnyCost = false;
    let anyPositions = false;
    for (const f of favorites) {
      if (!f.position || f.position.shares <= 0) continue;
      anyPositions = true;
      const price = getLivePrice(f.symbol);
      if (price !== undefined) {
        totalValue += price * f.position.shares;
      }
      if (f.position.avgCost) {
        hasAnyCost = true;
        totalCost += f.position.avgCost * f.position.shares;
      }
    }
    return {
      anyPositions,
      totalValue: totalValue || null,
      totalCost: hasAnyCost ? totalCost : null,
      pl: hasAnyCost && totalValue ? totalValue - totalCost : null,
      plPct:
        hasAnyCost && totalValue && totalCost > 0
          ? ((totalValue - totalCost) / totalCost) * 100
          : null,
    };
  }, [favorites]);

  if (!summary.anyPositions) return null;
  const isUp = summary.pl !== null && summary.pl >= 0;

  return (
    <div className="flex items-center gap-3">
      <span className="hidden h-8 w-px bg-white/10 md:block" />
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-bone-400">
          portfolio
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-base text-bone-50 tabular">
            {summary.totalValue !== null
              ? summary.totalValue.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })
              : "—"}
          </span>
          {summary.pl !== null && summary.plPct !== null && (
            <span
              className={`inline-flex items-center gap-0.5 font-mono text-[10px] tabular ${
                isUp ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"
              }`}
            >
              {isUp ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {isUp ? "+" : ""}
              {summary.plPct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
