import { useEffect, useRef } from "react";
import {
  X,
  Keyboard,
  Sparkles,
  Layers,
  Bell,
  Wallet,
  Newspaper,
  Search,
  BarChart3,
} from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Help / reference modal. Accessible via the ? keyboard shortcut or the
 * HelpCircle icon in the header.
 *
 * Structured in three passes: a short app blurb, a shortcuts table,
 * and a compact feature reference. Content is static — no data
 * fetching, no state beyond open/closed.
 */
export function HelpModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Help and keyboard shortcuts"
        tabIndex={-1}
        className="glass-strong relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-card)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--color-lime)]/15 ring-1 ring-[var(--color-lime)]/30">
              <Sparkles className="size-4 text-[var(--color-lime)]" />
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300">
                reference
              </div>
              <h2 className="font-display text-xl font-semibold leading-none tracking-tight">
                How <span className="font-serif italic">STOCK//TRACK</span>{" "}
                works
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-bone-300 hover:text-bone-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Blurb />
          <Shortcuts />
          <Features />
          <DataSourceNotes />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-white/[0.02] px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-400">
          <span>no account · no backend · your data stays local</span>
          <span className="flex items-center gap-1.5">
            press <Kbd>?</Kbd> anywhere to reopen
          </span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Sections
   ──────────────────────────────────────────────────────────────── */

function Blurb() {
  return (
    <p className="mb-6 max-w-prose text-sm leading-relaxed text-bone-200">
      A real-time US stock watchlist that runs entirely in your browser. Live
      prices stream over WebSocket from Finnhub; favorites, positions, tags,
      and alerts persist in <span className="font-mono">localStorage</span>.
      There's no backend and no tracking — your data is yours.
    </p>
  );
}

function Shortcuts() {
  return (
    <section className="mb-8">
      <SectionTitle icon={Keyboard} label="keyboard shortcuts" />
      <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        <Row keys={["A"]} desc="Open the add-stock dialog" />
        <Row keys={["?"]} desc="Show this help modal" />
        <Row
          keys={["↑", "↓"]}
          desc="Navigate search results or alert threshold"
        />
        <Row keys={["↵"]} desc="Add the highlighted search result" />
        <Row keys={["Esc"]} desc="Close any open dialog / modal" />
        <Row
          keys={["Click", "card"]}
          desc="Open the full detail view for a ticker"
        />
        <Row
          keys={["Tab"]}
          desc="Move focus between controls (stays inside open modals)"
        />
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="mb-8">
      <SectionTitle icon={Sparkles} label="features" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Feature
          icon={Search}
          title="Search & quick-add"
          body="Press A, type a ticker or company name. The dialog stays open — add several in a row without reopening."
        />
        <Feature
          icon={BarChart3}
          title="Live cards + detail view"
          body="Cards flash green / red on each trade and show a sparkline, freshness indicator, and daily change. Click a card for a larger chart and full company info."
        />
        <Feature
          icon={Wallet}
          title="Positions & portfolio"
          body="Enter shares (and optional avg cost) per stock in its detail modal. The header shows a running portfolio value and unrealized P/L."
        />
        <Feature
          icon={Layers}
          title="Tags, filter & group"
          body="Tag any stock with free-form labels ('tech', 'banks'). Filter chips narrow the grid to one tag. Toggle the grouped-view icon to partition the grid into sections per tag."
        />
        <Feature
          icon={Bell}
          title="Price alerts"
          body="Set 'above / below $X' thresholds in the detail modal. Alerts fire as OS notifications (you'll be asked for permission) and in-app toasts, edge-triggered on crossing."
        />
        <Feature
          icon={Newspaper}
          title="News feed"
          body="The detail modal includes the latest 8 headlines for a ticker, pulled from Finnhub's free news endpoint. Click any row to open the source."
        />
      </div>
    </section>
  );
}

function DataSourceNotes() {
  return (
    <section className="mb-2">
      <SectionTitle icon={BarChart3} label="good to know" />
      <ul className="flex flex-col gap-2 text-sm text-bone-200">
        <Bullet>
          <strong className="font-semibold text-bone-50">
            Market hours matter.
          </strong>{" "}
          Live trade ticks only stream during the US regular session (9:30
          am – 4:00 pm ET, M–F). Outside those hours, prices freeze at the
          last-known trade — cards show a small "stale" indicator and the
          top banner tells you when the market reopens.
        </Bullet>
        <Bullet>
          <strong className="font-semibold text-bone-50">
            Your Finnhub key is local.
          </strong>{" "}
          We prompt for it on first run and store it in your browser. Nothing
          else ever sees it. Hit the gear icon in the header to rotate it.
        </Bullet>
        <Bullet>
          <strong className="font-semibold text-bone-50">
            Free-tier limits.
          </strong>{" "}
          Live WebSocket is free. Historical candles are paid — we don't
          use them. The detail chart is built from the day's O/H/L/PC plus
          ticks we've seen in this session.
        </Bullet>
        <Bullet>
          <strong className="font-semibold text-bone-50">
            Delete is forgiving.
          </strong>{" "}
          Removing a stock shows a 5-second <em>Undo</em> toast. Clicking
          Undo restores the card in its original grid position.
        </Bullet>
      </ul>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Small building blocks
   ──────────────────────────────────────────────────────────────── */

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="size-3.5 text-[var(--color-lime)]" />
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300">
        {label}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

function Row({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 last:border-0">
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </span>
      <span className="text-right text-[13px] text-bone-200">{desc}</span>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="size-3.5 text-[var(--color-iris)]" />
        <span className="font-display text-sm font-semibold leading-none text-bone-50">
          {title}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-bone-300">{body}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 leading-relaxed">
      <span className="mt-[0.4em] size-1 shrink-0 rounded-full bg-[var(--color-lime)]" />
      <span>{children}</span>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[22px] items-center justify-center rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-bone-100">
      {children}
    </kbd>
  );
}
