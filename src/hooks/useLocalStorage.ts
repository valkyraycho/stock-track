import { useCallback, useSyncExternalStore } from "react";

/**
 * Typed, cross-tab-synced localStorage hook.
 *
 * Why `useSyncExternalStore` instead of `useState` + `useEffect`?
 *   - It's React 18's canonical API for subscribing to browser-level
 *     sources that change outside React.
 *   - We get free cross-tab sync by listening to the window `storage` event,
 *     which fires in *other* tabs when localStorage is written in this one.
 *     Users who open the app in two tabs see favorites stay in sync.
 *   - It plays nicely with concurrent rendering — no tearing.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) onChange();
      };
      window.addEventListener("storage", handler);
      // Same-tab writes don't fire `storage`; we dispatch a custom event
      // from the setter below to trigger re-render in the tab that wrote.
      const local = () => onChange();
      window.addEventListener(`local-storage:${key}`, local);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(`local-storage:${key}`, local);
      };
    },
    [key]
  );

  const getSnapshot = useCallback((): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

  // Deserialize. If parse fails (e.g. stored value was corrupted by an older
  // version of the app), fall back to default rather than crashing the render.
  let value: T;
  if (raw === null) {
    value = defaultValue;
  } else {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = defaultValue;
    }
  }

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(value) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
        window.dispatchEvent(new Event(`local-storage:${key}`));
      } catch {
        // Storage full or blocked — nothing we can do in UI here.
      }
    },
    [key, value]
  );

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      window.dispatchEvent(new Event(`local-storage:${key}`));
    } catch {
      /* ignore */
    }
  }, [key]);

  return [value, setValue, remove];
}
