import { useEffect, type RefObject } from "react";

/**
 * Trap keyboard focus inside `ref` while `active` is true.
 * On activation, remembers the currently-focused element and restores it
 * when the trap deactivates — this is the bit most hand-rolled modals miss.
 *
 * Why hand-roll this instead of pulling in focus-trap-react?
 *   - The library is ~7 KB gzipped for one concern we can solve in 30 lines.
 *   - We get exactly the behavior we need, no more.
 *
 * Notes for future expansion: we don't handle Shift+Tab across shadow roots,
 * iframes, or contenteditable. None are in our app's surface.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element (or the root itself).
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(FOCUSABLE)
    );
    (focusables[0] ?? root).focus?.();

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      // Restore focus to whoever had it before the modal opened.
      previouslyFocused?.focus?.();
    };
  }, [active, ref]);
}
