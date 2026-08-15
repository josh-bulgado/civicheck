import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import {
  ALLOWED_TRANSITIONS,
  REASON_REQUIRED,
  isRequestStatus,
  type RequestStatus,
} from "~/features/requests/request-workflow";

export const advanceRequestStatusFn = createServerFn({ method: "POST" })
  .validator((d: { requestId: string; toStatus: string; remarks?: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:process");

    if (!isRequestStatus(data.toStatus)) {
      return { error: true, message: `Unknown status "${data.toStatus}".` };
    }
    const toStatus = data.toStatus as RequestStatus;

    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select("id, status, payment_status, tracking_number")
      .eq("id", data.requestId)
      .single();

    if (fetchError || !request) {
      return { error: true, message: "That request no longer exists." };
    }

    const from = request.status;
    if (!isRequestStatus(from)) {
      return { error: true, message: `Request is in an unrecognized state ("${from}").` };
    }
    if (!ALLOWED_TRANSITIONS[from].includes(toStatus)) {
      return {
        error: true,
        message: `A request cannot move from "${from}" to "${toStatus}".`,
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

    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: data.requestId,
      performed_by_profile_id: user.id,
      action_status: toStatus,
      remarks: remarks || `Moved from ${from} to ${toStatus}.`,
    });
    if (logError) {
      console.error("Failed to write request status audit log", logError);
    }

    return { error: false, status: toStatus, trackingNumber: request.tracking_number };
  });

export const verifyPaymentFn = createServerFn({ method: "POST" })
  .validator((d: { requestId: string; orNumber: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:collect_payment");

    const orNumber = data.orNumber.trim();
    if (!orNumber) {
      return { error: true, message: "Enter the official receipt number." };
    }

    const { error } = await supabase
      .from("requests")
      .update({
        payment_status: "verified",
        or_number: orNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);

    if (error) {
      if (error.code === "23505") {
        return { error: true, message: "That OR number is already recorded." };
      }
      return { error: true, message: error.message };
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
  .validator(
    (d: { attachmentId: string; status: "approved" | "rejected"; reason?: string }) => d,
  )
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("requests:process");

    if (data.status === "rejected" && !data.reason?.trim()) {
      return { error: true, message: "Say why the document was rejected." };
    }

    const { error } = await supabase
      .from("requirements_attachments")
      .update({
        verification_status: data.status,
        rejection_reason: data.status === "rejected" ? data.reason?.trim() : null,
      })
      .eq("id", data.attachmentId);

    if (error) return { error: true, message: error.message };
    return { error: false };
  });
