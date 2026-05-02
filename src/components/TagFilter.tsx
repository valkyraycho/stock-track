import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

type Props = {
  allTags: string[];
  activeTag: string | null;
  onChange: (tag: string | null) => void;
  /** Create a standalone tag (added to the tags registry but applied to no
   *  stocks yet). Receives the raw (trimmed) name; the hook lowercases. */
  onCreate: (name: string) => void;
  /** Request global deletion — caller handles the confirm dialog + undo. */
  onRequestDelete: (tag: string) => void;
};

/**
 * Filter chips above the grid.
 * - Click a chip to activate the filter; click again or click "all" to clear.
 * - Trailing "+ new" chip toggles an inline input for creating tags that
 *   aren't attached to any stock yet.
 * - Hover a chip → trash button appears; click it to request global delete.
 *
 * The delete request only opens the confirmation — the actual destructive
 * work happens in App.tsx so we can mirror the existing "capture-then-undo"
 * pattern used for stock removal.
 */
export function TagFilter({
  allTags,
  activeTag,
  onChange,
  onCreate,
  onRequestDelete,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim();
    if (!v) {
      setCreating(false);
      return;
    }
    onCreate(v);
    setDraft("");
    setCreating(false);
  };

  if (allTags.length === 0 && !creating) {
    // With no tags AND no creation in progress, we still show the "+" chip
    // so standalone-tag creation is reachable even before the user has
    // tagged anything.
    return (
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-400">
          tags —
        </span>
        <NewTagButton onClick={() => setCreating(true)} />
      </div>
    );
  }

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
          <div
            key={t}
            className={`group inline-flex items-center rounded-full transition ${
              active
                ? "bg-[var(--color-iris)]/20"
                : "border border-white/10 hover:border-white/20"
            }`}
          >
            <button
              onClick={() => onChange(active ? null : t)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] transition ${
                active
                  ? "text-[var(--color-iris)]"
                  : "text-bone-300 hover:text-[var(--color-iris)]"
              }`}
            >
              {t}
              {active && <X className="size-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(t);
              }}
              aria-label={`Delete tag ${t}`}
              className="mr-1.5 rounded-full p-1 text-bone-400 opacity-0 transition hover:text-[var(--color-loss)] group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        );
      })}

      {/* Inline input to create a new standalone tag */}
      {creating ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
          className="inline-flex items-center"
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft("");
                setCreating(false);
              }
            }}
            maxLength={24}
            placeholder="tag name…"
            className="w-32 rounded-full border border-[var(--color-iris)]/40 bg-ink-800 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-bone-100 placeholder:text-bone-400 placeholder:normal-case focus:outline-none"
          />
        </form>
      ) : (
        <NewTagButton onClick={() => setCreating(true)} />
      )}
    </div>
  );
}

function NewTagButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Create a new tag"
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-bone-400 transition hover:border-[var(--color-iris)]/50 hover:text-[var(--color-iris)]"
    >
      <Plus className="size-3" />
      new
    </button>
  );
}
