import { useEffect, useRef, useState } from "react";
import { Tag, Trash2, X, Plus } from "lucide-react";

type Props = {
  count: number;
  allTags: string[];
  onClearSelection: () => void;
  onExit: () => void;
  onApplyTag: (tag: string) => void;
  onRequestRemove: () => void;
};

/**
 * Fixed-bottom action bar shown while in selection mode with ≥1 selected.
 *
 * Layout: count-and-clear on the left, Tag + Remove in the middle, Done
 * on the right. The Tag button opens a small popover with the existing
 * tag list plus a "new tag" input — selecting/creating applies to all
 * selected symbols in one bulk call.
 */
export function BulkActionsBar({
  count,
  allTags,
  onClearSelection,
  onExit,
  onApplyTag,
  onRequestRemove,
}: Props) {
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [newTagDraft, setNewTagDraft] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click.
  useEffect(() => {
    if (!tagPopoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setTagPopoverOpen(false);
      }
    };
    // Next tick so the click that opened the popover doesn't immediately close it.
    const t = setTimeout(
      () => document.addEventListener("mousedown", handler),
      0
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [tagPopoverOpen]);

  const apply = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    onApplyTag(t);
    setTagPopoverOpen(false);
    setNewTagDraft("");
  };

  return (
    <div className="fixed inset-x-0 bottom-12 z-40 flex justify-center px-4">
      <div className="glass-strong relative flex items-center gap-2 rounded-full px-2 py-2 shadow-2xl ring-1 ring-[var(--color-lime)]/30">
        <div className="flex items-center gap-3 px-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-50 tabular">
            {count} selected
          </span>
          <button
            onClick={onClearSelection}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300 hover:text-bone-50"
          >
            clear
          </button>
        </div>

        <span className="h-6 w-px bg-white/10" />

        {/* Tag action + popover */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setTagPopoverOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-100 transition hover:bg-white/5"
          >
            <Tag className="size-3.5" />
            tag
          </button>
          {tagPopoverOpen && (
            <div className="absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-ink-900/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bone-400">
                apply tag to all selected
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {allTags.length === 0 && (
                  <span className="font-mono text-[11px] text-bone-400">
                    no tags yet — create one below
                  </span>
                )}
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => apply(t)}
                    className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-bone-200 transition hover:border-[var(--color-iris)]/40 hover:text-[var(--color-iris)]"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  apply(newTagDraft);
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-800 px-3 py-1"
              >
                <Plus className="size-3 text-bone-400" />
                <input
                  value={newTagDraft}
                  onChange={(e) => setNewTagDraft(e.target.value)}
                  placeholder="new tag…"
                  maxLength={24}
                  className="w-full bg-transparent font-mono text-[11px] uppercase tracking-[0.15em] text-bone-100 placeholder:text-bone-400 placeholder:normal-case focus:outline-none"
                />
              </form>
            </div>
          )}
        </div>

        <button
          onClick={onRequestRemove}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-loss)] transition hover:bg-[var(--color-loss)]/10"
        >
          <Trash2 className="size-3.5" />
          remove
        </button>

        <span className="h-6 w-px bg-white/10" />

        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300 hover:text-bone-50"
        >
          <X className="size-3.5" />
          done
        </button>
      </div>
    </div>
  );
}
