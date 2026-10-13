import { useEffect, useState } from "react";
import { loadFile, peekCachedFile } from "~/lib/file-preview-cache";

type CachedFileStatus = "idle" | "loading" | "ready" | "failed";

interface CachedFileState {
  /** The link this state was produced for, so a stale result is never shown. */
  link: string | null;
  src?: string;
  status: CachedFileStatus;
}

/**
 * A local `blob:` URL for the file behind a signed link, served from the
 * in-memory file cache when the file has been seen before.
 *
 * Nothing is fetched until `enabled`, which is how a thumbnail waits until it is
 * on screen and a PDF waits until its dialog opens. The object URL belongs to
 * this hook: it is revoked when the link changes, `enabled` goes false or the
 * component unmounts, so only render `src` while the hook that made it is live.
 *
 * `failed` means the download didn't work (an expired link, no connection);
 * callers can fall back to the signed link itself.
 */
export function useCachedFileUrl(
  url: string | undefined,
  enabled = true,
): { src: string | undefined; status: CachedFileStatus } {
  const link = enabled && url ? url : null;
  const [state, setState] = useState<CachedFileState>({
    link: null,
    status: "idle",
  });

  useEffect(() => {
    if (!link) {
      setState({ link: null, status: "idle" });
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;
    const show = (blob: Blob) => {
      objectUrl = URL.createObjectURL(blob);
      setState({ link, src: objectUrl, status: "ready" });
    };

    const cached = peekCachedFile(link);
    if (cached) {
      show(cached);
    } else {
      setState({ link, status: "loading" });
      loadFile(link).then(
        (blob) => {
          if (!cancelled) show(blob);
        },
        () => {
          if (!cancelled) setState({ link, status: "failed" });
        },
      );
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [link]);

  if (!link) return { src: undefined, status: "idle" };
  // The effect hasn't caught up with a new link yet: report loading rather than
  // the previous link's result.
  if (state.link !== link) return { src: undefined, status: "loading" };
  return { src: state.src, status: state.status };
}
