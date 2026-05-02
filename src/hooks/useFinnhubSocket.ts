import { useEffect, useReducer } from "react";
import type { TradeTick } from "../types";

/**
 * Singleton Finnhub WebSocket with per-symbol refcounting & reconnect.
 *
 * Design notes:
 *   - One connection per browser tab, regardless of how many cards render.
 *     Opening N sockets for N cards burns the free-tier connection budget
 *     and is the most common implementation bug in demo stock trackers.
 *   - A listener Set per symbol lets many cards render the same ticker.
 *   - Refcount tracks open subscriptions per symbol. `subscribe`/`unsubscribe`
 *     messages are only sent when the count transitions 0↔1, never more.
 *   - `connectionState` notifies listeners so the UI can show the live dot.
 *   - Reconnect uses capped exponential backoff. On reconnect we resend
 *     subscribes for every symbol that still has listeners.
 */

type ConnectionState = "idle" | "connecting" | "open" | "closed";

type Store = {
  socket: WebSocket | null;
  token: string | null;
  state: ConnectionState;
  retries: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  tickListeners: Map<string, Set<(t: TradeTick) => void>>;
  refcount: Map<string, number>;
  stateListeners: Set<(s: ConnectionState) => void>;
};

const store: Store = {
  socket: null,
  token: null,
  state: "idle",
  retries: 0,
  reconnectTimer: null,
  tickListeners: new Map(),
  refcount: new Map(),
  stateListeners: new Set(),
};

function setState(next: ConnectionState) {
  store.state = next;
  for (const l of store.stateListeners) l(next);
}

function openSocket() {
  if (!store.token) return;
  if (store.socket) return;
  setState("connecting");
  const sock = new WebSocket(`wss://ws.finnhub.io?token=${store.token}`);
  store.socket = sock;

  sock.onopen = () => {
    store.retries = 0;
    setState("open");
    // Re-subscribe everything we still have listeners for (post-reconnect).
    for (const sym of store.refcount.keys()) {
      sock.send(JSON.stringify({ type: "subscribe", symbol: sym }));
    }
  };

  sock.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data) as
        | { type: "trade"; data: TradeTick[] }
        | { type: "ping" }
        | { type: "error"; msg: string };
      if (msg.type !== "trade") return;
      for (const tick of msg.data) {
        const listeners = store.tickListeners.get(tick.s);
        if (!listeners) continue;
        for (const fn of listeners) fn(tick);
      }
    } catch {
      /* ignore malformed frames */
    }
  };

  sock.onerror = () => {
    // onclose will fire next, reconnection logic lives there.
  };

  sock.onclose = () => {
    store.socket = null;
    setState("closed");
    // Capped exponential backoff: 1s, 2s, 4s, 8s, 16s (max).
    const delay = Math.min(1000 * 2 ** store.retries, 16000);
    store.retries += 1;
    store.reconnectTimer = setTimeout(() => {
      store.reconnectTimer = null;
      // Only reconnect if someone still wants data.
      if (store.refcount.size > 0) openSocket();
    }, delay);
  };
}

function ensureSocket(token: string) {
  // Token changed (user edited their key) — tear down and reopen.
  if (store.token && store.token !== token && store.socket) {
    try {
      store.socket.close();
    } catch {
      /* noop */
    }
    store.socket = null;
  }
  store.token = token;
  if (!store.socket) openSocket();
}

function send(frame: object) {
  const s = store.socket;
  if (s && s.readyState === WebSocket.OPEN) {
    s.send(JSON.stringify(frame));
  }
  // If not open yet, onopen will re-subscribe from the refcount keys.
}

function subscribe(symbol: string) {
  const prev = store.refcount.get(symbol) ?? 0;
  store.refcount.set(symbol, prev + 1);
  if (prev === 0) send({ type: "subscribe", symbol });
}

function unsubscribe(symbol: string) {
  const prev = store.refcount.get(symbol) ?? 0;
  if (prev <= 1) {
    store.refcount.delete(symbol);
    send({ type: "unsubscribe", symbol });
  } else {
    store.refcount.set(symbol, prev - 1);
  }
}

/**
 * React hook: subscribe to live trade ticks for a single symbol.
 * `onTick` is called on every arriving trade; keep it cheap.
 *
 * The caller should memoize `onTick` via `useCallback` OR wrap a ref inside
 * to avoid re-subscribing on every render. We re-subscribe whenever `onTick`
 * or `symbol` identity changes.
 */
export function useFinnhubSocket(
  token: string | null,
  symbol: string,
  onTick: (t: TradeTick) => void
) {
  useEffect(() => {
    if (!token) return;
    ensureSocket(token);

    let set = store.tickListeners.get(symbol);
    if (!set) {
      set = new Set();
      store.tickListeners.set(symbol, set);
    }
    set.add(onTick);
    subscribe(symbol);

    return () => {
      const s = store.tickListeners.get(symbol);
      if (s) {
        s.delete(onTick);
        if (s.size === 0) store.tickListeners.delete(symbol);
      }
      unsubscribe(symbol);
    };
  }, [token, symbol, onTick]);
}

/** React hook: observe the shared connection state. */
export function useFinnhubConnectionState(): ConnectionState {
  const [, forceRender] = useReducerForce();
  useEffect(() => {
    const listener = () => forceRender();
    store.stateListeners.add(listener);
    return () => {
      store.stateListeners.delete(listener);
    };
  }, [forceRender]);
  return store.state;
}

// Tiny force-update helper.
function useReducerForce(): [number, () => void] {
  const [n, dispatch] = useReducer((x: number) => x + 1, 0);
  return [n, dispatch as () => void];
}
