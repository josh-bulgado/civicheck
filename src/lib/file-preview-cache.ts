// ─── In-memory cache for previewed files ─────────────────────────────────────
//
// Previewing an upload used to download it every time: each preview link is a
// freshly signed URL whose token changes on every request, so the browser's own
// HTTP cache never matched, and each step of the apply wizard re-fetched files
// the one before it had just shown.
//
// Files are cached here by their storage object path, which is stable (it ends
// in a timestamped name, so a path never changes content), rather than by the
// signed URL. The same key serves the apply wizard, the applicant's request page
// and the staff viewer.
//
// Deliberately memory-only. These are identity documents; writing them to
// IndexedDB or Cache Storage would leave them on disk of whichever computer
// the applicant used, which at a public terminal is someone else's problem
// later. Memory goes away with the tab, and `clearFileCache` empties it the
// moment the signed-in identity changes (see `clearCurrentUser`).
//
// The cache never stands in for authorization: a file is only reachable here
// after the server issued a signed link for it, and a cache hit just skips the
// download that link would have started.
//
// Client-only, for the reason spelled out in `features/auth/current-user.ts`: a
// module-level cache on the server would be shared by every request it serves.

const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
/** Uploads are capped at 10 MB; anything bigger isn't one of ours. */
const MAX_FILE_BYTES = 12 * 1024 * 1024;

/** Insertion order doubles as recency: the first entry is the least recent. */
const files = new Map<string, Blob>();
const inflight = new Map<string, Promise<Blob>>();
let totalBytes = 0;
/** Bumped by `clearFileCache` so a download that finishes afterwards is dropped. */
let generation = 0;

const isBrowser = () => typeof window !== "undefined";

/** `/storage/v1/object/sign/<bucket>/<object path>` → `<object path>`. */
const OBJECT_PATH = /\/object\/(?:sign|authenticated|public)\/[^/]+\/(.+)$/;

/**
 * The cache key for a file link: its storage object path, without the bucket
 * or the signed token. A URL that isn't a storage link is keyed by its path.
 */
export function fileCacheKey(url: string): string {
  try {
    const { pathname } = new URL(url, window.location.href);
    const match = OBJECT_PATH.exec(pathname);
    return decodeURIComponent(match ? match[1] : pathname);
  } catch {
    return url;
  }
}

function remember(key: string, blob: Blob) {
  if (blob.size > MAX_FILE_BYTES) return;
  const previous = files.get(key);
  if (previous) {
    totalBytes -= previous.size;
    files.delete(key);
  }
  files.set(key, blob);
  totalBytes += blob.size;
  for (const [oldest, oldBlob] of files) {
    if (totalBytes <= MAX_TOTAL_BYTES || oldest === key) break;
    files.delete(oldest);
    totalBytes -= oldBlob.size;
  }
}

/** The cached file for this link, if there is one. Marks it recently used. */
export function peekCachedFile(url: string): Blob | undefined {
  if (!isBrowser()) return undefined;
  const key = fileCacheKey(url);
  const blob = files.get(key);
  if (blob) {
    files.delete(key);
    files.set(key, blob);
  }
  return blob;
}

/**
 * The file behind a signed link, from the cache when it is there and from the
 * network (once, shared by every caller asking at the same time) when not.
 */
export function loadFile(url: string): Promise<Blob> {
  const hit = peekCachedFile(url);
  if (hit) return Promise.resolve(hit);

  const key = fileCacheKey(url);
  const pending = inflight.get(key);
  if (pending) return pending;

  const startedIn = generation;
  const request: Promise<Blob> = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`The file request failed (HTTP ${response.status}).`);
    }
    const blob = await response.blob();
    if (startedIn === generation) remember(key, blob);
    return blob;
  })().finally(() => {
    if (inflight.get(key) === request) inflight.delete(key);
  });
  inflight.set(key, request);
  return request;
}

/**
 * Seed the cache with a file the browser already holds, such as an upload that
 * just finished, so its first preview doesn't download it back. `storagePath` is
 * the object path the upload was stored under.
 */
export function primeCachedFile(storagePath: string, file: Blob) {
  if (!isBrowser()) return;
  remember(storagePath, file);
}

/** Forget one file, such as an upload the applicant just removed. */
export function evictCachedFile(storagePath: string) {
  const blob = files.get(storagePath);
  if (!blob) return;
  files.delete(storagePath);
  totalBytes -= blob.size;
}

/** Forget everything. Call whenever the signed-in identity changes. */
export function clearFileCache() {
  generation += 1;
  files.clear();
  inflight.clear();
  totalBytes = 0;
}
