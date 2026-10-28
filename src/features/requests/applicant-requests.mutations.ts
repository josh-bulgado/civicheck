import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isClosedRequestStatus } from "~/features/requests/document-review";
import { loadAddableUploads } from "~/features/requests/missing-uploads.server";
import { requirementUploadKey } from "~/features/services/requirement-upload.utils";
import { requireActiveSession } from "~/server/auth";
import { getSupabaseAdminClient } from "~/utils/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;
const uuidSchema = z.string().uuid();

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
    const admin = getSupabaseAdminClient();

    const { data: attachment, error: fetchError } = await supabase
      .from("requirements_attachments")
      .select("id, request_id, requirement_name, verification_status, file_url, requests!inner(applicant_id, status)")
      .eq("id", data.attachmentId)
      .eq("requests.applicant_id", user.id)
      .maybeSingle();

    if (fetchError || !attachment) {
      return { error: true, message: "That document no longer exists." };
    }
    const request = Array.isArray(attachment.requests)
      ? attachment.requests[0]
      : attachment.requests;
    if (isClosedRequestStatus(request?.status)) {
      return { error: true, message: "This request is closed. Its documents can no longer change." };
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

    // Applicants have no write access to attachments: a direct write could mark
    // a document approved or point it at someone else's file. The ownership
    // check above is what authorizes this one, so it goes through the service
    // role, and only while the document is still the rejected one we read.
    const { data: updated, error: updateError } = await admin
      .from("requirements_attachments")
      .update({
        file_url: path,
        verification_status: "pending",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attachment.id)
      .eq("verification_status", "rejected")
      .select("id");
    if (updateError || !updated?.length) {
      await admin.storage.from("request-documents").remove([path]);
      return {
        error: true,
        message: updateError?.message ?? "This document changed while you were uploading. Refresh and try again.",
      };
    }

    // The service role can delete any file, so only ever the applicant's own.
    if (attachment.file_url !== path && attachment.file_url.startsWith(`${user.id}/`)) {
      const { error: oldFileError } = await admin.storage
        .from("request-documents")
        .remove([attachment.file_url]);
      if (oldFileError) {
        console.error("Failed to remove superseded attachment", oldFileError);
      }
    }

    // Applicants can't write the audit trail themselves; the server records it.
    const { error: logError } = await admin.from("application_logs").insert({
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

/**
 * Lets an applicant upload a document they didn't send with the request, once
 * staff have it marked incomplete. Only an empty slot on the request's own
 * checklist is accepted (see missing-uploads.ts); staff hear about it through
 * the `notify_document_added` trigger, and review it like any other upload.
 */
export const addMissingAttachmentFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    const requestId = data.get("requestId")?.toString();
    const requirementId = data.get("requirementId")?.toString();
    const subjectRole = data.get("subjectRole")?.toString() || null;
    if (!(file instanceof File)) throw new Error("Missing file");
    if (!requestId || !uuidSchema.safeParse(requestId).success) {
      throw new Error("Invalid requestId");
    }
    if (!requirementId || !uuidSchema.safeParse(requirementId).success) {
      throw new Error("Invalid requirementId");
    }
    if (subjectRole && subjectRole.length > 160) throw new Error("Invalid subjectRole");
    return { file, requestId, requirementId, subjectRole };
  })
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:view_own");
    const admin = getSupabaseAdminClient();

    if (!ALLOWED_TYPES.includes(data.file.type)) {
      return { error: true, message: "Only JPG, PNG, or PDF files are accepted." };
    }
    if (data.file.size > MAX_SIZE) {
      return { error: true, message: "Files must be 10 MB or smaller." };
    }

    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select("id, status, request_type, form_data")
      .eq("id", data.requestId)
      .eq("applicant_id", user.id)
      .maybeSingle();
    if (fetchError || !request) {
      return { error: true, message: "That request no longer exists." };
    }
    if (request.status !== "incomplete") {
      return {
        error: true,
        message: "Documents can be added only while this request is marked incomplete.",
      };
    }

    const { data: existing, error: existingError } = await supabase
      .from("requirements_attachments")
      .select("requirement_id, requirement_name, subject_role")
      .eq("request_id", request.id);
    if (existingError) {
      return { error: true, message: "This request's documents could not be checked." };
    }
    const wanted = requirementUploadKey(data.requirementId, data.subjectRole);
    const slot = (
      await loadAddableUploads(
        request,
        (existing ?? []).map((a) => ({
          requirementId: a.requirement_id,
          requirementName: a.requirement_name,
          subjectRole: a.subject_role,
        })),
      )
    ).find((candidate) =>
      requirementUploadKey(candidate.requirementId, candidate.subjectRole) === wanted,
    );
    if (!slot) {
      return {
        error: true,
        message: "This document can't be added. It may already be uploaded. Refresh and check.",
      };
    }

    const safeName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    // Storage RLS requires the first path segment to be the uploader's own id.
    const path = `${user.id}/additions/${request.id}/${slot.requirementId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("request-documents")
      .upload(path, data.file, { contentType: data.file.type, upsert: false });
    if (uploadError) {
      return { error: true, message: uploadError.message };
    }

    // Applicants have no insert access to attachments (they could add one that
    // is already approved); the checks above authorize this one.
    const { error: insertError } = await admin.from("requirements_attachments").insert({
      request_id: request.id,
      requirement_id: slot.requirementId,
      requirement_name: slot.requirementName,
      subject_role: slot.subjectRole,
      file_url: path,
    });
    if (insertError) {
      await admin.storage.from("request-documents").remove([path]);
      return { error: true, message: "The document could not be added. Try again." };
    }

    const { error: logError } = await admin.from("application_logs").insert({
      request_id: request.id,
      performed_by_profile_id: user.id,
      action_status: "document_uploaded",
      remarks: `Applicant uploaded "${slot.requirementName}".`,
    });
    if (logError) {
      console.error("Failed to write added-document audit log", logError);
    }

    return { error: false };
  });
