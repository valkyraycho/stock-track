import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const KEY = "stock-track:standaloneTags";

/**
 * CRUD over "standalone" tags — tags that exist independently of any stock.
 *
 * Why this exists: tags are currently derived from `favorites.flatMap(f =>
 * f.tags)`. That makes them emergent — impossible to create in advance,
 * impossible to keep alive after untagging the last stock. This hook gives
 * us a separate persistence layer for tags users have explicitly created.
 *
 * The two sources are unioned in App.tsx to produce `allTags`, which both
 * `TagFilter` and `TagEditor` already consume.
 *
 * Tags are normalized to lowercase (matching the TagEditor's existing rule)
 * and sorted on write to keep UI order stable across reloads.
 */
export function useTags() {
  const [tags, setTags] = useLocalStorage<string[]>(KEY, []);

  const add = useCallback(
    (raw: string) => {
      const t = raw.trim().toLowerCase();
      if (!t) return;
      setTags((prev) => (prev.includes(t) ? prev : [...prev, t].sort()));
    },
    [setTags]
  );

  const remove = useCallback(
    (tag: string) => {
      const t = tag.trim().toLowerCase();
      setTags((prev) => prev.filter((x) => x !== t));
    },
    [setTags]
  );

  /** Check if a tag exists in the standalone set (useful for undo logic). */
  const has = useCallback(
    (tag: string) => tags.includes(tag.trim().toLowerCase()),
    [tags]
  );

  return { tags, add, remove, has };
}
