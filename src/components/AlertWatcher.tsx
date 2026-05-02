import { useEffect, useRef } from "react";
import type { PriceAlert } from "../types";
import { useFinnhubSocket } from "../hooks/useFinnhubSocket";
import { fireNotification } from "../lib/notifications";
import { showToast } from "../lib/toast";

/**
 * Mount exactly one instance of this at the app root.
 * Subscribes to the shared Finnhub WebSocket for every symbol that has an
 * active, non-muted, non-triggered alert. Fires OS + in-app notifications
 * on threshold crossing.
 *
 * Crossing is edge-triggered: we track lastPrice per symbol (in a ref, so
 * no re-renders) and only fire when the latest tick moves the price across
 * the threshold. This prevents an "alert above $300" from spamming when
 * the price has already been above $300 since the alert was set.
 *
 * This component renders nothing — the child <AlertSymbolWatcher> nodes
 * exist purely to carry per-symbol hook subscriptions.
 */
type Props = {
  token: string | null;
  alerts: PriceAlert[];
  onTrigger: (alertId: string) => void;
};

export function AlertWatcher({ token, alerts, onTrigger }: Props) {
  const watchSet = new Set<string>();
  for (const a of alerts) {
    if (a.muted || a.triggeredAt) continue;
    watchSet.add(a.symbol);
  }
  const watchList = Array.from(watchSet).sort();

  return (
    <>
      {watchList.map((sym) => (
        <AlertSymbolWatcher
          key={sym}
          symbol={sym}
          token={token}
          alerts={alerts.filter(
            (a) => a.symbol === sym && !a.muted && !a.triggeredAt
          )}
          onTrigger={onTrigger}
        />
      ))}
    </>
  );
}

function AlertSymbolWatcher({
  symbol,
  token,
  alerts,
  onTrigger,
}: {
  symbol: string;
  token: string | null;
  alerts: PriceAlert[];
  onTrigger: (id: string) => void;
}) {
  const alertsRef = useRef(alerts);
  const onTriggerRef = useRef(onTrigger);
  alertsRef.current = alerts;
  onTriggerRef.current = onTrigger;
  const lastPriceRef = useRef<number | null>(null);

  // Stable handler via ref pattern — avoids re-subscribing the WS when
  // the alerts array identity changes every render.
  const handleTickRef = useRef<(tick: { s: string; p: number }) => void>(
    () => {}
  );
  handleTickRef.current = (tick) => {
    const prev = lastPriceRef.current;
    const curr = tick.p;
    lastPriceRef.current = curr;
    if (prev === null) return;
    for (const a of alertsRef.current) {
      let crossed = false;
      if (a.direction === "above") {
        crossed = prev < a.threshold && curr >= a.threshold;
      } else {
        crossed = prev > a.threshold && curr <= a.threshold;
      }
      if (!crossed) continue;
      const title = `${a.symbol} ${a.direction} $${a.threshold}`;
      const body = `Last trade: $${curr.toFixed(2)}`;
      const shown = fireNotification(title, body);
      if (!shown) {
        showToast({
          message: `${title} — ${body}`,
          tone: "warning",
          durationMs: 8000,
        });
      }
      onTriggerRef.current(a.id);
    }
  };

  const stableHandler = useRef((t: { s: string; p: number }) => {
    handleTickRef.current(t);
  }).current;

  useFinnhubSocket(token, symbol, stableHandler);

  useEffect(() => {
    lastPriceRef.current = null;
  }, [symbol]);

  return null;
}
