import { useEffect, useLayoutEffect } from "react";
import { THEME_SCOPE_KEY, useThemePreference } from "~/lib/theme";

// useLayoutEffect warns during SSR; the class has to land before paint on the
// client, so fall back to useEffect only on the server.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Puts `.dark` on <html> while the applicant shell is on screen, following the
 * applicant's choice. Mounted with `enabled={false}` (staff, admin) or not at
 * all (public pages) it keeps the app light. Portaled dialogs and menus live
 * outside the shell, so the class has to sit on the root, not the wrapper.
 */
export function ThemeScope({ enabled = true }: { enabled?: boolean }) {
  const preference = useThemePreference();

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const clear = () => {
      root.classList.remove("dark");
      try {
        localStorage.removeItem(THEME_SCOPE_KEY);
      } catch {
        // Storage blocked: the inline script just won't pre-paint dark.
      }
    };

    if (!enabled) {
      clear();
      return;
    }
    try {
      localStorage.setItem(THEME_SCOPE_KEY, "portal");
    } catch {
      // See above.
    }
    root.classList.toggle("dark", preference === "dark");
    return clear;
  }, [enabled, preference]);

  return null;
}
