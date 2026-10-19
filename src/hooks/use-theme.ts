import { useCallback, useSyncExternalStore } from "react";
import { applyTheme, writeStoredTheme, type Theme } from "~/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const getServerSnapshot = (): Theme => "light";

/**
 * The theme is the `dark` class on <html>, so this needs no provider: the
 * root-level Toaster reads it the same way the header switch does.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    writeStoredTheme(next);
  }, []);

  return { theme, setTheme };
}
