import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useFinnhubSocket } from "../hooks/useFinnhubSocket";
import { quote as fetchQuote } from "../lib/finnhub";
import { NewsPanel } from "./NewsPanel";
import { PositionEditor } from "./PositionEditor";
import { TagEditor } from "./TagEditor";
import type { Favorite, Position, Profile, Quote, TradeTick } from "../types";
import { formatRelative } from "../lib/marketHours";

type Props = {
  favorite: Favorite;
  token: string;
  onClose: () => void;
  onRemove: (symbol: string) => void;
  onUpdatePosition: (symbol: string, position: Position | undefined) => void;
  onUpdateTags: (symbol: string, tags: string[]) => void;
  allTags: string[];
};

/**
 * Click-a-card detail view.
 *
 * Data strategy:
 *   - Profile (company info) comes from the localStorage cache populated
 *     when the favorite was added. No network call here.
 *   - Seed Quote fetched on open (O/H/L/PC + current price).
 *   - Live sparkline + price via the same shared WS as the grid cards.
 *     Thanks to refcounting, opening the modal just adds another listener —
 *     it doesn't open a new socket.
 */
export function StockDetailModal({
  favorite,
  token,
  onClose,
  onRemove,
  onUpdatePosition,
  onUpdateTags,
  allTags,
}: Props) {
  const [seed, setSeed] = useState<Quote | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [points, setPoints] = useState<number[]>([]);
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef, true);

  // Load cached profile synchronously — we wrote it in AddStockDialog.
  const profile: Profile | null = (() => {
    try {
      const raw = localStorage.getItem(`stock-track:profile:${favorite.symbol}`);
      return raw ? (JSON.parse(raw) as Profile) : null;
    } catch {
      return null;
    }
  })();

  // Seed quote on mount.
  useEffect(() => {
    let cancelled = false;
    fetchQuote(favorite.symbol, token)
      .then((q) => {
        if (cancelled) return;
        setSeed(q);
        setPrice(q.c);
        lastPriceRef.current = q.c;
        // Seed sparkline with known static points so there's visual bulk.
        setPoints([q.pc, q.o, q.l, q.h, q.c]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [favorite.symbol, token]);

  const onTick = useCallback((t: TradeTick) => {
    lastPriceRef.current = t.p;
    setPrice(t.p);
    setLastTickAt(Date.now());
    setPoints((pts) => {
      const next = pts.length >= 180 ? pts.slice(1) : pts.slice();
      next.push(t.p);
      return next;
    });
  }, []);
  useFinnhubSocket(token, favorite.symbol, onTick);

  // Escape closes, background click closes.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const changeAbs = price !== null && seed ? price - seed.pc : null;
  const changePct =
    changeAbs !== null && seed && seed.pc > 0
      ? (changeAbs / seed.pc) * 100
      : null;
  const isUp = changeAbs !== null && changeAbs >= 0;
  const currency = profile?.currency || "USD";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        className="glass-strong relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-card)]"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6 pb-5">
          <div className="flex min-w-0 items-start gap-4">
            {profile?.logo || favorite.logo ? (
              <img
                src={profile?.logo || favorite.logo}
                alt=""
                className="size-14 shrink-0 rounded-xl bg-white/5 object-cover p-1 ring-1 ring-white/10"
                onError={(e) =>
                  ((e.target as HTMLImageElement).style.display = "none")
                }
              />
            ) : null}
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold leading-none tracking-tight">
                  {favorite.symbol}
                </span>
                {profile?.exchange && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
                    {profile.exchange}
                  </span>
                )}
              </div>
              <div className="mt-1.5 truncate font-sans text-sm text-bone-200">
                {profile?.name || favorite.name}
              </div>
              {profile?.finnhubIndustry && (
                <div className="mt-1 font-sans text-xs text-bone-400">
                  {profile.finnhubIndustry}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-bone-300 hover:text-bone-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

        {/* Price block */}
        <div className="flex flex-wrap items-end justify-between gap-6 px-6 pt-6">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-5xl font-medium tracking-tight text-bone-50 tabular">
                {price !== null ? formatPrice(price) : "—.——"}
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-bone-400">
                {currency}
              </span>
            </div>
            <div
              className={`mt-2 flex items-center gap-2 font-mono text-base ${
                changeAbs === null
                  ? "text-bone-400"
                  : isUp
                  ? "text-[var(--color-gain)]"
                  : "text-[var(--color-loss)]"
              }`}
            >
              {changeAbs !== null &&
                (isUp ? (
                  <ArrowUpRight className="size-5" />
                ) : (
                  <ArrowDownRight className="size-5" />
                ))}
              <span className="tabular">
                {changeAbs !== null ? formatSigned(changeAbs) : "—"}
              </span>
              <span className="text-bone-400">·</span>
              <span className="tabular">
                {changePct !== null ? `${formatSigned(changePct, 2)}%` : "—"}
              </span>
              <span className="text-bone-400">today</span>
            </div>
          </div>

          <FreshnessBadge lastTickAt={lastTickAt} />
        </div>

        {/* Big sparkline */}
        <div className="px-6 py-6">
          <BigSpark points={points} up={isUp} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-white/5 px-6 py-5 md:grid-cols-4">
          <Stat label="open" value={seed ? formatPrice(seed.o) : "—"} />
          <Stat label="high" value={seed ? formatPrice(seed.h) : "—"} />
          <Stat label="low" value={seed ? formatPrice(seed.l) : "—"} />
          <Stat label="prev close" value={seed ? formatPrice(seed.pc) : "—"} />
          {profile?.marketCapitalization !== undefined && (
            <Stat
              label="market cap"
              value={formatMarketCap(profile.marketCapitalization)}
            />
          )}
          {profile?.country && <Stat label="country" value={profile.country} />}
          <Stat
            label="added"
            value={new Date(favorite.addedAt).toLocaleDateString()}
          />
        </div>

        {/* Position editor */}
        <PositionEditor
          symbol={favorite.symbol}
          position={favorite.position}
          currentPrice={price}
          onSave={(next) => onUpdatePosition(favorite.symbol, next)}
        />

        {/* Tag editor */}
        <TagEditor
          symbol={favorite.symbol}
          tags={favorite.tags}
          allTags={allTags}
          onSave={(next) => onUpdateTags(favorite.symbol, next)}
        />

        {/* News */}
        <NewsPanel symbol={favorite.symbol} token={token} />

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-4">
          {profile?.weburl ? (
            <a
              href={profile.weburl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-300 hover:text-[var(--color-lime)]"
            >
              <ExternalLink className="size-3" />
              {new URL(profile.weburl).hostname.replace(/^www\./, "")}
            </a>
          ) : (
            <span />
          )}
          <button
            onClick={() => {
              onRemove(favorite.symbol);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-300 transition hover:border-[var(--color-loss)]/50 hover:text-[var(--color-loss)]"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
        {label}
      </span>
      <span className="font-mono text-sm text-bone-100 tabular">{value}</span>
    </div>
  );
}

function FreshnessBadge({ lastTickAt }: { lastTickAt: number | null }) {
  // Tick the displayed relative time every second so "just now" ages naturally.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!lastTickAt) {
    return (
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bone-400">
        <span className="pulse-dot dim" />
        awaiting first tick
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bone-300">
      <span className="pulse-dot" />
      last tick {formatRelative(lastTickAt)}
    </div>
  );
}

function BigSpark({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) {
    return (
      <div className="h-40 rounded-lg bg-gradient-to-b from-white/[0.03] to-transparent" />
    );
  }
  const width = 600;
  const height = 160;
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
  const gradId = `big-spark-${up ? "up" : "dn"}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-40 w-full"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
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

/** Finnhub returns market cap in millions. Convert to short form. */
function formatMarketCap(millions: number): string {
  if (millions >= 1_000_000) return `$${(millions / 1_000_000).toFixed(2)}T`;
  if (millions >= 1_000) return `$${(millions / 1_000).toFixed(2)}B`;
  return `$${millions.toFixed(0)}M`;
}
