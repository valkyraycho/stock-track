import { X } from "lucide-react";

type Props = {
  allTags: string[];
  activeTag: string | null;
  onChange: (tag: string | null) => void;
};

/**
 * Filter chips above the grid. Clicking a tag activates it; clicking the
 * same tag (or "all") deactivates. Single-select by design — a dashboard
 * with N-way tag intersection is a rabbit hole we don't need to enter.
 */
export function TagFilter({ allTags, activeTag, onChange }: Props) {
  if (allTags.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-400">
        filter —
      </span>
      <button
        onClick={() => onChange(null)}
        className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] transition ${
          activeTag === null
            ? "bg-[var(--color-lime)]/15 text-[var(--color-lime)]"
            : "border border-white/10 text-bone-300 hover:text-bone-50"
        }`}
      >
        all
      </button>
      {allTags.map((t) => {
        const active = t === activeTag;
        return (
          <button
            key={t}
            onClick={() => onChange(active ? null : t)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] transition ${
              active
                ? "bg-[var(--color-iris)]/20 text-[var(--color-iris)]"
                : "border border-white/10 text-bone-300 hover:text-[var(--color-iris)]"
            }`}
          >
            {t}
            {active && <X className="size-3" />}
          </button>
        );
      })}
    </div>
  );
}
