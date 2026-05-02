import { LayoutGrid, Layers } from "lucide-react";

export type ViewMode = "flat" | "grouped";

type Props = {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
  /** Disabled when there are no tags yet — grouping would only show "Untagged". */
  disabled?: boolean;
};

/**
 * Segmented toggle: Flat vs Grouped (by tag).
 * Placed next to SortControls in the watchlist header.
 *
 * Intentionally NOT showing labels on the icons — the toggle is compact,
 * and hover tooltips (title attribute) carry meaning for first-time users.
 */
export function ViewModeToggle({ value, onChange, disabled }: Props) {
  return (
    <div
      className={`glass inline-flex items-center rounded-lg p-1 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <Btn
        active={value === "flat"}
        title="Flat grid"
        onClick={() => onChange("flat")}
        disabled={disabled}
      >
        <LayoutGrid className="size-3.5" />
      </Btn>
      <Btn
        active={value === "grouped"}
        title="Group by tag"
        onClick={() => onChange("grouped")}
        disabled={disabled}
      >
        <Layers className="size-3.5" />
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  title,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-1.5 transition ${
        active
          ? "bg-[var(--color-lime)]/15 text-[var(--color-lime)]"
          : "text-bone-300 hover:text-bone-100"
      } disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
