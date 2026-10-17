import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { clearCurrentUser } from "~/features/auth/current-user";
import { checkAvatarFile, prepareAvatar } from "~/lib/avatar-image";
import { AVATAR_BUCKET } from "~/lib/avatar-bucket";
import { getSupabaseBrowserClient } from "~/utils/supabase-browser";
import { removeMyAvatarFn, setMyAvatarFn } from "../account.mutations";

/**
 * Changing and removing the signed-in person's profile photo. The browser
 * uploads straight to storage (the bucket's policies keep it to the person's own
 * folder) and the server then makes that file their photo.
 */
export function useAvatar(userId: string) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  // The sidebar and header read the photo off the cached identity, so it has to
  // go before the reload.
  async function refresh() {
    clearCurrentUser();
    await router.invalidate();
  }

  async function upload(file: File) {
    const problem = checkAvatarFile(file);
    if (problem) {
      toast.error("Unable to use that photo", { description: problem });
      return;
    }

    setPending(true);
    try {
      const image = await prepareAvatar(file);
      const client = await getSupabaseBrowserClient();
      // A new name every time, so the browser never shows the old photo from
      // its cache and the previous file is simply deleted afterwards.
      const path = `${userId}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await client.storage
        .from(AVATAR_BUCKET)
        .upload(path, image, { contentType: "image/jpeg", cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const result = await setMyAvatarFn({ data: { path } });
      if (result.error) {
        toast.error("Unable to save photo", { description: result.message });
        return;
      }

      toast.success(result.message);
      await refresh();
    } catch {
      toast.error("Unable to upload photo", {
        description: "Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const result = await removeMyAvatarFn();
      if (result.error) {
        toast.error("Unable to remove photo", { description: result.message });
        return;
      }

      toast.success(result.message);
      await refresh();
    } catch {
      toast.error("Unable to remove photo", {
        description: "Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return { pending, upload, remove };
}
