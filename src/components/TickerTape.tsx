import { useCallback, useEffect, useRef, useState } from "react";
import { useFinnhubSocket } from "../hooks/useFinnhubSocket";
import type { Favorite, TradeTick } from "../types";

type Props = {
  favorites: Favorite[];
  token: string;
};

/**
 * Horizontally scrolling ticker at the bottom of the page.
 * Renders each favorite twice back-to-back so the CSS scroll can loop
 * seamlessly (classic marquee trick — translate -50% at the end).
 *
 * Subscribes to the same shared WebSocket; updates are essentially free
 * thanks to refcounting (StockCard already pays for the subscription).
 */
export function TickerTape({ favorites, token }: Props) {
  if (favorites.length === 0) return null;
  return (
    <div className="glass border-x-0 border-b-0 py-3">
      <div className="relative overflow-hidden">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink-950 to-transparent" />

        <div className="tape flex w-max gap-10 whitespace-nowrap px-6">
          {/* Double the list so -50% translate wraps seamlessly */}
          {[...favorites, ...favorites].map((f, i) => (
            <TickerItem key={`${f.symbol}-${i}`} favorite={f} token={token} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TickerItem({
  favorite,
  token,
}: {
  favorite: Favorite;
  token: string;
}) {
  const [price, setPrice] = useState<number | null>(null);
  const dirRef = useRef<"up" | "down" | null>(null);
  const [, force] = useState(0);

  const onTick = useCallback((t: TradeTick) => {
    setPrice((prev) => {
      if (prev !== null) dirRef.current = t.p >= prev ? "up" : "down";
      return t.p;
    });
    // Force re-render for the flash class change.
    force((n) => n + 1);
    // Reset direction after 600ms so the tint fades to neutral.
    setTimeout(() => {
      dirRef.current = null;
      force((n) => n + 1);
    }, 600);
  }, []);

  useFinnhubSocket(token, favorite.symbol, onTick);

  // On mount, seed from cached profile if available (cheap, no network).
  useEffect(() => {
    // No op — we intentionally show "—" until first tick to keep the tape light.
  }, []);

  const color =
    dirRef.current === "up"
      ? "text-[var(--color-gain)]"
      : dirRef.current === "down"
      ? "text-[var(--color-loss)]"
      : "text-bone-100";

  return (
    <span className="inline-flex items-baseline gap-2 font-mono text-xs">
      <span className="font-semibold text-bone-200">{favorite.symbol}</span>
      <span className={`tabular transition-colors ${color}`}>
        {price !== null
          ? price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "—"}
      </span>
    </span>
  );
}
