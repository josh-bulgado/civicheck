import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

/** Signed file URL for an applicant viewing their own uploaded document. */
export const getMyAttachmentSignedUrlFn = createServerFn({ method: "GET" })
  .validator((d: { attachmentId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:view_own");

    const { data: attachment, error: fetchError } = await supabase
      .from("requirements_attachments")
      .select("id, file_url, requests!inner(applicant_id)")
      .eq("id", data.attachmentId)
      .eq("requests.applicant_id", user.id)
      .maybeSingle();

    if (fetchError || !attachment) {
      return { error: true, message: "That document no longer exists." };
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("request-documents")
      .createSignedUrl(attachment.file_url, 300);

    if (signError || !signed) {
      return { error: true, message: "Could not generate a link for this file." };
    }

    return { error: false, url: signed.signedUrl };
  });

/** Lets an applicant replace a rejected document from inside the authed app. */
export const resubmitOwnAttachmentFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    const attachmentId = data.get("attachmentId")?.toString();
    if (!(file instanceof File)) throw new Error("Missing file");
    if (!attachmentId) throw new Error("Missing attachmentId");
    return { file, attachmentId };
  })
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:view_own");

    const { data: attachment, error: fetchError } = await supabase
      .from("requirements_attachments")
      .select("id, request_id, requirement_name, verification_status, requests!inner(applicant_id)")
      .eq("id", data.attachmentId)
      .eq("requests.applicant_id", user.id)
      .maybeSingle();

    if (fetchError || !attachment) {
      return { error: true, message: "That document no longer exists." };
    }
    if (attachment.verification_status !== "rejected") {
      return { error: true, message: "Only a rejected document can be resubmitted." };
    }

    if (!ALLOWED_TYPES.includes(data.file.type)) {
      return { error: true, message: "Only JPG, PNG, or PDF files are accepted." };
    }
    if (data.file.size > MAX_SIZE) {
      return { error: true, message: "Files must be 10 MB or smaller." };
    }

    const safeName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    // Storage RLS requires the first path segment to be the uploader's own
    // auth.uid() (see "Applicants upload to their own document folder").
    const path = `${user.id}/resubmissions/${attachment.request_id}/${attachment.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("request-documents")
      .upload(path, data.file, { contentType: data.file.type, upsert: false });
    if (uploadError) {
      return { error: true, message: uploadError.message };
    }

    const { error: updateError } = await supabase
      .from("requirements_attachments")
      .update({
        file_url: path,
        verification_status: "pending",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attachment.id);
    if (updateError) {
      return { error: true, message: updateError.message };
    }

    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: attachment.request_id,
      performed_by_profile_id: user.id,
      action_status: "document_resubmitted",
      remarks: `Applicant resubmitted "${attachment.requirement_name}" after rejection.`,
    });
    if (logError) {
      console.error("Failed to write attachment resubmission audit log", logError);
    }

    return { error: false };
  });
