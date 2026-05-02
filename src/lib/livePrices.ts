/**
 * Module-level store of the most-recently-seen price for each symbol.
 *
 * Why this exists: the header's portfolio total needs to sum
 * (shares × current price) across all favorites with positions. That
 * means something in App/Header needs to know current prices. If we lifted
 * price state into App, every WS tick would re-render every card. Bad.
 *
 * Instead, cards *publish* their latest price here (cheap), and consumers
 * subscribe via useSyncExternalStore. Cards never subscribe, so they never
 * re-render because of this store.
 *
 * We throttle subscriber notifications to at most once per 250 ms so the
 * portfolio total doesn't re-render on every tick of every symbol during
 * active trading.
 */

import { useSyncExternalStore } from "react";

const prices = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;
let pendingNotify: ReturnType<typeof setTimeout> | null = null;

function scheduleNotify() {
  if (pendingNotify) return;
  pendingNotify = setTimeout(() => {
    pendingNotify = null;
    version += 1;
    for (const l of listeners) l();
  }, 250);
}

export function setLivePrice(symbol: string, price: number) {
  prices.set(symbol, price);
  scheduleNotify();
}

export function getLivePrice(symbol: string): number | undefined {
  return prices.get(symbol);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getVersion() {
  return version;
}

/** Observe `version` — returns an ever-increasing number on each batched
 *  notification. Consumers call `getLivePrice` during render to read. */
export function useLivePriceVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}
