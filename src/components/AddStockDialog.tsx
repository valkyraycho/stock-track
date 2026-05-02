import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  Loader2,
  TrendingUp,
  Check,
  Tag as TagIcon,
  Plus,
} from "lucide-react";
import { search as finnhubSearch, quote, profile2 } from "../lib/finnhub";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { showToast } from "../lib/toast";
import type { Favorite, SearchResult } from "../types";

type Props = {
  token: string;
  open: boolean;
  onClose: () => void;
  onAdd: (fav: Favorite) => void;
  isAlreadyAdded: (symbol: string) => boolean;
  /** Existing tags — shown as quick-apply chips in the tag-on-add step. */
  allTags: string[];
  /** Called when the user picks or creates a tag for a just-added stock. */
  onTagJustAdded: (symbol: string, tag: string) => void;
};

/**
 * Add-stock search dialog.
 *
 * Key UX change vs v1: after a successful add, the dialog STAYS OPEN.
 * The input clears, focus returns to it, and a toast confirms the add.
 * This makes adding a watchlist of 5+ stocks one continuous flow instead
 * of 5 round-trips through the "click + Add Stock" button.
 *
 * Close only on Esc / the X / backdrop click.
 */
export function AddStockDialog({
  token,
  open,
  onClose,
  onAdd,
  isAlreadyAdded,
  allTags,
  onTagJustAdded,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /** If set, we're in the "tag the just-added stock" interstitial step. */
  const [justAddedSymbol, setJustAddedSymbol] = useState<string | null>(null);
  const [newTagDraft, setNewTagDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
      setActiveIdx(0);
      setJustAddedSymbol(null);
      setNewTagDraft("");
    }
  }, [open]);

  // When we enter the tag-on-add step, focus the new-tag input so the user
  // can immediately start typing a new tag if none of the chips fit.
  useEffect(() => {
    if (justAddedSymbol) tagInputRef.current?.focus();
  }, [justAddedSymbol]);

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
        showToast({
          message: `${r.symbol} is already in your watchlist`,
          tone: "warning",
          durationMs: 3000,
        });
        return;
      }
      setAdding(r.symbol);
      try {
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
        if (prof) {
          try {
            localStorage.setItem(
              `stock-track:profile:${r.symbol}`,
              JSON.stringify(prof)
            );
          } catch {
            /* noop */
          }
        }
        onAdd(fav);
        showToast({
          message: `Added ${r.symbol}`,
          tone: "success",
          durationMs: 2400,
        });
        // Enter the tag-on-add interstitial. The user can apply a tag or
        // skip; either way we then return to search mode, dialog still open.
        setJustAddedSymbol(r.symbol);
        setQuery("");
        setResults([]);
        setActiveIdx(0);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setAdding(null);
      }
    },
    [isAlreadyAdded, onAdd, token]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    },
    [activeIdx, addEntry, onClose, results]
  );

  // Tag-on-add helpers
  const applyTag = (rawTag: string) => {
    const tag = rawTag.trim().toLowerCase();
    if (!tag || !justAddedSymbol) return;
    onTagJustAdded(justAddedSymbol, tag);
    skipTag();
  };

  const skipTag = () => {
    setJustAddedSymbol(null);
    setNewTagDraft("");
    // Return focus to the search input so users can add another stock.
    inputRef.current?.focus();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-[14vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="glass-strong relative w-full max-w-2xl overflow-hidden rounded-[var(--radius-card)]"
      >
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
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-bone-300">
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

        <div className="max-h-[50vh] overflow-y-auto">
          {justAddedSymbol && (
            <div className="border-b border-white/10 px-5 py-4">
              <div className="mb-2.5 flex items-center gap-2">
                <TagIcon className="size-3.5 text-[var(--color-lime)]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300">
                  tag {justAddedSymbol} as…
                </span>
                <span className="ml-auto font-mono text-[11px] text-bone-400">
                  optional
                </span>
              </div>
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {allTags.length === 0 && (
                  <span className="font-mono text-[11px] text-bone-400">
                    no existing tags — create one below
                  </span>
                )}
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => applyTag(t)}
                    className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-bone-200 transition hover:border-[var(--color-iris)]/50 hover:text-[var(--color-iris)]"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyTag(newTagDraft);
                  }}
                  className="flex flex-1 items-center gap-1.5 rounded-full border border-white/10 bg-ink-800 px-3 py-1.5"
                >
                  <Plus className="size-3 text-bone-400" />
                  <input
                    ref={tagInputRef}
                    value={newTagDraft}
                    onChange={(e) => setNewTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        skipTag();
                      }
                    }}
                    placeholder="new tag…"
                    maxLength={24}
                    className="w-full bg-transparent font-mono text-[11px] uppercase tracking-[0.15em] text-bone-100 placeholder:text-bone-400 placeholder:normal-case focus:outline-none"
                  />
                </form>
                <button
                  onClick={skipTag}
                  className="rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300 hover:text-bone-100"
                >
                  skip
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="px-5 py-4 text-sm text-[var(--color-loss)]">
              {error}
            </div>
          )}

          {!justAddedSymbol &&
            !error &&
            query &&
            !searching &&
            results.length === 0 && (
              <EmptyHint message="No matching US common stocks." />
            )}

          {!justAddedSymbol && !error && !query && (
            <EmptyHint message="Start typing to search. Dialog stays open — add as many as you like." />
          )}

          {!justAddedSymbol &&
            results.map((r, i) => {
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
                      <span className="flex items-center gap-1 rounded bg-[var(--color-ember)]/15 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ember)]">
                        <Check className="size-2.5" />
                        added
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
                      isActive ? "text-[var(--color-lime)]" : "text-bone-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>


        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
          <span>us common stocks · via finnhub /search</span>
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate · <Kbd>↵</Kbd> add · <Kbd>esc</Kbd> done
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-bone-400">
      {message}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[11px] text-bone-300">
      {children}
    </kbd>
  );
}
