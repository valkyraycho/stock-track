import { useMemo } from "react";
import { StockCard } from "./StockCard";
import type { Favorite } from "../types";

type Props = {
  favorites: Favorite[];
  token: string;
  onRemove: (symbol: string) => void;
  onOpen: (symbol: string) => void;
  onSeed: (symbol: string, seed: { dp: number; c: number }) => void;
};

const UNTAGGED = "__untagged__";

/**
 * Group-by-tag view of the watchlist.
 *
 * Behavior:
 *   - A stock with N tags appears in N sections (this is a *view*, not
 *     the underlying data — the card is re-rendered per group).
 *   - Stocks with zero tags go into a trailing "Untagged" section.
 *   - Tags are sorted alphabetically; the Untagged section is always last.
 *   - Section heading shows the tag name + a ghost count.
 *
 * If a user has set the tag filter to a single tag (via TagFilter),
 * `favorites` is already pre-filtered — this component will still group,
 * just with only one visible section.
 *
 * Index prop for reveal animation restarts per section so the stagger
 * looks sensible within each group.
 */
export function GroupedStockGrid({
  favorites,
  token,
  onRemove,
  onOpen,
  onSeed,
}: Props) {
  const groups = useMemo(() => {
    // symbol -> Favorite for deduping via referential equality
    const byTag = new Map<string, Favorite[]>();
    for (const fav of favorites) {
      const tags = fav.tags && fav.tags.length > 0 ? fav.tags : [UNTAGGED];
      for (const t of tags) {
        const list = byTag.get(t) ?? [];
        list.push(fav);
        byTag.set(t, list);
      }
    }
    const entries = Array.from(byTag.entries());
    // Sort: real tags A–Z, Untagged last.
    entries.sort(([a], [b]) => {
      if (a === UNTAGGED) return 1;
      if (b === UNTAGGED) return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [favorites]);

  if (favorites.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      {groups.map(([tag, list]) => (
        <section key={tag}>
          <GroupHeader
            tag={tag === UNTAGGED ? "untagged" : tag}
            isUntagged={tag === UNTAGGED}
            count={list.length}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((fav, i) => (
              <StockCard
                // Compound key so the same card in two groups gets unique keys.
                key={`${tag}-${fav.symbol}`}
                favorite={fav}
                token={token}
                index={i}
                onRemove={onRemove}
                onOpen={onOpen}
                onSeed={onSeed}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function GroupHeader({
  tag,
  isUntagged,
  count,
}: {
  tag: string;
  isUntagged: boolean;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={`font-display text-xl font-semibold tracking-tight ${
          isUntagged ? "text-bone-300" : "text-bone-50"
        }`}
      >
        {tag}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone-400">
        · {count} {count === 1 ? "ticker" : "tickers"}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}
