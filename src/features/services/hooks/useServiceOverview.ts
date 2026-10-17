import { useEffect, useState } from "react";
import { getServiceOverview } from "~/features/services/services.queries";
import {
  cachedServiceRead,
  invalidateServiceCache,
  peekServiceCache,
  serviceCacheKeys,
} from "~/features/services/services.cache";

export type ServiceOverview = Awaited<ReturnType<typeof getServiceOverview>>;

/**
 * A service's checklist, for the popup that shows it. Loads when `open` turns
 * true. Checklists are shared through the service cache, so reopening the popup
 * (or opening another card backed by the same service) costs no query.
 */
export function useServiceOverview(serviceCode: string, open: boolean) {
  const [overview, setOverview] = useState<ServiceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!open) return;
    const cacheKey = serviceCacheKeys.overview(serviceCode);

    const cached = peekServiceCache<ServiceOverview>(cacheKey);
    if (cached) {
      setOverview(cached);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const data = await cachedServiceRead(cacheKey, () =>
          getServiceOverview({ data: serviceCode }),
        );
        if (cancelled) return;
        setOverview(data);
      } catch {
        if (cancelled) return;
        setError("We couldn't load this checklist. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [open, serviceCode, reloadToken]);

  const retry = () => {
    invalidateServiceCache(serviceCacheKeys.overview(serviceCode));
    setReloadToken((token) => token + 1);
  };

  return { overview, loading, error, retry };
}
