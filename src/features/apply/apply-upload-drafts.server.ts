import { getSupabaseAdminClient } from "~/utils/supabase";

const ABANDONED_DRAFT_HOURS = 72;
const CLEANUP_BATCH_SIZE = 10;

/**
 * Removes a bounded batch of abandoned uploads whenever a new staging
 * session is opened. Referenced files are never deleted, even if a previous
 * submission succeeded but its final draft-status update did not.
 */
export async function cleanupAbandonedRequestUploads() {
  const admin = getSupabaseAdminClient();
  const cutoff = new Date(
    Date.now() - ABANDONED_DRAFT_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { data: drafts, error: draftsError } = await admin
    .from("request_upload_drafts")
    .select("id")
    .in("status", ["draft", "submitted"])
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(CLEANUP_BATCH_SIZE);

  if (draftsError || !drafts?.length) {
    if (draftsError) console.error("Upload-draft cleanup query failed", draftsError);
    return;
  }

  const draftIds = drafts.map((draft) => draft.id);
  const { data: files, error: filesError } = await admin
    .from("request_upload_draft_files")
    .select("draft_id, storage_path")
    .in("draft_id", draftIds);
  if (filesError) {
    console.error("Upload-draft file cleanup query failed", filesError);
    return;
  }

  for (const draftId of draftIds) {
    const draftFiles = (files ?? []).filter((file) => file.draft_id === draftId);
    const draftPaths = draftFiles.map((file) => file.storage_path);
    const referencedPaths = new Set<string>();
    if (draftPaths.length > 0) {
      const { data: attachments, error: attachmentsError } = await admin
        .from("requirements_attachments")
        .select("file_url")
        .in("file_url", draftPaths);
      if (attachmentsError) {
        console.error("Upload-draft attachment check failed", attachmentsError);
        continue;
      }
      for (const attachment of attachments ?? []) {
        referencedPaths.add(attachment.file_url);
      }
    }
    const abandoned = draftFiles.filter(
      (file) => !referencedPaths.has(file.storage_path),
    );

    if (abandoned.length > 0) {
      const abandonedPaths = abandoned.map((file) => file.storage_path);
      const { error: storageError } = await admin.storage
        .from("request-documents")
        .remove(abandonedPaths);
      if (storageError) {
        console.error("Abandoned upload removal failed", storageError);
        continue;
      }
      const { error: fileRowsError } = await admin
        .from("request_upload_draft_files")
        .delete()
        .in("storage_path", abandonedPaths);
      if (fileRowsError) {
        console.error("Abandoned upload manifest cleanup failed", fileRowsError);
        continue;
      }
    }

    const { error: deleteError } = await admin
      .from("request_upload_drafts")
      .delete()
      .eq("id", draftId);
    if (deleteError) console.error("Upload-draft cleanup failed", deleteError);
  }
}

export async function finalizeRequestUploadDraft({
  draftId,
  applicantId,
  requestId,
  submittedPaths,
}: {
  draftId: string;
  applicantId: string;
  requestId: string;
  submittedPaths: string[];
}) {
  const admin = getSupabaseAdminClient();
  const { data: files, error: filesError } = await admin
    .from("request_upload_draft_files")
    .select("storage_path")
    .eq("draft_id", draftId);
  if (filesError) {
    console.error("Upload-draft finalization query failed", filesError);
    return;
  }

  const submitted = new Set(submittedPaths);
  const unusedPaths = (files ?? [])
    .map((file) => file.storage_path)
    .filter((path) => !submitted.has(path));
  let unusedFilesRemoved = true;
  if (unusedPaths.length > 0) {
    const { data: attachments, error: attachmentsError } = await admin
      .from("requirements_attachments")
      .select("file_url")
      .in("file_url", unusedPaths);
    if (attachmentsError) {
      console.error("Unused upload attachment check failed", attachmentsError);
      unusedFilesRemoved = false;
    } else {
      const referencedPaths = new Set(
        (attachments ?? []).map((attachment) => attachment.file_url),
      );
      const removablePaths = unusedPaths.filter(
        (path) => !referencedPaths.has(path),
      );
      if (removablePaths.length > 0) {
        const { error: storageError } = await admin.storage
          .from("request-documents")
          .remove(removablePaths);
        if (storageError) {
          console.error("Unused staged upload removal failed", storageError);
          unusedFilesRemoved = false;
        } else {
          const { error: manifestError } = await admin
            .from("request_upload_draft_files")
            .delete()
            .in("storage_path", removablePaths);
          if (manifestError) {
            console.error("Unused upload manifest cleanup failed", manifestError);
            unusedFilesRemoved = false;
          }
        }
      }
    }
  }

  const { error: finalizeError } = await admin
    .from("request_upload_drafts")
    .update({
      status: "submitted",
      submitted_request_id: requestId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("applicant_id", applicantId);
  if (finalizeError) console.error("Upload-draft finalization failed", finalizeError);
  if (!finalizeError && unusedFilesRemoved) {
    const { error: deleteError } = await admin
      .from("request_upload_drafts")
      .delete()
      .eq("id", draftId)
      .eq("applicant_id", applicantId);
    if (deleteError) console.error("Finalized upload-draft cleanup failed", deleteError);
  }
}
