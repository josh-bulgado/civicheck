import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { documentReviewBlockedReason } from "./document-review";
import { requireActiveSession } from "~/server/auth";
import { isDepartmentScopedRole } from "~/lib/permissions";
import {
  ALLOWED_TRANSITIONS,
  REASON_REQUIRED,
  RETURNABLE_TO_VALIDATION,
  getStatusDetails,
  isPaymentSettled,
  isRequestStatus,
  type RequestStatus,
} from "~/features/requests/request-workflow";
import {
  buildDocumentRejectedEmail,
  buildPreValidationCompleteEmail,
  buildStatusChangeEmail,
  dispatchApplicantNotification,
} from "~/features/notifications/notifications.server";

const advanceRequestStatusSchema = z.object({
  requestId: z.string().uuid(),
  toStatus: z.string(),
  remarks: z.string().optional(),
});
const verifyPaymentSchema = z.object({
  requestId: z.string().uuid(),
  orNumber: z.string().optional(),
  /** Deliberate "no fee is due" tick; honoured only when the stored fee is zero. */
  confirmNoFee: z.boolean().optional(),
});
const attachmentVerificationSchema = z.object({
  attachmentId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});
const revertAttachmentVerificationSchema = z.object({
  attachmentId: z.string().uuid(),
  reason: z.string(),
});
const attachmentIdSchema = z.object({ attachmentId: z.string().uuid() });

/**
 * Processing and release both mean every uploaded requirement is accepted
 * (CLAUDE.md §4). The moment a document stops being accepted — its decision is
 * reopened, or it is rejected — the request no longer qualifies, so it goes back
 * to validation where staff can finish the re-check (and mark it incomplete if
 * need be). Any other status is left alone.
 *
 * Payment is not touched: a payment the cashier already verified stays verified
 * and carries over when the request is marked ready for release again.
 *
 * The note is audience-neutral on purpose: applicants see status entries, and
 * the staff member's reason for reopening lives in the `document_reverted` log
 * they don't see. Returns whether the request actually moved.
 */
async function returnToValidationIfNeeded(
  supabase: SupabaseClient,
  request: {
    id: string;
    status: string | null;
    trackingNumber: string | null;
    actorId: string;
  },
) {
  if (
    !isRequestStatus(request.status) ||
    !RETURNABLE_TO_VALIDATION.includes(request.status)
  ) {
    return false;
  }

  const { data: updated, error } = await supabase
    .from("requests")
    .update({ status: "under_validation", updated_at: new Date().toISOString() })
    // Re-assert the status we read, same as advanceRequestStatusFn.
    .eq("id", request.id)
    .eq("status", request.status)
    .select("id");

  if (error) {
    console.error("Failed to return request to validation", error);
    return false;
  }
  if (!updated || updated.length === 0) return false;

  const remarks = "Returned to validation — staff are re-checking a document.";
  const { error: logError } = await supabase.from("application_logs").insert({
    request_id: request.id,
    performed_by_profile_id: request.actorId,
    action_status: "under_validation",
    remarks,
  });
  if (logError) {
    console.error("Failed to write return-to-validation audit log", logError);
  }

  if (request.trackingNumber) {
    const content = buildStatusChangeEmail(
      "under_validation",
      request.trackingNumber,
      remarks,
    );
    await dispatchApplicantNotification(supabase, request.id, content);
  }
  return true;
}

export const advanceRequestStatusFn = createServerFn({ method: "POST" })
  .validator(advanceRequestStatusSchema)
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession(
      "requests:process",
    );

    if (!isRequestStatus(data.toStatus)) {
      return { error: true, message: `Unknown status "${data.toStatus}".` };
    }
    const toStatus = data.toStatus as RequestStatus;

    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select(
        "id, status, payment_status, tracking_number, services_registry(department_id)",
      )
      .eq("id", data.requestId)
      .single();

    if (fetchError || !request) {
      return { error: true, message: "That request no longer exists." };
    }

    const service = Array.isArray(request.services_registry)
      ? request.services_registry[0]
      : request.services_registry;
    if (isDepartmentScopedRole(role) && service?.department_id !== departmentId) {
      // Same phrasing as a missing row — don't reveal a wrong-department
      // request exists.
      return { error: true, message: "That request no longer exists." };
    }

    const from = request.status;
    if (!isRequestStatus(from)) {
      return { error: true, message: `Request is in an unrecognized state ("${from}").` };
    }
    if (!ALLOWED_TRANSITIONS[from].includes(toStatus)) {
      return {
        error: true,
        message: `A request can't move from "${getStatusDetails(from).label}" to "${getStatusDetails(toStatus).label}".`,
      };
    }

    // Requirement validation is the whole point of this system — a request
    // can't move into processing, or on toward release, while an uploaded
    // document is still pending/rejected. Requests with zero pre-uploaded
    // attachments (walk-ins, or applicants who didn't pre-upload) have nothing
    // to check here: a walk-in's papers were checked at the counter, and an
    // online applicant's originals are checked when they claim the document.
    if (RETURNABLE_TO_VALIDATION.includes(toStatus) || toStatus === "released") {
      const { data: attachments } = await supabase
        .from("requirements_attachments")
        .select("verification_status")
        .eq("request_id", data.requestId);
      const hasUnresolved = (attachments ?? []).some(
        (a) => a.verification_status !== "approved",
      );
      if (hasUnresolved) {
        return {
          error: true,
          message:
            "Every uploaded requirement needs to be accepted first — some are still pending or rejected.",
        };
      }
    }

    // The cashier verifies payment — or confirms a fee-free request — before
    // the document leaves the counter.
    const paymentSettled = isPaymentSettled(request.payment_status);
    if (toStatus === "released" && !paymentSettled) {
      return {
        error: true,
        message: "Payment must be verified before this request can be released.",
      };
    }

    const remarks = data.remarks?.trim();
    if (REASON_REQUIRED.includes(toStatus) && !remarks) {
      return {
        error: true,
        message: "Please give the applicant a reason for this decision.",
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from("requests")
      .update({
        status: toStatus,
        updated_at: new Date().toISOString(),
      })
      // Re-assert the status we read, so two staff acting at once can't both win.
      .eq("id", data.requestId)
      .eq("status", from)
      .select("id");

    if (updateError) {
      return { error: true, message: updateError.message };
    }
    if (!updated || updated.length === 0) {
      return {
        error: true,
        message: "Someone else just updated this request. Refresh and try again.",
      };
    }

    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: data.requestId,
      performed_by_profile_id: user.id,
      action_status: toStatus,
      // Kept audience-neutral on purpose; the applicant and staff views each
      // swap in their own descriptive note when displaying this fallback.
      remarks: remarks || `Advanced from "${getStatusDetails(from).label}".`,
    });
    if (logError) {
      console.error("Failed to write request status audit log", logError);
    }

    const notificationContent = buildStatusChangeEmail(toStatus, request.tracking_number, remarks);
    await dispatchApplicantNotification(supabase, data.requestId, notificationContent);

    return { error: false, status: toStatus, trackingNumber: request.tracking_number };
  });

// No department check needed here: "requests:collect_payment" is only ever
// granted to the cashier, who isn't department-scoped. Admin deliberately
// lacks it — the admin releases, the cashier verifies, never the same person.
export const verifyPaymentFn = createServerFn({ method: "POST" })
  .validator(verifyPaymentSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:collect_payment");

    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select("id, status, fees_due")
      .eq("id", data.requestId)
      .single();

    if (fetchError || !request) {
      return { error: true, message: "That request no longer exists." };
    }
    if (request.status !== "ready_for_release") {
      return {
        error: true,
        message:
          "This request isn't ready for release yet — payment can only be verified once it has been marked ready for release.",
      };
    }

    // Decided from the stored fee, never from the client. A fee-free request
    // still passes through the cashier, who confirms it with a tick instead of
    // an official receipt number.
    const isFeeFree = Number(request.fees_due ?? 0) <= 0;
    let orNumber: string | null = null;
    if (isFeeFree) {
      if (data.confirmNoFee !== true) {
        return { error: true, message: "Confirm that no fee is due before clearing this request." };
      }
    } else {
      orNumber = data.orNumber?.trim() ?? "";
      if (!orNumber) {
        return { error: true, message: "Enter the official receipt number." };
      }
    }

    const { data: updated, error } = await supabase
      .from("requests")
      .update({
        payment_status: "verified",
        or_number: orNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      // Re-assert everything the decision above was based on, so a concurrent
      // change can't slip payment through after this check passed: the status,
      // the stored fee (fee vs. fee-free decides whether an OR is required),
      // and that it is still unpaid (a second click must not overwrite the OR).
      .eq("status", "ready_for_release")
      .eq("fees_due", request.fees_due)
      .eq("payment_status", "unpaid")
      .select("id");

    if (error) {
      if (error.code === "23505") {
        return { error: true, message: "That OR number is already recorded." };
      }
      return { error: true, message: error.message };
    }
    if (!updated || updated.length === 0) {
      return {
        error: true,
        message: "This request changed while you were working on it. Refresh and try again.",
      };
    }

    await supabase.from("application_logs").insert({
      request_id: data.requestId,
      performed_by_profile_id: user.id,
      action_status: "payment_verified",
      remarks: isFeeFree
        ? "Fee-free request confirmed by cashier — no payment due."
        : `Payment verified against OR ${orNumber}.`,
    });

    return { error: false };
  });

export const setAttachmentVerificationFn = createServerFn({ method: "POST" })
  .validator(attachmentVerificationSchema)
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession(
      "requests:process",
    );

    if (data.status === "rejected" && !data.reason?.trim()) {
      return { error: true, message: "Say why the document was rejected." };
    }

    const { data: attachment, error: fetchError } = await supabase
      .from("requirements_attachments")
      .select(
        "id, request_id, requirement_name, requests(status, tracking_number, services_registry(department_id))",
      )
      .eq("id", data.attachmentId)
      .single();

    if (fetchError || !attachment) {
      return { error: true, message: "That document no longer exists." };
    }

    const requestInfo = Array.isArray(attachment.requests)
      ? attachment.requests[0]
      : attachment.requests;

    if (isDepartmentScopedRole(role)) {
      const service = Array.isArray(requestInfo?.services_registry)
        ? requestInfo.services_registry[0]
        : requestInfo?.services_registry;
      if (service?.department_id !== departmentId) {
        return { error: true, message: "That document no longer exists." };
      }
    }

    const blockedReason = documentReviewBlockedReason(requestInfo?.status);
    if (blockedReason) {
      return { error: true, message: blockedReason };
    }

    const reason = data.status === "rejected" ? data.reason?.trim() : null;

    const { error } = await supabase
      .from("requirements_attachments")
      .update({
        verification_status: data.status,
        rejection_reason: reason,
      })
      .eq("id", data.attachmentId);

    if (error) return { error: true, message: error.message };

    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: attachment.request_id,
      performed_by_profile_id: user.id,
      action_status: data.status === "approved" ? "document_approved" : "document_rejected",
      remarks:
        data.status === "approved"
          ? `Approved "${attachment.requirement_name}".`
          : `Rejected "${attachment.requirement_name}": ${reason}`,
    });
    if (logError) {
      console.error("Failed to write attachment verification audit log", logError);
    }

    // Normally a rejection can't land past validation (every document is
    // already accepted there, and the reopen moves the request back first), but
    // a stale page can still get here.
    if (data.status === "rejected") {
      await returnToValidationIfNeeded(supabase, {
        id: attachment.request_id,
        status: requestInfo?.status ?? null,
        trackingNumber: requestInfo?.tracking_number ?? null,
        actorId: user.id,
      });
    }

    if (data.status === "rejected" && reason) {
      const trackingNumber = requestInfo?.tracking_number;
      if (trackingNumber) {
        const notificationContent = buildDocumentRejectedEmail(
          trackingNumber,
          attachment.requirement_name,
          reason,
        );
        await dispatchApplicantNotification(supabase, attachment.request_id, notificationContent);
      }
    }

    // Once nothing's left pending, the applicant's pre-validation is done —
    // tell them so, and that there is nothing to bring in until release. This
    // does not advance the request status: staff still mark requirements
    // complete, and the originals are matched to these uploads at release.
    if (data.status === "approved") {
      const { data: siblings } = await supabase
        .from("requirements_attachments")
        .select("verification_status")
        .eq("request_id", attachment.request_id);

      const allApproved =
        !!siblings &&
        siblings.length > 0 &&
        siblings.every((s) => s.verification_status === "approved");

      if (allApproved) {
        const trackingNumber = requestInfo?.tracking_number;
        if (trackingNumber) {
          const notificationContent = buildPreValidationCompleteEmail(trackingNumber);
          await dispatchApplicantNotification(supabase, attachment.request_id, notificationContent);
        }
      }
    }

    return { error: false };
  });

export const revertAttachmentVerificationFn = createServerFn({ method: "POST" })
  .validator(revertAttachmentVerificationSchema)
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession(
      "requests:reverse_verification",
    );

    if (!data.reason.trim()) {
      return { error: true, message: "Say why this decision is being reopened." };
    }

    const { data: attachment, error: fetchError } = await supabase
      .from("requirements_attachments")
      .select(
        "id, request_id, requirement_name, verification_status, requests(status, tracking_number, services_registry(department_id))",
      )
      .eq("id", data.attachmentId)
      .single();

    if (fetchError || !attachment) {
      return { error: true, message: "That document no longer exists." };
    }

    if (attachment.verification_status === "pending") {
      return { error: true, message: "This document is already pending — nothing to undo." };
    }

    const requestInfo = Array.isArray(attachment.requests)
      ? attachment.requests[0]
      : attachment.requests;

    if (isDepartmentScopedRole(role)) {
      const service = Array.isArray(requestInfo?.services_registry)
        ? requestInfo.services_registry[0]
        : requestInfo?.services_registry;
      if (service?.department_id !== departmentId) {
        return { error: true, message: "That document no longer exists." };
      }
    }

    const blockedReason = documentReviewBlockedReason(requestInfo?.status);
    if (blockedReason) {
      return { error: true, message: blockedReason };
    }

    const reason = data.reason.trim();
    const previousStatus = attachment.verification_status;

    const { data: reopened, error } = await supabase
      .from("requirements_attachments")
      .update({ verification_status: "pending", rejection_reason: null })
      .eq("id", data.attachmentId)
      // Only the decision we read; a concurrent change is refreshed, not overwritten.
      .eq("verification_status", previousStatus)
      .select("id");

    if (error) return { error: true, message: error.message };
    if (!reopened || reopened.length === 0) {
      return {
        error: true,
        message: "Someone else just updated this document. Refresh and try again.",
      };
    }

    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: attachment.request_id,
      performed_by_profile_id: user.id,
      action_status: "document_reverted",
      remarks: `Reopened "${attachment.requirement_name}" (was ${previousStatus}): ${reason}`,
    });
    if (logError) {
      console.error("Failed to write attachment reversal audit log", logError);
    }

    // Reopening a decision means this document is no longer accepted, so a
    // request already in processing or release has to be re-validated.
    const returnedToValidation = await returnToValidationIfNeeded(supabase, {
      id: attachment.request_id,
      status: requestInfo?.status ?? null,
      trackingNumber: requestInfo?.tracking_number ?? null,
      actorId: user.id,
    });

    return { error: false, returnedToValidation };
  });

export const getAttachmentSignedUrlFn = createServerFn({ method: "GET" })
  .validator(attachmentIdSchema)
  .handler(async ({ data }) => {
    const { supabase, role, departmentId } = await requireActiveSession("requests:process");

    const { data: attachment, error: fetchError } = await supabase
      .from("requirements_attachments")
      .select("id, file_url, requests(services_registry(department_id))")
      .eq("id", data.attachmentId)
      .single();

    if (fetchError || !attachment) {
      return { error: true, message: "That document no longer exists." };
    }

    if (isDepartmentScopedRole(role)) {
      const request = Array.isArray(attachment.requests)
        ? attachment.requests[0]
        : attachment.requests;
      const service = Array.isArray(request?.services_registry)
        ? request.services_registry[0]
        : request?.services_registry;
      if (service?.department_id !== departmentId) {
        return { error: true, message: "That document no longer exists." };
      }
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("request-documents")
      .createSignedUrl(attachment.file_url, 300);

    if (signError || !signed) {
      return { error: true, message: "Could not generate a link for this file." };
    }

    return { error: false, url: signed.signedUrl };
  });
