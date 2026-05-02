import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { Favorite, Position } from "../types";

const KEY = "stock-track:favorites";

/**
 * CRUD layer over the favorites array.
 * Position and tags are stored inline on each Favorite for locality —
 * everything you need for a row is one object.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<Favorite[]>(KEY, []);

  const add = useCallback(
    (fav: Favorite) =>
      setFavorites((prev) => {
        if (prev.some((f) => f.symbol === fav.symbol)) return prev;
        return [fav, ...prev];
      }),
    [setFavorites]
  );

  const remove = useCallback(
    (symbol: string) =>
      setFavorites((prev) => prev.filter((f) => f.symbol !== symbol)),
    [setFavorites]
  );

  const has = useCallback(
    (symbol: string) => favorites.some((f) => f.symbol === symbol),
    [favorites]
  );

  /**
   * Set or clear a position. Pass undefined to clear.
   * Passing { shares: 0 } also clears — treating 0 as "no position" is
   * friendlier than forcing users to hunt for a remove button.
   */
  const setPosition = useCallback(
    (symbol: string, position: Position | undefined) =>
      setFavorites((prev) =>
        prev.map((f) => {
          if (f.symbol !== symbol) return f;
          if (!position || position.shares <= 0) {
            const { position: _drop, ...rest } = f;
            return rest;
          }
          return { ...f, position };
        })
      ),
    [setFavorites]
  );

  /** Replace the tag list for a symbol. Empty array clears. */
  const setTags = useCallback(
    (symbol: string, tags: string[]) =>
      setFavorites((prev) =>
        prev.map((f) => {
          if (f.symbol !== symbol) return f;
          if (tags.length === 0) {
            const { tags: _drop, ...rest } = f;
            return rest;
          }
          return { ...f, tags };
        })
      ),
    [setFavorites]
  );

  /**
   * Remove a tag from every favorite that has it.
   * Returns the list of symbols that were actually affected so the caller
   * can build an undo payload (only those symbols need to be restored).
   */
  const removeTagGlobally = useCallback(
    (tag: string): string[] => {
      const affected: string[] = [];
      setFavorites((prev) =>
        prev.map((f) => {
          if (!f.tags || !f.tags.includes(tag)) return f;
          affected.push(f.symbol);
          const nextTags = f.tags.filter((t) => t !== tag);
          if (nextTags.length === 0) {
            const { tags: _drop, ...rest } = f;
            return rest;
          }
          return { ...f, tags: nextTags };
        })
      );
      return affected;
    },
    [setFavorites]
  );

  /**
   * Add a tag to every symbol in the set (no-op for symbols that already
   * have it). One atomic state update — a bulk setState rather than N
   * individual setTags calls — to avoid intermediate render churn.
   */
  const bulkAddTag = useCallback(
    (symbols: string[], tag: string) =>
      setFavorites((prev) => {
        const set = new Set(symbols);
        return prev.map((f) => {
          if (!set.has(f.symbol)) return f;
          const current = f.tags ?? [];
          if (current.includes(tag)) return f;
          return { ...f, tags: [...current, tag] };
        });
      }),
    [setFavorites]
  );

  return {
    favorites,
    add,
    remove,
    has,
    setPosition,
    setTags,
    removeTagGlobally,
    bulkAddTag,
  };
}
