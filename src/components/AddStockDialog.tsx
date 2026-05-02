import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Loader2, TrendingUp } from "lucide-react";
import { search as finnhubSearch, quote, profile2 } from "../lib/finnhub";
import type { Favorite, SearchResult } from "../types";

type Props = {
  token: string;
  open: boolean;
  onClose: () => void;
  onAdd: (fav: Favorite) => void;
  isAlreadyAdded: (symbol: string) => boolean;
};

/**
 * Add-stock search dialog.
 * - Debounced input (220 ms) to avoid hammering /search on every keystroke.
 * - Arrow key navigation + enter to select — finance users live in keyboards.
 * - Selecting fetches profile + quote in parallel, then calls onAdd().
 */
export function AddStockDialog({
  token,
  open,
  onClose,
  onAdd,
  isAlreadyAdded,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refocus input every time the dialog opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Reset transient state when closed so the next open starts clean.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
      setActiveIdx(0);
    }
  }, [open]);

  // Debounced search. Using a ref-captured latest query avoids stale closures.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const rs = await finnhubSearch(query, token);
        setResults(rs);
        setActiveIdx(0);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(id);
  }, [query, token]);

  const addEntry = useMemo(
    () => async (r: SearchResult) => {
      if (isAlreadyAdded(r.symbol)) {
        onClose();
        return;
      }
      setAdding(r.symbol);
      try {
        // Fetch profile + quote in parallel — both are cheap and independent.
        // Quote isn't used directly here (StockCard refetches its own on mount)
        // but a failing /quote here is a good early signal that the symbol
        // is tradable & the key works for this endpoint.
        const [prof] = await Promise.all([
          profile2(r.symbol, token).catch(() => null),
          quote(r.symbol, token).catch(() => null),
        ]);
        const fav: Favorite = {
          symbol: r.symbol,
          name: prof?.name || r.description,
          logo: prof?.logo || "",
          addedAt: new Date().toISOString(),
        };
        // Cache profile for fast re-render next session.
        if (prof) {
          try {
            localStorage.setItem(
              `stock-track:profile:${r.symbol}`,
              JSON.stringify(prof)
            );
          } catch {
            /* storage full — ignore */
          }
        }
        onAdd(fav);
        onClose();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setAdding(null);
      }
    },
    [isAlreadyAdded, onAdd, onClose, token]
  );

  // Keyboard nav
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      void addEntry(results[activeIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-[14vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="glass-strong relative w-full max-w-2xl overflow-hidden rounded-[var(--radius-card)]">
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search className="size-4 text-bone-300" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search symbol or company — try AAPL, MSFT, NVDA…"
            className="flex-1 bg-transparent font-mono text-sm text-bone-50 placeholder:text-bone-400 focus:outline-none"
            spellCheck={false}
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="size-4 animate-spin text-[var(--color-lime)]" />
          )}
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-bone-300">
            esc
          </kbd>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-bone-300 hover:text-bone-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {error && (
            <div className="px-5 py-4 text-sm text-[var(--color-loss)]">
              {error}
            </div>
          )}

          {!error && query && !searching && results.length === 0 && (
            <EmptyHint message="No matching US common stocks." />
          )}

          {!error && !query && <EmptyHint message="Start typing to search." />}

          {results.map((r, i) => {
            const existing = isAlreadyAdded(r.symbol);
            const isActive = i === activeIdx;
            return (
              <button
                key={r.symbol}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => void addEntry(r)}
                disabled={adding !== null}
                className={`flex w-full items-center justify-between gap-4 border-l-2 px-5 py-3 text-left transition ${
                  isActive
                    ? "border-[var(--color-lime)] bg-[var(--color-lime)]/5"
                    : "border-transparent hover:bg-white/5"
                } ${adding ? "cursor-wait" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-semibold text-bone-50">
                      {r.symbol}
                    </span>
                    {existing && (
                      <span className="rounded bg-[var(--color-ember)]/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--color-ember)]">
                        already watching
                      </span>
                    )}
                  </div>
                  <div className="truncate font-sans text-xs text-bone-300">
                    {r.description}
                  </div>
                </div>
                {adding === r.symbol ? (
                  <Loader2 className="size-4 animate-spin text-[var(--color-lime)]" />
                ) : (
                  <TrendingUp
                    className={`size-4 ${
                      isActive
                        ? "text-[var(--color-lime)]"
                        : "text-bone-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bone-400">
          <span>us common stocks · via finnhub /search</span>
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate · <Kbd>↵</Kbd> add
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10 font-mono text-xs uppercase tracking-[0.2em] text-bone-400">
      {message}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] text-bone-300">
      {children}
    </kbd>
  );
}
