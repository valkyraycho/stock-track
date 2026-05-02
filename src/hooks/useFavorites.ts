import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { Favorite } from "../types";

const KEY = "stock-track:favorites";

/**
 * CRUD layer over the favorites array. Thin on purpose — the component
 * should never reach into localStorage directly.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<Favorite[]>(KEY, []);

  const add = useCallback(
    (fav: Favorite) =>
      setFavorites((prev) => {
        // Idempotent: don't duplicate if the user adds the same ticker twice.
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

  return { favorites, add, remove, has };
}
