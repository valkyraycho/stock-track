import { useCallback, useEffect, useRef, useState } from "react";
import { X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { quote as fetchQuote } from "../lib/finnhub";
import { useFinnhubSocket } from "../hooks/useFinnhubSocket";
import type { Favorite, Quote, TradeTick } from "../types";

type Props = {
  favorite: Favorite;
  token: string;
  index: number;
  onRemove: (symbol: string) => void;
};

const MAX_SPARK_POINTS = 80;

/**
 * Single stock card.
 *
 * Lifecycle:
 *   1. On mount, call /quote once to seed price + previousClose.
 *   2. Subscribe to WebSocket ticks for the symbol.
 *   3. Each tick updates the displayed price, triggers a flash animation,
 *      and pushes a point into the sparkline buffer.
 *
 * The flash class is toggled via ref (not state) to avoid re-rendering the
 * whole card on every tick. The sparkline is an inline SVG path we recompute
 * from an in-memory circular buffer.
 */
export function StockCard({ favorite, token, index, onRemove }: Props) {
  const [seed, setSeed] = useState<Quote | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [sparkPoints, setSparkPoints] = useState<number[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastPriceRef = useRef<number | null>(null);

  // 1) Seed from REST on mount. We intentionally don't retry —
  // the UI stays usable (just without daily % change) if this call fails.
  useEffect(() => {
    let cancelled = false;
    fetchQuote(favorite.symbol, token)
      .then((q) => {
        if (cancelled) return;
        setSeed(q);
        setPrice(q.c);
        lastPriceRef.current = q.c;
        setSparkPoints([q.c]);
      })
      .catch(() => {
        /* card still renders; just shows dashes for derived metrics */
      });
    return () => {
      cancelled = true;
    };
  }, [favorite.symbol, token]);

  // 2) Handle live ticks.
  const onTick = useCallback((tick: TradeTick) => {
    const prev = lastPriceRef.current;
    lastPriceRef.current = tick.p;
    setPrice(tick.p);

    // Append to circular buffer for the sparkline.
    setSparkPoints((pts) => {
      const next = pts.length >= MAX_SPARK_POINTS ? pts.slice(1) : pts.slice();
      next.push(tick.p);
      return next;
    });

    // Flash the card green/red based on direction vs previous tick.
    const el = rootRef.current;
    if (el && prev !== null && tick.p !== prev) {
      const cls = tick.p > prev ? "flash-gain" : "flash-loss";
      el.classList.remove("flash-gain", "flash-loss");
      // Force reflow so the animation restarts if the same class re-applies.
      void el.offsetWidth;
      el.classList.add(cls);
    }
  }, []);

  useFinnhubSocket(token, favorite.symbol, onTick);

  // Derived display values
  const changeAbs = price !== null && seed ? price - seed.pc : null;
  const changePct =
    changeAbs !== null && seed && seed.pc > 0
      ? (changeAbs / seed.pc) * 100
      : null;
  const isUp = changeAbs !== null && changeAbs >= 0;

  return (
    <div
      ref={rootRef}
      className="reveal glass group relative overflow-hidden rounded-[var(--radius-card)] p-5 transition hover:-translate-y-0.5 hover:border-white/20"
      style={{ ["--i" as string]: index.toString() }}
    >
      {/* Remove button */}
      <button
        aria-label={`Remove ${favorite.symbol}`}
        onClick={() => onRemove(favorite.symbol)}
        className="absolute right-3 top-3 rounded-md p-1.5 text-bone-400 opacity-0 transition hover:bg-white/5 hover:text-[var(--color-loss)] group-hover:opacity-100 focus:opacity-100"
      >
        <X className="size-3.5" />
      </button>

      {/* Header row: symbol + company name */}
      <div className="mb-4 flex items-start gap-3">
        {favorite.logo ? (
          <img
            src={favorite.logo}
            alt=""
            className="size-10 shrink-0 rounded-lg bg-white/5 object-cover p-1 ring-1 ring-white/10"
            onError={(e) => {
              // Logos occasionally 404 — hide silently rather than show broken icon.
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 font-mono text-xs font-semibold text-bone-200 ring-1 ring-white/10">
            {favorite.symbol.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl font-bold leading-none tracking-tight text-bone-50">
            {favorite.symbol}
          </div>
          <div className="mt-1 truncate font-sans text-xs text-bone-300">
            {favorite.name}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-medium tracking-tight text-bone-50 tabular">
          {price !== null ? formatPrice(price) : "—.——"}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
          USD
        </span>
      </div>

      {/* Change vs previous close */}
      <div
        className={`flex items-center gap-1.5 font-mono text-sm ${
          changeAbs === null
            ? "text-bone-400"
            : isUp
            ? "text-[var(--color-gain)]"
            : "text-[var(--color-loss)]"
        }`}
      >
        {changeAbs !== null &&
          (isUp ? (
            <ArrowUpRight className="size-4" />
          ) : (
            <ArrowDownRight className="size-4" />
          ))}
        <span className="tabular">
          {changeAbs !== null ? formatSigned(changeAbs) : "—"}
        </span>
        <span className="text-bone-400">·</span>
        <span className="tabular">
          {changePct !== null ? `${formatSigned(changePct, 2)}%` : "—"}
        </span>
      </div>

      {/* Sparkline */}
      <div className="mt-4 h-14">
        <Sparkline points={sparkPoints} up={isUp} />
      </div>

      {/* Bottom stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-bone-400">
        <Stat label="open" value={seed ? formatPrice(seed.o) : "—"} />
        <Stat label="high" value={seed ? formatPrice(seed.h) : "—"} />
        <Stat label="low" value={seed ? formatPrice(seed.l) : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span>{label}</span>
      <span className="text-[13px] font-normal tracking-normal text-bone-100 tabular normal-case">
        {value}
      </span>
    </div>
  );
}

/**
 * Minimalist inline SVG sparkline. No library because the shape is trivial
 * and we don't want another dependency in the bundle. Draws a smooth path
 * plus a subtle gradient fill underneath.
 */
function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) {
    return (
      <div className="h-full w-full rounded bg-gradient-to-b from-white/[0.02] to-transparent" />
    );
  }
  const width = 100;
  const height = 40;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return [x, y] as const;
  });
  const stroke = up ? "var(--color-gain)" : "var(--color-loss)";
  const path = coords
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `spark-${up ? "up" : "dn"}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" />
    </svg>
  );
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSigned(n: number, digits = 2): string {
  const sign = n >= 0 ? "+" : "";
  return (
    sign +
    n.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}
