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
import { TagFilter } from "./components/TagFilter";
import { ViewModeToggle, type ViewMode } from "./components/ViewModeToggle";
import { GroupedStockGrid } from "./components/GroupedStockGrid";
import { AlertWatcher } from "./components/AlertWatcher";
import { HelpModal } from "./components/HelpModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { BulkActionsBar } from "./components/BulkActionsBar";
import { CheckSquare } from "lucide-react";
import { useFavorites } from "./hooks/useFavorites";
import { useAlerts } from "./hooks/useAlerts";
import { useTags } from "./hooks/useTags";
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

  const {
    favorites,
    add,
    remove,
    has,
    setPosition,
    setTags,
    removeTagGlobally,
    bulkAddTag,
  } = useFavorites();
  const standaloneTags = useTags();
  const {
    alerts,
    add: addAlert,
    remove: removeAlert,
    toggleMute: toggleAlertMute,
    markTriggered,
  } = useAlerts();

  const [addOpen, setAddOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [openSymbol, setOpenSymbol] = useState<string | null>(null);
  const [sortKey, setSortKey] = useLocalStorage<SortKey>(
    "stock-track:sort",
    "recent"
  );
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>(
    "stock-track:viewMode",
    "flat"
  );
  const [activeTag, setActiveTag] = useState<string | null>(null);
  // Multi-select + bulk action state.
  const [selectionActive, setSelectionActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  // Confirmation flow state: { tag } means "about to delete globally".
  const [pendingDeleteTag, setPendingDeleteTag] = useState<string | null>(null);
  const [pendingBulkRemove, setPendingBulkRemove] = useState(false);

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
  // `allTags` is the union of:
  //   1. tags currently attached to any favorite (derived)
  //   2. standalone tags the user created via TagFilter/Manage UI (persisted)
  // Unioning means a tag stays visible regardless of which side it comes
  // from — required for the "create a tag with no stocks" feature.
  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const f of favorites) {
      if (f.tags) for (const t of f.tags) s.add(t);
    }
    for (const t of standaloneTags.tags) s.add(t);
    return Array.from(s).sort();
  }, [favorites, standaloneTags.tags]);

  // If the active tag disappears (user removed last use), clear it.
  useEffect(() => {
    if (activeTag && !allTags.includes(activeTag)) setActiveTag(null);
  }, [activeTag, allTags]);

  const sortedFavorites = useMemo(() => {
    let list = favorites.slice();
    if (activeTag) {
      list = list.filter((f) => f.tags?.includes(activeTag));
    }
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
  }, [favorites, sortKey, seedMap, activeTag]);

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

  // --- Delete a tag globally with undo ---------------------------------------
  //
  // Mirrors removeWithUndo: capture the pre-delete state (which symbols had
  // the tag, whether it was a standalone), run the destructive change, show
  // an Undo toast that restores everything from the snapshot.
  const confirmDeleteTag = useCallback(() => {
    const tag = pendingDeleteTag;
    if (!tag) return;
    const wasStandalone = standaloneTags.has(tag);
    const affected = removeTagGlobally(tag);
    if (wasStandalone) standaloneTags.remove(tag);
    setPendingDeleteTag(null);
    // Clear the filter if it pointed at the deleted tag — otherwise the
    // useEffect that watches allTags would do it, but doing it here
    // eliminates a transient "empty filtered grid" frame.
    if (activeTag === tag) setActiveTag(null);

    if (affected.length === 0 && !wasStandalone) return;
    showToast({
      message:
        affected.length > 0
          ? `Deleted tag "${tag}" from ${affected.length} ${
              affected.length === 1 ? "stock" : "stocks"
            }`
          : `Deleted tag "${tag}"`,
      tone: "neutral",
      durationMs: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          // Restore per-symbol by appending the tag back to each affected
          // favorite's tag list. Use bulkAddTag to avoid N separate state
          // updates; it dedupes internally.
          if (affected.length > 0) bulkAddTag(affected, tag);
          if (wasStandalone) standaloneTags.add(tag);
        },
      },
    });
  }, [
    pendingDeleteTag,
    removeTagGlobally,
    bulkAddTag,
    standaloneTags,
    activeTag,
  ]);

  // Count stocks that currently have the pending-delete tag (for the
  // confirmation copy — "... from N stocks").
  const pendingDeleteAffectedCount = useMemo(() => {
    if (!pendingDeleteTag) return 0;
    return favorites.filter((f) => f.tags?.includes(pendingDeleteTag)).length;
  }, [pendingDeleteTag, favorites]);

  // --- Selection-mode helpers ------------------------------------------------
  const toggleSelect = useCallback((symbol: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionActive(false);
    setSelected(new Set());
  }, []);

  // Ref-backed undo payload for bulk remove, analogous to lastRemovedRef.
  const lastBulkRemovedRef = useRef<Favorite[] | null>(null);

  const applyBulkTag = useCallback(
    (tag: string) => {
      if (selected.size === 0) return;
      const symbols = Array.from(selected);
      bulkAddTag(symbols, tag);
      showToast({
        message: `Tagged ${symbols.length} ${
          symbols.length === 1 ? "stock" : "stocks"
        } as "${tag}"`,
        tone: "success",
        durationMs: 3000,
      });
      clearSelection();
    },
    [selected, bulkAddTag, clearSelection]
  );

  const confirmBulkRemove = useCallback(() => {
    if (selected.size === 0) {
      setPendingBulkRemove(false);
      return;
    }
    const symbols = Array.from(selected);
    const snapshot = favorites.filter((f) => symbols.includes(f.symbol));
    lastBulkRemovedRef.current = snapshot;
    // Remove each — note this triggers the component's own WS unsubscribe.
    for (const s of symbols) remove(s);
    setPendingBulkRemove(false);
    exitSelection();
    showToast({
      message: `Removed ${symbols.length} ${
        symbols.length === 1 ? "stock" : "stocks"
      }`,
      tone: "neutral",
      durationMs: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          const snap = lastBulkRemovedRef.current;
          if (!snap) return;
          // Re-add newest-first so grid order roughly matches the pre-remove
          // state (useFavorites.add prepends; restoring in reverse keeps
          // relative order).
          for (let i = snap.length - 1; i >= 0; i--) add(snap[i]);
          lastBulkRemovedRef.current = null;
        },
      },
    });
  }, [selected, favorites, remove, add, exitSelection]);

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

  // Global keyboard shortcuts. We skip when the user is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "a") setAddOpen(true);
      // `?` is shift+/ on US keyboards; we accept both forms.
      else if (e.key === "?") setHelpOpen(true);
      // Esc exits selection mode — but only when no modal is open (modals
      // handle their own Escape via per-component listeners).
      else if (
        e.key === "Escape" &&
        selectionActive &&
        !addOpen &&
        !keyModalOpen &&
        !helpOpen &&
        openSymbol === null &&
        pendingDeleteTag === null &&
        !pendingBulkRemove
      ) {
        exitSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectionActive,
    addOpen,
    keyModalOpen,
    helpOpen,
    openSymbol,
    pendingDeleteTag,
    pendingBulkRemove,
    exitSelection,
  ]);

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
        onOpenHelp={() => setHelpOpen(true)}
        favoritesCount={favorites.length}
        favorites={favorites}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10 md:py-14">
        <MarketClockBanner />
        {token && <MarketIndices token={token} />}

        {favorites.length > 0 && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-bone-400">
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
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                disabled={allTags.length === 0}
              />
              <button
                onClick={() => {
                  if (selectionActive) exitSelection();
                  else setSelectionActive(true);
                }}
                aria-pressed={selectionActive}
                title={selectionActive ? "Exit selection mode" : "Enter selection mode"}
                className={`glass inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                  selectionActive
                    ? "bg-[var(--color-lime)]/15 text-[var(--color-lime)]"
                    : "text-bone-300 hover:text-bone-100"
                }`}
              >
                <CheckSquare className="size-3.5" />
                {selectionActive ? "selecting" : "select"}
              </button>
              <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-400 md:flex">
                <Kbd>a</Kbd> add · <Kbd>?</Kbd> help
              </div>
            </div>
          </div>
        )}

        {(favorites.length > 0 || allTags.length > 0) && (
          <TagFilter
            allTags={allTags}
            activeTag={activeTag}
            onChange={setActiveTag}
            onCreate={standaloneTags.add}
            onRequestDelete={(tag) => setPendingDeleteTag(tag)}
          />
        )}

        {favorites.length === 0 ? (
          <EmptyState
            onAdd={() => setAddOpen(true)}
            onQuickAdd={(s) => void quickAdd(s)}
          />
        ) : (
          token &&
          (viewMode === "grouped" && allTags.length > 0 ? (
            <GroupedStockGrid
              favorites={sortedFavorites}
              token={token}
              onRemove={removeWithUndo}
              onOpen={(s) => setOpenSymbol(s)}
              onSeed={recordSeed}
              selectionActive={selectionActive}
              selected={selected}
              onToggleSelect={toggleSelect}
            />
          ) : (
            <StockGrid
              favorites={sortedFavorites}
              token={token}
              onRemove={removeWithUndo}
              onOpen={(s) => setOpenSymbol(s)}
              onSeed={recordSeed}
              selectionActive={selectionActive}
              selected={selected}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </main>

      {token && <TickerTape favorites={favorites} token={token} />}

      {/* Background alert watcher — renders nothing, just subscribes to ticks */}
      <AlertWatcher
        token={token}
        alerts={alerts}
        onTrigger={markTriggered}
      />

      <ToastContainer />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {selectionActive && selected.size > 0 && (
        <BulkActionsBar
          count={selected.size}
          allTags={allTags}
          onClearSelection={clearSelection}
          onExit={exitSelection}
          onApplyTag={applyBulkTag}
          onRequestRemove={() => setPendingBulkRemove(true)}
        />
      )}

      <ConfirmDialog
        open={pendingBulkRemove}
        title={`Remove ${selected.size} ${
          selected.size === 1 ? "stock" : "stocks"
        } from tracking?`}
        body={
          <>
            You can undo this right after. Positions, tags, and alerts on these
            stocks will be restored if you do.
          </>
        }
        confirmLabel="Remove"
        destructive
        onConfirm={confirmBulkRemove}
        onCancel={() => setPendingBulkRemove(false)}
      />

      <ConfirmDialog
        open={pendingDeleteTag !== null}
        title={`Delete tag "${pendingDeleteTag ?? ""}"?`}
        body={
          pendingDeleteAffectedCount > 0 ? (
            <>
              This will remove the tag from{" "}
              <strong className="font-semibold text-bone-50">
                {pendingDeleteAffectedCount}{" "}
                {pendingDeleteAffectedCount === 1 ? "stock" : "stocks"}
              </strong>
              . You can undo this right after.
            </>
          ) : (
            <>No stocks use this tag — it's only in your tag list.</>
          )
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteTag}
        onCancel={() => setPendingDeleteTag(null)}
      />

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
          allTags={allTags}
          onTagJustAdded={(symbol, tag) => {
            // We're adding ONE tag to an existing stock. Merge with whatever
            // tags the fresh favorite already has (normally none, but users
            // could re-add something they had tagged before — belt & braces).
            const fav = favorites.find((f) => f.symbol === symbol);
            const current = fav?.tags ?? [];
            if (current.includes(tag)) return;
            setTags(symbol, [...current, tag]);
          }}
        />
      )}

      {token && openFavorite && (
        <StockDetailModal
          favorite={openFavorite}
          token={token}
          onClose={() => setOpenSymbol(null)}
          onRemove={removeWithUndo}
          onUpdatePosition={setPosition}
          onUpdateTags={setTags}
          allTags={allTags}
          alerts={alerts}
          onAddAlert={addAlert}
          onRemoveAlert={removeAlert}
          onToggleAlertMute={toggleAlertMute}
        />
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[11px] text-bone-200">
      {children}
    </kbd>
  );
}
