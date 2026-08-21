import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import { hasPermission, isDepartmentScopedRole } from "~/lib/permissions";
import {
  ALLOWED_TRANSITIONS,
  REASON_REQUIRED,
  getStatusDetails,
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
  orNumber: z.string(),
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
    // can't skip into processing while an uploaded document is still
    // pending/rejected. Requests with zero pre-uploaded attachments (walk-ins,
    // or applicants who didn't pre-upload) have nothing to check here; staff
    // validated the physical originals directly.
    if (toStatus === "processing") {
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

    // The final sign-off before release needs a supervisor/admin, not just
    // anyone who can push a request through the earlier stages.
    if (toStatus === "ready_for_release" && !hasPermission(role, "requests:approve_release")) {
      return {
        error: true,
        message: "Only a supervisor or admin can approve this request for release.",
      };
    }

    // The cashier verifies payment before the document leaves the counter.
    if (toStatus === "released" && request.payment_status !== "verified") {
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
      .update({ status: toStatus, updated_at: new Date().toISOString() })
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

    // The destination status is already shown as this log entry's heading in
    // the UI, so the fallback remark only needs to name where it came from.
    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: data.requestId,
      performed_by_profile_id: user.id,
      action_status: toStatus,
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
// granted to cashier/admin, neither of which is department-scoped.
export const verifyPaymentFn = createServerFn({ method: "POST" })
  .validator(verifyPaymentSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:collect_payment");

    const orNumber = data.orNumber.trim();
    if (!orNumber) {
      return { error: true, message: "Enter the official receipt number." };
    }

    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select("id, status")
      .eq("id", data.requestId)
      .single();

    if (fetchError || !request) {
      return { error: true, message: "That request no longer exists." };
    }
    if (request.status !== "ready_for_release") {
      return {
        error: true,
        message:
          "This request isn't ready for release yet — payment can only be verified once it's been approved for release.",
      };
    }

    const { data: updated, error } = await supabase
      .from("requests")
      .update({
        payment_status: "verified",
        or_number: orNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      // Re-assert the status we read, so a concurrent status change can't
      // slip payment through after this check passed.
      .eq("status", "ready_for_release")
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
        message: "This request is no longer ready for release. Refresh and try again.",
      };
    }

    await supabase.from("application_logs").insert({
      request_id: data.requestId,
      performed_by_profile_id: user.id,
      action_status: "payment_verified",
      remarks: `Payment verified against OR ${orNumber}.`,
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

    // Staff often go straight to reviewing documents without separately
    // clicking "Start validation" first — bump the request out of `submitted`
    // automatically so its status (and any notification below) never lags
    // behind the fact that someone is actively deciding on it.
    if (requestInfo?.status === "submitted") {
      const { data: bumped } = await supabase
        .from("requests")
        .update({ status: "under_validation", updated_at: new Date().toISOString() })
        .eq("id", attachment.request_id)
        .eq("status", "submitted")
        .select("id");
      if (bumped && bumped.length > 0) {
        await supabase.from("application_logs").insert({
          request_id: attachment.request_id,
          performed_by_profile_id: user.id,
          action_status: "under_validation",
          remarks: "Validation started automatically — a document was reviewed.",
        });
        if (requestInfo.tracking_number) {
          const startedNotification = buildStatusChangeEmail(
            "under_validation",
            requestInfo.tracking_number,
          );
          await dispatchApplicantNotification(supabase, attachment.request_id, startedNotification);
        }
      }
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
    // tell them they can finish this in person. Doesn't advance requests.status
    // any further than the auto-bump above: the authoritative in-person
    // recheck still happens at under_validation.
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
        "id, request_id, requirement_name, verification_status, requests(services_registry(department_id))",
      )
      .eq("id", data.attachmentId)
      .single();

    if (fetchError || !attachment) {
      return { error: true, message: "That document no longer exists." };
    }

    if (attachment.verification_status === "pending") {
      return { error: true, message: "This document is already pending — nothing to undo." };
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

    const reason = data.reason.trim();
    const previousStatus = attachment.verification_status;

    const { error } = await supabase
      .from("requirements_attachments")
      .update({ verification_status: "pending", rejection_reason: null })
      .eq("id", data.attachmentId);

    if (error) return { error: true, message: error.message };

    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: attachment.request_id,
      performed_by_profile_id: user.id,
      action_status: "document_reverted",
      remarks: `Reopened "${attachment.requirement_name}" (was ${previousStatus}): ${reason}`,
    });
    if (logError) {
      console.error("Failed to write attachment reversal audit log", logError);
    }

    return { error: false };
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
