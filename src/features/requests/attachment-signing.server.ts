import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePreviousUploads } from "./previous-uploads";

/** Signs the current or historical file after the caller authorizes its row. */
export async function signAttachmentVersion(
  supabase: SupabaseClient,
  attachment: { file_url: string | null; previous_uploads: unknown },
  previousIndex?: number,
) {
  const fileUrl = previousIndex === undefined
    ? attachment.file_url
    : parsePreviousUploads(attachment.previous_uploads)[previousIndex]?.fileUrl;
  if (!fileUrl) return { error: true as const, message: "That version no longer exists." };

  const { data: signed, error } = await supabase.storage
    .from("request-documents")
    .createSignedUrl(fileUrl, 300);

  if (error || !signed) {
    return { error: true as const, message: "Could not generate a link for this file." };
  }
  return { error: false as const, url: signed.signedUrl };
}
