import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { PriceAlert } from "../types";

const KEY = "stock-track:alerts";

/**
 * CRUD over price alerts, stored as a flat array in localStorage.
 * Kept separate from Favorite so alerts can outlive a watchlist entry
 * and so the favorites blob stays small.
 */
export function useAlerts() {
  const [alerts, setAlerts] = useLocalStorage<PriceAlert[]>(KEY, []);

  const add = useCallback(
    (a: Omit<PriceAlert, "id" | "createdAt">) =>
      setAlerts((prev) => [
        {
          ...a,
          id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]),
    [setAlerts]
  );

  const remove = useCallback(
    (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)),
    [setAlerts]
  );

  const toggleMute = useCallback(
    (id: string) =>
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, muted: !a.muted, triggeredAt: undefined } : a
        )
      ),
    [setAlerts]
  );

  /** Mark an alert as triggered (for UI badging). */
  const markTriggered = useCallback(
    (id: string) =>
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, triggeredAt: new Date().toISOString() } : a
        )
      ),
    [setAlerts]
  );

  return { alerts, add, remove, toggleMute, markTriggered };
}
