import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark";

/** The applicant's choice. Light unless they switched it. */
export const THEME_KEY = "civicheck-theme";
/** Set while the applicant shell is mounted. The inline script in the root
    document reads it, so a reload inside the portal paints dark straight away
    but a staff or public page never does. */
export const THEME_SCOPE_KEY = "civicheck-theme-scope";

const THEME_EVENT = "civicheck-theme-change";

function read(): ThemePreference {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setThemePreference(next: ThemePreference) {
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private mode or blocked storage: the choice lasts until the tab closes.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, read, () => "light");
}

/**
 * Runs in <head> before first paint. Dark only inside the applicant portal's
 * paths and only when the portal marked itself as the last shell, so a stale
 * choice can't darken the landing page or a staff screen.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=location.pathname;var portal=/^\\/(dashboard|services|my-requests|notifications|payment-history)(\\/|$)|^\\/apply\\/./.test(p);if(portal&&localStorage.getItem('${THEME_KEY}')==='dark'&&localStorage.getItem('${THEME_SCOPE_KEY}')==='portal'){document.documentElement.classList.add('dark')}}catch(e){}})()`;
