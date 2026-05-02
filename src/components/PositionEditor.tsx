import { useEffect, useState } from "react";
import { Wallet, Check, Trash2 } from "lucide-react";
import type { Position } from "../types";

type Props = {
  symbol: string;
  position: Position | undefined;
  currentPrice: number | null;
  onSave: (next: Position | undefined) => void;
};

/**
 * Lets the user enter/edit/clear a position (shares + optional avg cost).
 * Live-previews position value + P/L as the user types, so they can sanity
 * check numbers before committing.
 *
 * UX rule: "blank shares" = remove the position entirely. We don't need
 * a separate trash button — though we add one anyway for explicitness.
 */
export function PositionEditor({
  symbol,
  position,
  currentPrice,
  onSave,
}: Props) {
  const [shares, setShares] = useState<string>(
    position?.shares ? String(position.shares) : ""
  );
  const [avgCost, setAvgCost] = useState<string>(
    position?.avgCost ? String(position.avgCost) : ""
  );

  // Sync from props when switching symbols (modal is persistent, favorite isn't).
  useEffect(() => {
    setShares(position?.shares ? String(position.shares) : "");
    setAvgCost(position?.avgCost ? String(position.avgCost) : "");
  }, [symbol, position?.shares, position?.avgCost]);

  const sharesNum = parseFloat(shares) || 0;
  const avgCostNum = parseFloat(avgCost) || 0;
  const positionValue =
    currentPrice && sharesNum > 0 ? currentPrice * sharesNum : null;
  const totalCost = avgCostNum > 0 && sharesNum > 0 ? avgCostNum * sharesNum : null;
  const unrealized =
    positionValue !== null && totalCost !== null
      ? positionValue - totalCost
      : null;
  const unrealizedPct =
    unrealized !== null && totalCost !== null && totalCost > 0
      ? (unrealized / totalCost) * 100
      : null;
  const isUp = unrealized !== null && unrealized >= 0;

  // Dirty-tracking so the save button is disabled when nothing changed.
  const currentShares = position?.shares ?? 0;
  const currentAvgCost = position?.avgCost ?? 0;
  const dirty =
    sharesNum !== currentShares ||
    (sharesNum > 0 && avgCostNum !== currentAvgCost);

  const save = () => {
    if (sharesNum <= 0) {
      onSave(undefined);
      return;
    }
    onSave({
      shares: sharesNum,
      ...(avgCostNum > 0 ? { avgCost: avgCostNum } : {}),
    });
  };

  return (
    <div className="border-t border-white/5 px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="size-3.5 text-[var(--color-lime)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-300">
          your position
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <LabeledInput
          label="shares"
          value={shares}
          onChange={setShares}
          placeholder="0"
        />
        <LabeledInput
          label="avg cost (opt.)"
          value={avgCost}
          onChange={setAvgCost}
          placeholder="0.00"
          disabled={sharesNum <= 0}
        />
        <Readout
          label="value"
          value={positionValue !== null ? fmt$(positionValue) : "—"}
        />
        <Readout
          label="unrealized"
          tone={
            unrealized === null ? "neutral" : isUp ? "gain" : "loss"
          }
          value={
            unrealized !== null
              ? `${fmtSigned$(unrealized)} · ${
                  unrealizedPct !== null
                    ? `${unrealizedPct >= 0 ? "+" : ""}${unrealizedPct.toFixed(2)}%`
                    : "—"
                }`
              : "—"
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {position && (
          <button
            onClick={() => onSave(undefined)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-300 transition hover:border-[var(--color-loss)]/50 hover:text-[var(--color-loss)]"
          >
            <Trash2 className="size-3" />
            clear
          </button>
        )}
        <button
          onClick={save}
          disabled={!dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-lime)] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-950 transition hover:bg-[#d4ff6b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="size-3" />
          save
        </button>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="decimal"
        className="rounded-md border border-white/10 bg-ink-800 px-2.5 py-1.5 font-mono text-sm text-bone-50 placeholder:text-bone-400 focus:border-[var(--color-lime)]/60 focus:outline-none disabled:opacity-40"
      />
    </label>
  );
}

function Readout({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "gain" | "loss";
}) {
  const color =
    tone === "gain"
      ? "text-[var(--color-gain)]"
      : tone === "loss"
      ? "text-[var(--color-loss)]"
      : "text-bone-100";
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-400">
        {label}
      </span>
      <span className={`truncate font-mono text-sm tabular ${color}`}>
        {value}
      </span>
    </div>
  );
}

function fmt$(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function fmtSigned$(n: number): string {
  return (n >= 0 ? "+" : "") + fmt$(n);
}
