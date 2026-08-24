import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdminClient } from "~/utils/supabase";

const NOT_FOUND_MESSAGE =
  "We couldn't find a request matching that tracking number and last name.";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * Re-runs the same tracking-number + last-name two-factor lookup used by
 * `trackRequestFn`. Used by any unauthenticated action that needs to prove
 * the caller actually owns this request before touching it — always return
 * the exact same generic not-found message on every failure branch, never
 * reveal whether the tracking number exists but the name didn't match.
 */
async function verifyTrackingAccess(trackingNumberRaw: string, lastNameRaw: string) {
  const trackingNumber = trackingNumberRaw.trim().toUpperCase();
  const lastName = lastNameRaw.trim().toLowerCase();
  if (!trackingNumber || !lastName) return null;

  const supabase = getSupabaseAdminClient();
  const { data: request, error } = await supabase
    .from("requests")
    .select(
      "id, tracking_number, request_type, status, payment_status, created_at, fees_due, form_data, services_registry(name)",
    )
    .eq("tracking_number", trackingNumber)
    .maybeSingle();

  if (error || !request) return null;

  const formData = (request.form_data ?? {}) as Record<string, unknown>;
  const storedLastName = String(formData.subject_last_name ?? "").trim().toLowerCase();
  if (!storedLastName || storedLastName !== lastName) return null;

  return { supabase, request };
}

export const trackRequestFn = createServerFn({ method: "POST" })
  .validator((d: { trackingNumber: string; lastName: string }) => d)
  .handler(async ({ data }) => {
    // Public, unauthenticated lookup — intentionally crosses the normal
    // "applicants can only see their own requests" RLS boundary, so the
    // admin client is used deliberately here. The tracking number alone is
    // guessable at scale, so last name is required as a second factor.
    const verified = await verifyTrackingAccess(data.trackingNumber, data.lastName);
    if (!verified) return { error: true, message: NOT_FOUND_MESSAGE };
    const { supabase, request } = verified;

    const { data: attachments, error: attachmentsError } = await supabase
      .from("requirements_attachments")
      .select("id, requirement_name, subject_role, verification_status, rejection_reason")
      .eq("request_id", request.id)
      .order("uploaded_at", { ascending: true });

    if (attachmentsError) {
      return { error: true, message: NOT_FOUND_MESSAGE };
    }

    const service = request.services_registry as { name?: string } | { name?: string }[] | null;
    const serviceName = Array.isArray(service) ? service[0]?.name : service?.name;

    return {
      error: false,
      request: {
        trackingNumber: request.tracking_number,
        serviceName: serviceName || request.request_type,
        status: request.status,
        paymentStatus: request.payment_status,
        feesDue: request.fees_due,
        createdAt: request.created_at,
        attachments: (attachments ?? []).map((a) => ({
          id: a.id,
          requirementName: a.requirement_name,
          subjectRole: a.subject_role,
          verificationStatus: a.verification_status,
          rejectionReason: a.rejection_reason,
        })),
      },
    };
  });

export const resubmitAttachmentFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    const attachmentId = data.get("attachmentId")?.toString();
    const trackingNumber = data.get("trackingNumber")?.toString();
    const lastName = data.get("lastName")?.toString();
    if (!(file instanceof File)) throw new Error("Missing file");
    if (!attachmentId || !trackingNumber || !lastName) throw new Error("Missing fields");
    return { file, attachmentId, trackingNumber, lastName };
  })
  .handler(async ({ data }) => {
    const verified = await verifyTrackingAccess(data.trackingNumber, data.lastName);
    if (!verified) return { error: true, message: NOT_FOUND_MESSAGE };
    const { supabase, request } = verified;

    const { data: attachment, error: attachmentError } = await supabase
      .from("requirements_attachments")
      .select("id, request_id, requirement_name, verification_status")
      .eq("id", data.attachmentId)
      .eq("request_id", request.id)
      .maybeSingle();

    if (attachmentError || !attachment) {
      return { error: true, message: NOT_FOUND_MESSAGE };
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
    const path = `resubmissions/${request.id}/${attachment.id}/${Date.now()}-${safeName}`;

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
      request_id: request.id,
      performed_by_profile_id: null,
      action_status: "document_resubmitted",
      remarks: `Applicant resubmitted "${attachment.requirement_name}" after rejection.`,
    });
    if (logError) {
      console.error("Failed to write attachment resubmission audit log", logError);
    }

    return { error: false };
  });
