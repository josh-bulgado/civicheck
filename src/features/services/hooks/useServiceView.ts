import { useCallback, useEffect, useState } from "react";

/**
 * How the service directory lays itself out. Both densities carry the same
 * fields and the same actions — which one reads better is the applicant's
 * call, not the page's, so the choice is theirs and it sticks.
 */
export type ServiceView = "cards" | "rows";

const STORAGE_KEY = "civicheck.services.view";
const DEFAULT_VIEW: ServiceView = "cards";

function isServiceView(value: string | null): value is ServiceView {
  return value === "cards" || value === "rows";
}

/**
 * Reads and stores the applicant's density preference.
 *
 * The stored value can't seed `useState` directly: this route is
 * server-rendered, so touching `localStorage` during the first render would
 * make the client disagree with the markup it is hydrating. Hydrate in an
 * effect instead — the same shape as `useApplyDraft`.
 */
export function useServiceView() {
  const [view, setView] = useState<ServiceView>(DEFAULT_VIEW);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isServiceView(stored)) setView(stored);
    } catch {
      // storage unavailable — the default density still works
    }
  }, []);

  const chooseView = useCallback((next: ServiceView) => {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable — the choice still holds for this session
    }
  }, []);

  return { view, chooseView };
}
