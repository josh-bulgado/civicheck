import { createServerFn } from "@tanstack/react-start";
import { loadAddableUploads } from "./missing-uploads.server";
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
  needsOriginalDocumentCheck,
  type RequestStatus,
} from "~/features/requests/request-workflow";
import {
  buildDocumentRejectedEmail,
  buildPreValidationCompleteEmail,
  buildStatusChangeEmail,
  buildCashierClearedEmail,
  dispatchApplicantNotification,
} from "~/features/notifications/notifications.server";
import { REQUEST_CLAIM_LEASE_MS } from "~/features/requests/request-claims";
import { signAttachmentVersion } from "~/features/requests/attachment-signing.server";

const advanceRequestStatusSchema = z.object({
  requestId: z.string().uuid(),
  toStatus: z.string(),
  originalsConfirmed: z.boolean().optional(),
  identityVerified: z.boolean().optional(),
  handoverConfirmed: z.boolean().optional(),
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

/** Notify only after the database has committed a return to validation. */
async function notifyReturnToValidation(
  supabase: SupabaseClient,
  request: { id: string; trackingNumber: string | null },
) {
  if (request.trackingNumber) {
    const content = buildStatusChangeEmail(
      "under_validation", request.trackingNumber,
      "Returned to validation — staff are re-checking a document.",
    );
    await dispatchApplicantNotification(supabase, request.id, content);
  }
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
        "id, status, payment_status, fees_due, tracking_number, request_type, form_data, registration_conversion, posting_start_date, claimed_by, claimed_stage, claim_expires_at, services_registry(department_id)",
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
        .select("verification_status, requirement_id, requirement_name, subject_role")
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
      if (request.registration_conversion) {
        const missing = await loadAddableUploads(request, (attachments ?? []).map((doc) => ({
          requirementId: doc.requirement_id,
          requirementName: doc.requirement_name,
          subjectRole: doc.subject_role,
        })));
        if (missing.some((doc) => doc.isMandatory)) {
          return { error: true, message: "The additional required documents for delayed registration must be uploaded before continuing." };
        }
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

    let originalsAlreadyChecked = false;
    if (toStatus === "released" && needsOriginalDocumentCheck(request.request_type, "ready_for_release")) {
      const { data: checked, error } = await supabase.rpc("has_current_original_document_check", {
        p_request_id: data.requestId,
      });
      if (error) return { error: true, message: error.message };
      originalsAlreadyChecked = checked === true;
    }
    if (needsOriginalDocumentCheck(request.request_type, toStatus, originalsAlreadyChecked) && data.originalsConfirmed !== true) {
      return { error: true, message: "Confirm that you checked the original documents before continuing." };
    }
    if (toStatus === "released" && data.identityVerified !== true) {
      return { error: true, message: "Confirm that you verified the claimant's identity and authority." };
    }
    if (toStatus === "released" && request.request_type !== "EMAIL_INQUIRY" && data.handoverConfirmed !== true) {
      return { error: true, message: "Confirm that you are handing over the document." };
    }
    const remarks = data.remarks?.trim();
    const returning = toStatus === "under_validation" && RETURNABLE_TO_VALIDATION.includes(from);
    if (returning && !remarks) {
      return { error: true, message: "Explain what needs rechecking before returning to validation." };
    }
    if (REASON_REQUIRED.includes(toStatus) && !remarks) {
      return {
        error: true,
        message: "Please give the applicant a reason for this decision.",
      };
    }

    const { error: updateError } = await supabase.rpc("save_staff_request_action", {
      p_request_id: data.requestId,
      p_expected_status: from,
      p_action: "status",
      p_values: {
        status: toStatus,
        originals_confirmed: data.originalsConfirmed === true,
        identity_verified: data.identityVerified === true,
        handover_confirmed: data.handoverConfirmed === true,
      },
      p_remarks: remarks || `Advanced from "${getStatusDetails(from).label}".`,
    });
    if (updateError) return { error: true, message: updateError.message };

    const notificationContent = buildStatusChangeEmail(
      toStatus,
      request.tracking_number,
      remarks,
      request.request_type,
      { paymentStatus: request.payment_status, feesDue: Number(request.fees_due ?? 0) },
      data.requestId,
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
    const { error: updateError } = await supabase.rpc("save_staff_request_action", {
      p_request_id: data.requestId,
      p_expected_status: request.status,
      p_action: "posting_updated",
      p_values: {
        posting_start_date: data.postingStartDate,
        expected_updated_at: data.expectedUpdatedAt,
      },
      p_remarks: `Notice-posting date recorded: ${data.postingStartDate}. Posting lasts 10 calendar days.`,
    });
    if (updateError) return { error: true, message: updateError.message };
    return { error: false };
  });

// Payment verification belongs to the cashier, who is not department-scoped.
export const verifyPaymentFn = createServerFn({ method: "POST" })
  .validator(verifyPaymentSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("requests:collect_payment");

    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select("id, status, fees_due, tracking_number, request_type")
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

    const { error } = await supabase.rpc("save_staff_request_action", {
      p_request_id: data.requestId,
      p_expected_status: request.status,
      p_action: "payment_verified",
      p_values: { fees_due: request.fees_due, or_number: orNumber, confirm_no_fee: data.confirmNoFee === true },
      p_remarks: isFeeFree
        ? "Fee-free request confirmed by cashier — no payment due."
        : `Payment verified against OR ${orNumber}.`,
    });
    if (error) {
      return { error: true, message: error.code === "23505" ? "That OR number is already recorded." : error.message };
    }

    if (request.request_type !== "EMAIL_INQUIRY" && request.tracking_number) {
      await dispatchApplicantNotification(supabase, data.requestId, buildCashierClearedEmail(request.tracking_number));
    }
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

    const { data: returnedToValidation, error } = await supabase.rpc("save_staff_request_action", {
      p_request_id: attachment.request_id,
      p_expected_status: requestInfo?.status,
      p_action: "document_review",
      p_attachment_id: data.attachmentId,
      p_expected_verification: "pending",
      p_values: { verification_status: data.status, rejection_reason: reason },
      p_remarks: data.status === "approved"
        ? `Approved "${attachment.requirement_name}".`
        : `Rejected "${attachment.requirement_name}": ${reason}`,
    });
    if (error) return { error: true, message: error.message };
    if (returnedToValidation) {
      await notifyReturnToValidation(supabase, {
        id: attachment.request_id,
        trackingNumber: requestInfo?.tracking_number ?? null,
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

    const { data: returnedToValidation, error } = await supabase.rpc("save_staff_request_action", {
      p_request_id: attachment.request_id,
      p_expected_status: requestInfo?.status,
      p_action: "document_reverted",
      p_attachment_id: data.attachmentId,
      p_expected_verification: previousStatus,
      p_values: {},
      p_remarks: `Reopened "${attachment.requirement_name}" (was ${previousStatus}): ${reason}`,
    });
    if (error) return { error: true, message: error.message };
    if (returnedToValidation) {
      await notifyReturnToValidation(supabase, {
        id: attachment.request_id,
        trackingNumber: requestInfo?.tracking_number ?? null,
      });
    }

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
