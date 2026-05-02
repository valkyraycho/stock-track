import { useCallback, useEffect, useRef, useState } from "react";
import { X, ArrowUpRight, ArrowDownRight, Wallet, Check } from "lucide-react";
import { quote as fetchQuote } from "../lib/finnhub";
import { useFinnhubSocket } from "../hooks/useFinnhubSocket";
import { setLivePrice } from "../lib/livePrices";
import type { Favorite, Position, Quote, TradeTick } from "../types";
import { formatRelative } from "../lib/marketHours";

type Props = {
  favorite: Favorite;
  token: string;
  index: number;
  onRemove: (symbol: string) => void;
  onOpen: (symbol: string) => void;
  /** Called once when the seed /quote succeeds — App uses this for sorting. */
  onSeed: (symbol: string, seed: { dp: number; c: number }) => void;
  /** Selection mode props. When `selectionActive`, card click toggles
   *  selection instead of opening the detail modal. */
  selectionActive?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (symbol: string) => void;
};

const MAX_SPARK_POINTS = 80;

/**
 * Single stock card.
 *
 * On mount: fetch /quote, seed sparkline with the four static known
 * points (prev close, open, low, high, current), subscribe to WS ticks.
 * On tick: update price via ref-toggled class for flash (no re-render
 * cascade), append to sparkline buffer, update `lastTickAt`.
 *
 * The whole card is a button so keyboard users can Tab to it and press
 * Enter/Space to open the detail modal — same interaction as clicking.
 */
export function StockCard({
  favorite,
  token,
  index,
  onRemove,
  onOpen,
  onSeed,
  selectionActive = false,
  isSelected = false,
  onToggleSelect,
}: Props) {
  const [seed, setSeed] = useState<Quote | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [sparkPoints, setSparkPoints] = useState<number[]>([]);
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const rootRef = useRef<HTMLButtonElement>(null);
  const lastPriceRef = useRef<number | null>(null);
  // Force a re-render every second so the "Xs ago" label updates without
  // touching price state (which would trigger redundant flash logic).
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Seed from /quote.
  useEffect(() => {
    let cancelled = false;
    fetchQuote(favorite.symbol, token)
      .then((q) => {
        if (cancelled) return;
        setSeed(q);
        setPrice(q.c);
        lastPriceRef.current = q.c;
        // Seed sparkline with the four known static points PLUS current —
        // gives the card visual bulk before any live ticks arrive.
        setSparkPoints([q.pc, q.o, q.l, q.h, q.c]);
        setLivePrice(favorite.symbol, q.c);
        // Publish change % so App can sort by it.
        if (q.dp !== null) {
          onSeed(favorite.symbol, { dp: q.dp, c: q.c });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [favorite.symbol, token, onSeed]);

  const onTick = useCallback(
    (t: TradeTick) => {
      const prev = lastPriceRef.current;
      lastPriceRef.current = t.p;
      setPrice(t.p);
      setLivePrice(favorite.symbol, t.p);
      setLastTickAt(Date.now());
      setSparkPoints((pts) => {
        const next = pts.length >= MAX_SPARK_POINTS ? pts.slice(1) : pts.slice();
        next.push(t.p);
        return next;
      });
      const el = rootRef.current;
      if (el && prev !== null && t.p !== prev) {
        const cls = t.p > prev ? "flash-gain" : "flash-loss";
        el.classList.remove("flash-gain", "flash-loss");
        void el.offsetWidth;
        el.classList.add(cls);
      }
    },
    [favorite.symbol]
  );

  useFinnhubSocket(token, favorite.symbol, onTick);

  const changeAbs = price !== null && seed ? price - seed.pc : null;
  const changePct =
    changeAbs !== null && seed && seed.pc > 0
      ? (changeAbs / seed.pc) * 100
      : null;
  const isUp = changeAbs !== null && changeAbs >= 0;

  // Stale = no tick in 60s. Only meaningful if we've ever ticked.
  const isStale = lastTickAt !== null && Date.now() - lastTickAt > 60_000;

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={() =>
        selectionActive
          ? onToggleSelect?.(favorite.symbol)
          : onOpen(favorite.symbol)
      }
      aria-pressed={selectionActive ? isSelected : undefined}
      className={`reveal glass group relative overflow-hidden rounded-[var(--radius-card)] p-5 text-left transition hover:-translate-y-0.5 hover:border-white/20 ${
        isSelected
          ? "ring-2 ring-[var(--color-lime)] ring-offset-2 ring-offset-ink-950"
          : ""
      }`}
      style={{ ["--i" as string]: index.toString() }}
    >
      {/* Selection checkbox — only shown in selection mode */}
      {selectionActive && (
        <span
          aria-hidden="true"
          className={`absolute left-3 top-3 z-10 flex size-5 items-center justify-center rounded-md border transition ${
            isSelected
              ? "border-[var(--color-lime)] bg-[var(--color-lime)]"
              : "border-white/25 bg-ink-900/80"
          }`}
        >
          {isSelected && <Check className="size-3.5 text-ink-950" />}
        </span>
      )}
      {/* Remove — stopPropagation so clicking X doesn't also open detail. */}
      <span
        role="button"
        tabIndex={0}
        aria-label={`Remove ${favorite.symbol}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(favorite.symbol);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            e.preventDefault();
            onRemove(favorite.symbol);
          }
        }}
        className={`absolute right-3 top-3 rounded-md p-1.5 text-bone-400 transition hover:bg-white/5 hover:text-[var(--color-loss)] focus:opacity-100 ${
          selectionActive
            ? "pointer-events-none opacity-0"
            : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <X className="size-3.5" />
      </span>

      {/* Header row */}
      <div className="mb-4 flex items-start gap-3">
        {favorite.logo ? (
          <img
            src={favorite.logo}
            alt=""
            className="size-10 shrink-0 rounded-lg bg-white/5 object-cover p-1 ring-1 ring-white/10"
            onError={(e) => {
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
      <div
        className={`mb-1 flex items-baseline gap-2 transition-opacity ${
          isStale ? "opacity-70" : ""
        }`}
      >
        <span className="font-mono text-3xl font-medium tracking-tight text-bone-50 tabular">
          {price !== null ? formatPrice(price) : "—.——"}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
          USD
        </span>
      </div>

      {/* Change + freshness */}
      <div className="flex items-center justify-between gap-2">
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
        <FreshnessLabel lastTickAt={lastTickAt} isStale={isStale} />
      </div>

      {/* Position row — only when user has entered shares */}
      {favorite.position && favorite.position.shares > 0 && (
        <PositionLine
          position={favorite.position}
          price={price}
        />
      )}

      {/* Sparkline */}
      <div className="mt-4 h-14">
        <Sparkline points={sparkPoints} up={isUp} />
      </div>

      {/* Bottom stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-bone-400">
        <Stat label="open" value={seed ? formatPrice(seed.o) : "—"} />
        <Stat label="high" value={seed ? formatPrice(seed.h) : "—"} />
        <Stat label="low" value={seed ? formatPrice(seed.l) : "—"} />
      </div>

      {/* Tags */}
      {favorite.tags && favorite.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {favorite.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-[var(--color-iris)]/15 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--color-iris)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/**
 * Small "Xs ago / stale" label in the top-right of the change row.
 * Color coding:
 *   - dim: awaiting first tick
 *   - bone-300: fresh (<60s)
 *   - ember: stale (>60s)
 */
function FreshnessLabel({
  lastTickAt,
  isStale,
}: {
  lastTickAt: number | null;
  isStale: boolean;
}) {
  if (!lastTickAt) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
        awaiting
      </span>
    );
  }
  return (
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.2em] ${
        isStale ? "text-[var(--color-ember)]" : "text-bone-300"
      }`}
    >
      {formatRelative(lastTickAt)}
    </span>
  );
}

/**
 * Subtle strip showing "N shares · $value (+$pl, +pct%)" when a position exists.
 * Only shown if shares > 0. P/L only shown if avgCost is set.
 */
function PositionLine({
  position,
  price,
}: {
  position: Position;
  price: number | null;
}) {
  const value = price !== null ? price * position.shares : null;
  const cost = position.avgCost
    ? position.avgCost * position.shares
    : null;
  const pl = value !== null && cost !== null ? value - cost : null;
  const plPct =
    pl !== null && cost !== null && cost > 0 ? (pl / cost) * 100 : null;
  const isUp = pl !== null && pl >= 0;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <Wallet className="size-3 shrink-0 text-[var(--color-lime)]" />
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-300">
        {formatShares(position.shares)} sh
      </span>
      <span className="ml-auto font-mono text-xs text-bone-100 tabular">
        {value !== null
          ? value.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })
          : "—"}
      </span>
      {pl !== null && plPct !== null && (
        <span
          className={`font-mono text-[11px] tabular ${
            isUp ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]"
          }`}
        >
          {isUp ? "+" : ""}
          {plPct.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function formatShares(n: number): string {
  // Allow fractional shares (Robinhood-style). Up to 4 decimals.
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
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
