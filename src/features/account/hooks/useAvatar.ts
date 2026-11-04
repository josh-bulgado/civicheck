import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { clearCurrentUser } from "~/features/auth/current-user";
import { checkAvatarFile, prepareAvatar } from "~/lib/avatar-image";
import { AVATAR_BUCKET } from "~/lib/avatar-bucket";
import { getSupabaseBrowserClient } from "~/utils/supabase-browser";
import { removeMyAvatarFn, setMyAvatarFn } from "../account.mutations";

/**
 * Keeps a local photo preview until the profile form is saved. Nothing is sent
 * to storage on selection or removal, so Cancel also discards photo changes.
 */
export function useAvatar(userId: string, savedUrl: string | null) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  // undefined keeps the saved photo; null stages its removal.
  const [draft, setDraft] = React.useState<
    { file: File; url: string } | null | undefined
  >(undefined);
  const previewUrl = draft?.url;

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // The sidebar and header read the photo off the cached identity, so it has to
  // go before the reload.
  async function refresh() {
    clearCurrentUser();
    await router.invalidate();
  }

  function select(file: File) {
    const problem = checkAvatarFile(file);
    if (problem) {
      toast.error("Unable to use that photo", { description: problem });
      return;
    }

    setDraft({ file, url: URL.createObjectURL(file) });
  }

  function remove() {
    // Removing a newly selected photo restores the original empty state.
    setDraft(savedUrl ? null : undefined);
  }

  async function save(): Promise<boolean> {
    if (draft === undefined) return true;

    setPending(true);
    try {
      let result;
      if (draft === null) {
        result = await removeMyAvatarFn();
      } else {
        const image = await prepareAvatar(draft.file);
        const client = await getSupabaseBrowserClient();
        // A new name prevents the browser from reusing the previous photo.
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await client.storage
          .from(AVATAR_BUCKET)
          .upload(path, image, { contentType: "image/jpeg", cacheControl: "3600" });
        if (uploadError) throw uploadError;

        result = await setMyAvatarFn({ data: { path } });
      }

      if (result.error) {
        toast.error("Unable to save photo", { description: result.message });
        return false;
      }

      await refresh();
      setDraft(undefined);
      toast.success(result.message);
      return true;
    } catch {
      toast.error("Unable to save photo", {
        description: "Check your connection and try again.",
      });
      return false;
    } finally {
      setPending(false);
    }
  }

  return {
    avatarUrl: draft === undefined ? savedUrl : (draft?.url ?? null),
    isDirty: draft !== undefined,
    pending,
    select,
    remove,
    save,
  };
}
