import { useCallback, useEffect, useRef, useState } from "react";
import { getRequestDocumentPreviewUrlsFn } from "~/features/apply/apply.mutations";

/**
 * Signed preview links for the files staged in an upload draft, keyed by
 * storage path. Links are fetched in one batch for whatever hasn't been loaded
 * yet, so an upload that just landed gets its link without refetching the rest.
 *
 * `refresh` re-signs one path (a link that expired while the page sat open) and
 * does so at most once per path, so a file that really can't be shown doesn't
 * loop.
 */
export function useDocumentPreviewUrls(
  uploadDraftId: string | null,
  storagePaths: string[],
) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const refreshed = useRef(new Set<string>());

  const load = useCallback(
    async (paths: string[]) => {
      if (!uploadDraftId || paths.length === 0) return;
      const loaded = new Set<string>();
      try {
        const result = await getRequestDocumentPreviewUrlsFn({
          data: { storagePaths: paths, uploadDraftId },
        });
        if (!result.error) {
          setUrls((previous) => ({ ...previous, ...result.urls }));
          for (const path of Object.keys(result.urls)) loaded.add(path);
        }
      } catch {
        // Offline or the session lapsed; the row falls back to its icon.
      }
      // Anything that didn't come back may be retried when the list changes.
      for (const path of paths) {
        if (!loaded.has(path)) requested.current.delete(path);
      }
    },
    [uploadDraftId],
  );

  const pathsKey = storagePaths.join("\n");
  useEffect(() => {
    // The draft id arrives with the hydrated draft; wait for it rather than
    // marking paths as requested when nothing can be fetched yet.
    if (!uploadDraftId) return;
    const missing = pathsKey
      .split("\n")
      .filter((path) => path && !requested.current.has(path));
    if (missing.length === 0) return;
    for (const path of missing) requested.current.add(path);
    void load(missing);
  }, [pathsKey, uploadDraftId, load]);

  const refresh = useCallback(
    (path: string) => {
      if (refreshed.current.has(path)) return;
      refreshed.current.add(path);
      void load([path]);
    },
    [load],
  );

  return { urls, refresh };
}
