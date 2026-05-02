import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { AddStockDialog } from "./components/AddStockDialog";
import { StockGrid } from "./components/StockGrid";
import { EmptyState } from "./components/EmptyState";
import { TickerTape } from "./components/TickerTape";
import { useFavorites } from "./hooks/useFavorites";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { profile2, quote } from "./lib/finnhub";
import type { Favorite } from "./types";

/**
 * App root.
 *
 * Key precedence:
 *   1. localStorage value (user-entered, persisted)
 *   2. VITE_FINNHUB_API_KEY from .env.local (dev convenience)
 *   3. null → show ApiKeyModal
 *
 * This means in dev you never have to paste the key; in production (where
 * the env var is absent unless the deployer hardcoded it), each visitor
 * enters their own.
 */
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

  // Prompt for key on first run only if neither localStorage nor env has it.
  const needsKey = !token;

  // Quick-add from EmptyState suggestions — fetches profile/quote on the fly.
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
        /* fail silently — user can retry via search dialog */
      }
    },
    [token, has, add]
  );

  // Global keyboard shortcut: "a" to add. Small power-user touch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "a" && !e.metaKey && !e.ctrlKey) {
        setAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Atmospheric layers */}
      <div className="atmosphere" />
      <div className="grid-overlay" />
      <div className="grain-overlay" />

      <Header
        onAdd={() => setAddOpen(true)}
        onOpenSettings={() => setKeyModalOpen(true)}
        favoritesCount={favorites.length}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10 md:py-14">
        {/* Subtle intro row above the grid */}
        {favorites.length > 0 && (
          <div className="mb-8 flex items-end justify-between gap-4">
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
            <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-400 md:flex">
              press <Kbd>a</Kbd> to add
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
              favorites={favorites}
              token={token}
              onRemove={remove}
            />
          )
        )}
      </main>

      {/* Ticker tape docked to bottom */}
      {token && <TickerTape favorites={favorites} token={token} />}

      {/* Modals */}
      {(needsKey || keyModalOpen) && (
        <ApiKeyModal
          initialValue={storedKey ?? envKey ?? ""}
          onSave={(k) => {
            setStoredKey(k);
            setKeyModalOpen(false);
          }}
          onCancel={
            needsKey
              ? undefined
              : () => setKeyModalOpen(false)
          }
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
