export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "civicheck-theme";

/** Only the exact string "dark" turns it on; anything else is light. */
export function parseTheme(raw: unknown): Theme {
  return raw === "dark" ? "dark" : "light";
}

/** Storage can be blocked (private windows, site data off), so every access is guarded. */
export function readStoredTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "light";
  }
}

export function writeStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The choice still applies for this session; it just won't be remembered.
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Runs in the page before first paint (see ThemeScope), so it cannot import
 * anything: it uses only `document` and `localStorage`, and keeps the key in
 * sync with THEME_STORAGE_KEY by being built from it.
 */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`;
