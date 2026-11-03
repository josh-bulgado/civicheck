import type { SupabaseClient } from "@supabase/supabase-js";

import { AVATAR_BUCKET } from "~/lib/avatar-bucket";

export { AVATAR_BUCKET };

const SIGNED_URL_TTL_SECONDS = 60 * 60;
// Handed out again until it is close to expiring. A fresh signature on every
// page load would give the photo a new URL each time, so the browser could never
// reuse its copy and the initials would flash while it reloaded.
const REUSE_FOR_MS = (SIGNED_URL_TTL_SECONDS - 10 * 60) * 1000;

// Keyed by the object path, which starts with the owner's id and changes on
// every upload. The cache is shared by every request in the process, so a path is
// only looked up after it has been confirmed to belong to the caller.
const signedUrls = new Map<string, { url: string; reusableUntil: number }>();

/**
 * A signed link to the signed-in user's own profile photo, or null when there is
 * none or it can't be signed. Never throws: a missing photo must not stop the app
 * loading.
 */
export async function getAvatarUrl(
  supabase: SupabaseClient,
  userId: string,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path || !path.startsWith(`${userId}/`)) return null;

  const now = Date.now();
  const cached = signedUrls.get(path);
  if (cached && cached.reusableUntil > now) return cached.url;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;

  // Keep the map from growing for the life of the process.
  if (signedUrls.size > 500) {
    for (const [key, entry] of signedUrls) {
      if (entry.reusableUntil <= now) signedUrls.delete(key);
    }
  }
  signedUrls.set(path, {
    url: data.signedUrl,
    reusableUntil: now + REUSE_FOR_MS,
  });
  return data.signedUrl;
}

/** Forget a photo's link once the file is replaced or removed. */
export function forgetAvatarUrl(path: string | null | undefined) {
  if (path) signedUrls.delete(path);
}
