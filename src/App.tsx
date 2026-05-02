import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "./components/Header";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { AddStockDialog } from "./components/AddStockDialog";
import { StockGrid } from "./components/StockGrid";
import { EmptyState } from "./components/EmptyState";
import { TickerTape } from "./components/TickerTape";
import { ToastContainer } from "./components/ToastContainer";
import { MarketClockBanner } from "./components/MarketClockBanner";
import { MarketIndices } from "./components/MarketIndices";
import { SortControls, type SortKey } from "./components/SortControls";
import { StockDetailModal } from "./components/StockDetailModal";
import { useFavorites } from "./hooks/useFavorites";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { profile2, quote } from "./lib/finnhub";
import { showToast } from "./lib/toast";
import type { Favorite } from "./types";

export default function App() {
  const [storedKey, setStoredKey] = useLocalStorage<string | null>(
    "stock-track:apiKey",
    null
  );
  const envKey = import.meta.env.VITE_FINNHUB_API_KEY || null;
  const token = storedKey || envKey;

  const { favorites, add, remove, has } = useFavorites();

  const [addOpen, setAddOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [openSymbol, setOpenSymbol] = useState<string | null>(null);
  const [sortKey, setSortKey] = useLocalStorage<SortKey>(
    "stock-track:sort",
    "recent"
  );

  // Seed quote map: symbol → { dp, c }. Populated by cards as they mount.
  // Kept in a ref + state so we can trigger re-renders only when needed
  // (right now, we just use it inside useMemo, so a setState is fine).
  const [seedMap, setSeedMap] = useState<Record<string, { dp: number; c: number }>>({});
  const recordSeed = useCallback(
    (symbol: string, seed: { dp: number; c: number }) =>
      setSeedMap((prev) => {
        // Only update if changed meaningfully — avoids re-render churn.
        const cur = prev[symbol];
        if (cur && cur.dp === seed.dp && cur.c === seed.c) return prev;
        return { ...prev, [symbol]: seed };
      }),
    []
  );

  const needsKey = !token;

  /**
   * Sorted view of favorites. We sort a copy — never mutate the stored
   * array — so "recent" (original localStorage order) remains intact.
   */
  const sortedFavorites = useMemo(() => {
    const list = favorites.slice();
    if (sortKey === "alpha") {
      list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else if (sortKey === "change") {
      list.sort((a, b) => {
        const da = seedMap[a.symbol]?.dp ?? -Infinity;
        const db = seedMap[b.symbol]?.dp ?? -Infinity;
        return db - da;
      });
    }
    // "recent" = original order (newest first; useFavorites prepends on add).
    return list;
  }, [favorites, sortKey, seedMap]);

  // --- Delete with undo via toast --------------------------------------------
  //
  // We want the user to be able to click X, see the card disappear, and
  // get a 5s window to change their mind. The trick is re-inserting at the
  // *same index* on undo (otherwise undo would move the card to the top).
  // We capture the favorite + its index before removing.
  const lastRemovedRef = useRef<{
    fav: Favorite;
    index: number;
    // Snapshot the seed so sort-by-change doesn't jump after undo.
    seed?: { dp: number; c: number };
  } | null>(null);

  const removeWithUndo = useCallback(
    (symbol: string) => {
      const idx = favorites.findIndex((f) => f.symbol === symbol);
      if (idx < 0) return;
      const fav = favorites[idx];
      lastRemovedRef.current = {
        fav,
        index: idx,
        seed: seedMap[symbol],
      };
      remove(symbol);
      showToast({
        message: `Removed ${symbol}`,
        tone: "neutral",
        durationMs: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            const payload = lastRemovedRef.current;
            if (!payload || payload.fav.symbol !== symbol) return;
            // Re-add preserves current timestamp; the index restoration
            // is only visible when sort is "recent". For other sorts, the
            // card sits wherever the sort would place it.
            add(payload.fav);
            if (payload.seed) recordSeed(symbol, payload.seed);
            lastRemovedRef.current = null;
          },
        },
      });
    },
    [add, favorites, remove, seedMap, recordSeed]
  );

  // --- Quick-add from EmptyState chips ---------------------------------------
  const quickAdd = useCallback(
    async (symbol: string) => {
      if (!token) return;
      if (has(symbol)) return;
      try {
        const [prof] = await Promise.all([
          profile2(symbol, token).catch(() => null),
          quote(symbol, token).catch(() => null),
        ]);
        const fav: Favorite = {
          symbol,
          name: prof?.name || symbol,
          logo: prof?.logo || "",
          addedAt: new Date().toISOString(),
        };
        if (prof) {
          try {
            localStorage.setItem(
              `stock-track:profile:${symbol}`,
              JSON.stringify(prof)
            );
          } catch {
            /* noop */
          }
        }
        add(fav);
      } catch {
        /* noop */
      }
    },
    [token, has, add]
  );

  // Global shortcut: "a" opens add dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "a" && !e.metaKey && !e.ctrlKey) setAddOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openFavorite = sortedFavorites.find((f) => f.symbol === openSymbol) ??
    favorites.find((f) => f.symbol === openSymbol) ??
    null;

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="atmosphere" />
      <div className="grid-overlay" />
      <div className="grain-overlay" />

      <Header
        onAdd={() => setAddOpen(true)}
        onOpenSettings={() => setKeyModalOpen(true)}
        favoritesCount={favorites.length}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10 md:py-14">
        <MarketClockBanner />
        {token && <MarketIndices token={token} />}

        {favorites.length > 0 && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone-400">
                — watchlist //
              </div>
              <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Tracking{" "}
                <span className="text-[var(--color-lime)]">
                  {favorites.length}
                </span>{" "}
                {favorites.length === 1 ? "ticker" : "tickers"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <SortControls value={sortKey} onChange={setSortKey} />
              <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-400 md:flex">
                press <Kbd>a</Kbd> to add
              </div>
            </div>
          </div>
        )}

        {favorites.length === 0 ? (
          <EmptyState
            onAdd={() => setAddOpen(true)}
            onQuickAdd={(s) => void quickAdd(s)}
          />
        ) : (
          token && (
            <StockGrid
              favorites={sortedFavorites}
              token={token}
              onRemove={removeWithUndo}
              onOpen={(s) => setOpenSymbol(s)}
              onSeed={recordSeed}
            />
          )
        )}
      </main>

      {token && <TickerTape favorites={favorites} token={token} />}

      <ToastContainer />

      {(needsKey || keyModalOpen) && (
        <ApiKeyModal
          initialValue={storedKey ?? envKey ?? ""}
          onSave={(k) => {
            setStoredKey(k);
            setKeyModalOpen(false);
          }}
          onCancel={needsKey ? undefined : () => setKeyModalOpen(false)}
        />
      )}

      {token && (
        <AddStockDialog
          token={token}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdd={add}
          isAlreadyAdded={has}
        />
      )}

      {token && openFavorite && (
        <StockDetailModal
          favorite={openFavorite}
          token={token}
          onClose={() => setOpenSymbol(null)}
          onRemove={removeWithUndo}
        />
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-bone-200">
      {children}
    </kbd>
  );
}
