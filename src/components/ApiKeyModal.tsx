import { useState } from "react";
import { KeyRound, ArrowRight, ExternalLink } from "lucide-react";

type Props = {
  initialValue?: string;
  onSave: (key: string) => void;
  onCancel?: () => void;
};

/**
 * Opening screen: user pastes their free Finnhub API key.
 * The key is persisted in localStorage — never sent anywhere but Finnhub.
 */
export function ApiKeyModal({ initialValue, onSave, onCancel }: Props) {
  const [value, setValue] = useState(initialValue ?? "");
  const [showKey, setShowKey] = useState(false);

  const canSave = value.trim().length >= 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop — click-through prevented, click-outside closes only if cancelable */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onCancel}
      />

      <div className="glass-strong relative w-full max-w-lg rounded-[var(--radius-card)] p-8">
        {/* Corner bracket decorations — evoke a terminal/targeting frame */}
        <CornerBrackets />

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--color-lime)]/10 ring-1 ring-[var(--color-lime)]/30">
            <KeyRound className="size-5 text-[var(--color-lime)]" />
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-bone-300">
              Authentication required
            </div>
            <h2 className="font-display text-2xl font-semibold leading-none">
              Link your <span className="italic font-serif">Finnhub</span> key
            </h2>
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-bone-200">
          STOCK//TRACK streams live US equities from Finnhub. The free tier is
          plenty — and since this app has no backend, your key lives only in
          your browser&apos;s local storage.
        </p>

        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-bone-300">
          API token
        </label>

        <div className="relative mb-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type={showKey ? "text" : "password"}
            spellCheck={false}
            autoFocus
            placeholder="paste key here — 40ish characters"
            className="w-full rounded-lg border border-white/10 bg-ink-800 px-4 py-3 pr-24 font-mono text-sm tracking-wider text-bone-50 placeholder:text-bone-400 focus:border-[var(--color-lime)]/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-bone-300 hover:text-bone-50"
          >
            {showKey ? "hide" : "show"}
          </button>
        </div>

        <a
          href="https://finnhub.io/register"
          target="_blank"
          rel="noreferrer"
          className="mb-7 inline-flex items-center gap-1.5 font-mono text-[11px] text-bone-300 hover:text-[var(--color-lime)]"
        >
          <ExternalLink className="size-3" />
          Get a free key
        </a>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-300">
            <span className="size-1.5 rounded-full bg-[var(--color-ember)]" />
            stored locally · never uploaded
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-bone-300 hover:text-bone-50"
              >
                Cancel
              </button>
            )}
            <button
              disabled={!canSave}
              onClick={() => onSave(value.trim())}
              className="group inline-flex items-center gap-2 rounded-lg bg-[var(--color-lime)] px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink-950 transition hover:bg-[#d4ff6b] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Connect
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerBrackets() {
  const common =
    "pointer-events-none absolute size-5 border-[var(--color-lime)]/60";
  return (
    <>
      <span className={`${common} left-3 top-3 border-l border-t`} />
      <span className={`${common} right-3 top-3 border-r border-t`} />
      <span className={`${common} left-3 bottom-3 border-l border-b`} />
      <span className={`${common} right-3 bottom-3 border-r border-b`} />
    </>
  );
}
