import { Clock, TrendingUp, ArrowDownAZ } from "lucide-react";

export type SortKey = "recent" | "change" | "alpha";

type Props = {
  value: SortKey;
  onChange: (next: SortKey) => void;
};

const OPTIONS: { key: SortKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "recent", label: "Recent", icon: Clock },
  { key: "change", label: "Change", icon: TrendingUp },
  { key: "alpha", label: "A–Z", icon: ArrowDownAZ },
];

/**
 * Segmented control — single-select. The active item gets a lime underline
 * (rendered via a sibling indicator that slides) because animating a
 * background pill is more complex than it's worth for three options.
 */
export function SortControls({ value, onChange }: Props) {
  return (
    <div className="glass inline-flex items-center rounded-lg p-1">
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
              active
                ? "bg-[var(--color-lime)]/12 text-[var(--color-lime)]"
                : "text-bone-300 hover:text-bone-100"
            }`}
          >
            <Icon className="size-3" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
