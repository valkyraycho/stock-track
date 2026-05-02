import { useEffect, useState } from "react";
import { Tag, X, Plus } from "lucide-react";

type Props = {
  symbol: string;
  tags: string[] | undefined;
  allTags: string[];
  onSave: (next: string[]) => void;
};

/**
 * Tag editor. Supports picking from existing tags (fast) or creating new
 * ones (flexible). Tags are normalized to lowercase for consistency; the
 * UI can capitalize for display without needing a separate label.
 *
 * Saves immediately on every change — no separate save button. Tagging
 * feels wrong with a commit step; users expect it to be instant.
 */
export function TagEditor({ symbol, tags, allTags, onSave }: Props) {
  const [current, setCurrent] = useState<string[]>(tags ?? []);
  const [draft, setDraft] = useState("");

  // Sync when symbol changes (modal persists across symbols via App).
  useEffect(() => {
    setCurrent(tags ?? []);
    setDraft("");
  }, [symbol, tags]);

  const commit = (next: string[]) => {
    setCurrent(next);
    onSave(next);
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (current.includes(tag)) return;
    commit([...current, tag]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    commit(current.filter((t) => t !== tag));
  };

  // Suggestions: existing tags this symbol doesn't already have.
  const suggestions = allTags.filter((t) => !current.includes(t));

  return (
    <div className="border-t border-white/5 px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Tag className="size-3.5 text-[var(--color-lime)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300">
          tags
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {current.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-iris)]/15 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--color-iris)]"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="text-[var(--color-iris)]/70 hover:text-[var(--color-iris)]"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTag(draft);
          }}
          className="inline-flex items-center gap-1"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="add tag…"
            className="w-28 rounded-full border border-white/10 bg-ink-800 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-bone-100 placeholder:text-bone-400 focus:border-[var(--color-iris)]/60 focus:outline-none"
            maxLength={24}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-full p-1 text-bone-300 hover:text-[var(--color-iris)] disabled:opacity-30"
            aria-label="Add tag"
          >
            <Plus className="size-3" />
          </button>
        </form>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3">
          <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
            suggestions —
          </span>
          {suggestions.slice(0, 8).map((t) => (
            <button
              key={t}
              onClick={() => addTag(t)}
              className="mr-1.5 rounded-full border border-white/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-bone-300 transition hover:border-[var(--color-iris)]/40 hover:text-[var(--color-iris)]"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
