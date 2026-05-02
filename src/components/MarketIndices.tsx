import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { quote as fetchQuote } from "../lib/finnhub";
import { useFinnhubSocket } from "../hooks/useFinnhubSocket";
import type { Quote, TradeTick } from "../types";

type Props = { token: string };

/**
 * Slim always-visible row of the three major US equity ETFs.
 * Why ETFs instead of raw indices (^GSPC, ^IXIC, ^DJI)?
 *   - Finnhub's free WebSocket only streams tradeable US equities. The
 *     index tickers themselves don't tick through trades — they're computed.
 *     SPY / QQQ / DIA proxy the S&P 500, Nasdaq-100, and Dow perfectly
 *     and *are* streamed trade-by-trade.
 *
 * Each cell uses the same seed+WS pattern as StockCard, just rendered
 * compactly. We deliberately do NOT show a sparkline here — at this size
 * it would just be noise.
 */
const INDICES = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
];

export function MarketIndices({ token }: Props) {
  return (
    <div className="glass mb-6 flex flex-wrap items-stretch divide-white/5 overflow-hidden rounded-xl md:divide-x">
      <div className="flex items-center gap-2 px-4 py-3 md:py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
          — indices
        </span>
      </div>
      {INDICES.map((idx) => (
        <IndexCell
          key={idx.symbol}
          symbol={idx.symbol}
          label={idx.label}
          token={token}
        />
      ))}
    </div>
  );
}

function IndexCell({
  symbol,
  label,
  token,
}: {
  symbol: string;
  label: string;
  token: string;
}) {
  const [seed, setSeed] = useState<Quote | null>(null);
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchQuote(symbol, token)
      .then((q) => {
        if (cancelled) return;
        setSeed(q);
        setPrice(q.c);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [symbol, token]);

  const onTick = useCallback((t: TradeTick) => setPrice(t.p), []);
  useFinnhubSocket(token, symbol, onTick);

  const change = price !== null && seed ? price - seed.pc : null;
  const changePct =
    change !== null && seed && seed.pc > 0 ? (change / seed.pc) * 100 : null;
  const isUp = change !== null && change >= 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-2 md:min-w-[180px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-300">
          {symbol}
        </span>
        <span className="truncate font-sans text-[10px] text-bone-400">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-base text-bone-50 tabular">
          {price !== null
            ? price.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "—.——"}
        </span>
        <span
          className={`inline-flex items-center gap-1 font-mono text-xs tabular ${
            change === null
              ? "text-bone-400"
              : isUp
              ? "text-[var(--color-gain)]"
              : "text-[var(--color-loss)]"
          }`}
        >
          {change !== null &&
            (isUp ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            ))}
          {changePct !== null
            ? `${change! >= 0 ? "+" : ""}${changePct.toFixed(2)}%`
            : "—"}
        </span>
      </div>
    </div>
  );
}
