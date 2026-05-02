import { Plus, Sparkles } from "lucide-react";

/**
 * Shown when the user has no favorites yet. Doubles as an onboarding nudge.
 * Includes three one-click suggestions — zero-state screens that give users
 * something to click convert far better than static illustrations.
 */
type Props = {
  onAdd: () => void;
  onQuickAdd: (symbol: string) => void;
};

const SUGGESTIONS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
];

export function EmptyState({ onAdd, onQuickAdd }: Props) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center py-24 text-center">
      {/* Decorative hero glyph */}
      <div className="relative mb-8">
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div className="h-40 w-40 rounded-full bg-[var(--color-lime)]/40" />
        </div>
        <div className="glass flex size-20 items-center justify-center rounded-2xl">
          <Sparkles className="size-8 text-[var(--color-lime)]" />
        </div>
      </div>

      <h1 className="mb-3 font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
        Your <span className="font-serif italic text-[var(--color-lime)]">watchlist</span>{" "}
        is empty.
      </h1>

      <p className="mb-8 max-w-md font-sans text-sm text-bone-200 md:text-base">
        Track any US-listed stock in real time. Trades stream directly from
        Finnhub over WebSocket — no polling, no backend, no account.
      </p>

      <button
        onClick={onAdd}
        className="group mb-12 inline-flex items-center gap-2 rounded-lg bg-[var(--color-lime)] px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-ink-950 transition hover:bg-[#d4ff6b]"
      >
        <Plus className="size-4" />
        Add your first stock
      </button>

      {/* Quick add row */}
      <div className="w-full">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-400">
          — or try one of these ——————————————————
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.symbol}
              onClick={() => onQuickAdd(s.symbol)}
              className="glass rounded-full px-4 py-2 font-mono text-xs tracking-wider text-bone-100 transition hover:border-[var(--color-lime)]/40 hover:text-[var(--color-lime)]"
            >
              <span className="font-semibold">{s.symbol}</span>
              <span className="ml-2 text-bone-400">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
