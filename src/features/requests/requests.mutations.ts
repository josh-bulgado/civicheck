import { createServerFn } from "@tanstack/react-start";
import { attachmentVersionSchema } from "./previous-uploads";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { documentReviewBlockedReason } from "./document-review";
import { marriagePostingBlockedReason, needsMarriagePosting, postingToday } from "./marriage-posting";
import { fromDateKey } from "~/lib/date";
import { requireActiveSession } from "~/server/auth";
import { isDepartmentScopedRole, type Role } from "~/lib/permissions";
import {
  ALLOWED_TRANSITIONS,
  REASON_REQUIRED,
  RETURNABLE_TO_VALIDATION,
  getStatusDetails,
  isPaymentSettled,
  isRequestStatus,
  needsOfficeFinalValidation,
  type RequestStatus,
} from "~/features/requests/request-workflow";
import {
  buildDocumentRejectedEmail,
  buildPreValidationCompleteEmail,
  buildStatusChangeEmail,
  dispatchApplicantNotification,
} from "~/features/notifications/notifications.server";
import { REQUEST_CLAIM_LEASE_MS } from "~/features/requests/request-claims";
import { signAttachmentVersion } from "~/features/requests/attachment-signing.server";

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
const requestClaimSchema = z.object({
  requestId: z.string().uuid(),
});

interface ClaimedRequestRow {
  id?: string;
  status: string | null;
  claimed_by: string | null;
  claimed_stage: string | null;
  claim_expires_at: string | null;
}

function requestClaimError(
  request: ClaimedRequestRow,
  userId: string,
  now = Date.now(),
): string | null {
  if (
    request.claimed_by === userId &&
    request.claimed_stage === request.status &&
    Date.parse(request.claim_expires_at ?? "") > now
  ) {
    return null;
  }
  if (
    request.claimed_by &&
    request.claimed_stage === request.status &&
    Date.parse(request.claim_expires_at ?? "") > now
  ) {
    return "Another staff member is handling this stage.";
  }
  return "Start handling this stage before making changes.";
}

type AttachmentRequestInfo = ClaimedRequestRow & {
  services_registry:
    | { department_id?: string | null }
    | { department_id?: string | null }[]
    | null;
};

type DepartmentRequest = {
  services_registry:
    | { department_id?: string | null }
    | { department_id?: string | null }[]
    | null;
};

function requestIsOutsideDepartment(
  request: DepartmentRequest,
  role: Role,
  departmentId: string | null,
) {
  const service = Array.isArray(request.services_registry)
    ? request.services_registry[0]
    : request.services_registry;
  return isDepartmentScopedRole(role) && service?.department_id !== departmentId;
}

/** Applies the shared department, lease, and workflow guards for document edits. */
function attachmentReviewAccessError(
  request: AttachmentRequestInfo | null | undefined,
  role: Role,
  departmentId: string | null,
  userId: string,
): string | null {
  if (isDepartmentScopedRole(role)) {
    const service = Array.isArray(request?.services_registry)
      ? request.services_registry[0]
      : request?.services_registry;
    if (service?.department_id !== departmentId) {
      return "That document no longer exists.";
    }
  }
  if (!request) return "That request no longer exists.";

  const claimError = requestClaimError(request, userId);
  if (claimError) return claimError;
  return documentReviewBlockedReason(request.status);
}

/** Claim or renew the request's current stage. Expired claims are available. */
export const claimRequestStageFn = createServerFn({ method: "POST" })
  .validator(requestClaimSchema)
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession("requests:process");
    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select(
        "id, status, claimed_by, claimed_stage, claim_expires_at, services_registry(department_id)",
      )
      .eq("id", data.requestId)
      .single();

    if (
      fetchError ||
      !request ||
      requestIsOutsideDepartment(request, role, departmentId)
    ) {
      return { error: true, message: "That request no longer exists." };
    }
    if (!isRequestStatus(request.status) || ALLOWED_TRANSITIONS[request.status].length === 0) {
      return { error: true, message: "This request has no stage left to handle." };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + REQUEST_CLAIM_LEASE_MS);
    const { data: claimed, error } = await supabase
      .from("requests")
      .update({
        claimed_by: user.id,
        claimed_stage: request.status,
        claimed_at: now.toISOString(),
        claim_expires_at: expiresAt.toISOString(),
      })
      .eq("id", data.requestId)
      .eq("status", request.status)
      .or(
        `claimed_by.is.null,claimed_by.eq.${user.id},claim_expires_at.lt.${now.toISOString()}`,
      )
      .select("id");

    if (error) return { error: true, message: error.message };
    if (!claimed || claimed.length === 0) {
      return {
        error: true,
        message: "Another staff member claimed this stage first. Refresh and choose another request.",
      };
    }
    return { error: false, expiresAt: expiresAt.toISOString() };
  });

/** Release only the caller's lease; another staff member's claim is untouched. */
export const releaseRequestStageFn = createServerFn({ method: "POST" })
  .validator(requestClaimSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:process");
    const { data: released, error } = await supabase
      .from("requests")
      .update({
        claimed_by: null,
        claimed_stage: null,
        claimed_at: null,
        claim_expires_at: null,
      })
      .eq("id", data.requestId)
      .eq("claimed_by", user.id)
      .select("id");

    if (error) return { error: true, message: error.message };
    if (!released || released.length === 0) {
      return { error: true, message: "This stage is no longer claimed by you." };
    }
    return { error: false };
  });

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
        "id, status, payment_status, tracking_number, request_type, posting_start_date, claimed_by, claimed_stage, claim_expires_at, services_registry(department_id)",
      )
      .eq("id", data.requestId)
      .single();

    if (
      fetchError ||
      !request ||
      requestIsOutsideDepartment(request, role, departmentId)
    ) {
      // Same phrasing as a missing row — don't reveal a wrong-department
      // request exists.
      return { error: true, message: "That request no longer exists." };
    }

    const claimError = requestClaimError(request, user.id);
    if (claimError) return { error: true, message: claimError };

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

    if (needsMarriagePosting(request.request_type) &&
      (toStatus === "ready_for_release" || toStatus === "released")) {
      const blocked = marriagePostingBlockedReason(request.posting_start_date);
      if (blocked) return { error: true, message: blocked };
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

    const notificationContent = buildStatusChangeEmail(
      toStatus,
      request.tracking_number,
      remarks,
      request.request_type,
    );
    await dispatchApplicantNotification(supabase, data.requestId, notificationContent);

    return { error: false, status: toStatus, trackingNumber: request.tracking_number };
  });

export const saveMarriagePostingFn = createServerFn({ method: "POST" })
  .validator(z.object({
    requestId: z.string().uuid(),
    postingStartDate: z.string().refine((value) => Boolean(fromDateKey(value)), "Enter a valid posting date"),
    expectedUpdatedAt: z.string(),
  }))
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession("requests:process");
    const { data: request, error } = await supabase.from("requests")
      .select("id, request_type, status, created_at, updated_at, claimed_by, claimed_stage, claim_expires_at, services_registry(department_id)")
      .eq("id", data.requestId).single();
    if (error || !request ||
      requestIsOutsideDepartment(request, role, departmentId)) {
      return { error: true, message: "That request no longer exists." };
    }
    const claimError = requestClaimError(request, user.id);
    if (claimError) return { error: true, message: claimError };
    if (!needsMarriagePosting(request.request_type) || request.status !== "processing") {
      return { error: true, message: "Record the posting date during Processing for delayed marriage, delayed death or a marriage license." };
    }
    if (data.postingStartDate > postingToday()) {
      return { error: true, message: "The posting date cannot be in the future." };
    }
    if (data.postingStartDate < postingToday(new Date(request.created_at))) {
      return { error: true, message: "The posting date cannot precede the request." };
    }
    const { data: updated, error: updateError } = await supabase.from("requests")
      .update({ posting_start_date: data.postingStartDate })
      .eq("id", data.requestId).eq("status", "processing")
      .eq("updated_at", data.expectedUpdatedAt).select("id");
    if (updateError) return { error: true, message: updateError.message };
    if (!updated?.length) return { error: true, message: "This request changed. Refresh and try again." };
    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: data.requestId, performed_by_profile_id: user.id,
      action_status: "posting_updated",
      remarks: `Notice-posting date recorded: ${data.postingStartDate}. Posting lasts 10 calendar days.`,
    });
    if (logError) console.error("Failed to record posting audit log", logError);
    return { error: false };
  });

// Payment verification belongs to the cashier, who is not department-scoped.
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
        "id, request_id, requirement_name, verification_status, requests(status, tracking_number, request_type, claimed_by, claimed_stage, claim_expires_at, services_registry(department_id))",
      )
      .eq("id", data.attachmentId)
      .single();

    if (fetchError || !attachment) {
      return { error: true, message: "That document no longer exists." };
    }

    const requestInfo = Array.isArray(attachment.requests)
      ? attachment.requests[0]
      : attachment.requests;

    const accessError = attachmentReviewAccessError(
      requestInfo,
      role,
      departmentId,
      user.id,
    );
    if (accessError) return { error: true, message: accessError };

    const reason = data.status === "rejected" ? data.reason?.trim() : null;

    const { data: updated, error } = await supabase
      .from("requirements_attachments")
      .update({
        verification_status: data.status,
        rejection_reason: reason,
      })
      .eq("id", data.attachmentId)
      .eq("verification_status", "pending")
      .select("id");

    if (error) return { error: true, message: error.message };
    if (!updated || updated.length === 0) {
      return {
        error: true,
        message: "Another staff member already reviewed this document. Refresh and check their decision.",
      };
    }

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

      // Not for services with a final office check: "no need to visit yet" would
      // contradict the go-to-the-office notice sent when staff mark requirements
      // complete.
      if (allApproved && !needsOfficeFinalValidation(requestInfo?.request_type)) {
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
        "id, request_id, requirement_name, verification_status, requests(status, tracking_number, claimed_by, claimed_stage, claim_expires_at, services_registry(department_id))",
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

    const accessError = attachmentReviewAccessError(
      requestInfo,
      role,
      departmentId,
      user.id,
    );
    if (accessError) return { error: true, message: accessError };

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
  .validator(attachmentVersionSchema)
  .handler(async ({ data }) => {
    const { supabase, role, departmentId } = await requireActiveSession("requests:process");

    const { data: attachment, error: fetchError } = await supabase
      .from("requirements_attachments")
      .select("id, file_url, previous_uploads, requests(services_registry(department_id))")
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

    return signAttachmentVersion(supabase, attachment, data.previousIndex);
  });
