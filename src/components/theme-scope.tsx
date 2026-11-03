import { useLayoutEffect } from "react";
import { ScriptOnce } from "@tanstack/react-router";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  parseTheme,
  readStoredTheme,
} from "~/lib/theme";

/**
 * Puts the saved theme on <html> for every page. Rendered as a childless sibling
 * at the top of the body (wrapping the page in it shifted the generated ids of
 * server-rendered inputs and caused a hydration mismatch).
 *
 * Two moments: a hard load (the script runs before first paint) and a mount
 * after a client-side render (the layout effect, before paint); another tab
 * changing the choice arrives as a storage event.
 */
export function ThemeScope() {
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        applyTheme(parseTheme(event.newValue));
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      applyTheme("light");
    };
  }, []);

  return <ScriptOnce>{THEME_INIT_SCRIPT}</ScriptOnce>;
}
