import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import { hasPermission, isDepartmentScopedRole } from "~/lib/permissions";
import { getSupabaseAdminClient } from "~/utils/supabase";
import {
  buildNewMessageEmail,
  dispatchApplicantNotification,
} from "~/features/notifications/notifications.server";
import {
  MESSAGE_FLOOD_WINDOW_MINUTES,
  isFlooded,
  normalizeMessageBody,
  type MessageSenderRole,
} from "~/features/requests/request-messages";

const postMessageSchema = z.object({
  requestId: z.string().uuid(),
  body: z.string(),
});

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/** SQLSTATE `program_limit_exceeded`, raised by enforce_request_message_caps. */
const RATE_LIMIT_SQLSTATE = "54000";

const FLOOD_MESSAGE =
  "You've sent a lot of messages in a short time. Please wait a while before sending another.";

// Same wording for a missing request and one the caller may not see, so a
// wrong-department or wrong-applicant request cannot be told apart from none.
const NOT_FOUND = { error: true as const, message: "That request no longer exists." };

/**
 * Posts one message on a request.
 *
 * Clients have no INSERT grant on `request_messages`; this is the only writer.
 * The request is read with the caller's own client, so RLS has already hidden
 * anything they may not see, and the checks below add the rules RLS cannot
 * express (the service switch, walk-ins, the flood limit).
 */
export const postRequestMessageFn = createServerFn({ method: "POST" })
  .validator(postMessageSchema)
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession();

    const isApplicant = hasPermission(role, "requests:view_own");
    const isPersonnel = hasPermission(role, "requests:process");
    if (!isApplicant && !isPersonnel) {
      return {
        error: true as const,
        message: "You can't send messages on this request.",
      };
    }
    const senderRole: MessageSenderRole = isApplicant ? "applicant" : "staff";

    const normalized = normalizeMessageBody(data.body);
    if (!normalized.ok) {
      return { error: true as const, message: normalized.message };
    }

    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select(
        "id, tracking_number, applicant_id, services_registry(allows_messages, department_id)",
      )
      .eq("id", data.requestId)
      .maybeSingle();
    if (fetchError || !request) return NOT_FOUND;

    const service = one<{ allows_messages: boolean; department_id: string | null }>(
      (request as any).services_registry,
    );
    if (!service?.allows_messages) {
      return {
        error: true as const,
        message: "Messages aren't available for this request.",
      };
    }
    // A walk-in has no account, so nobody could read the thread.
    if (!request.applicant_id) {
      return {
        error: true as const,
        message: "This request has no applicant account to message.",
      };
    }

    if (isApplicant) {
      if (request.applicant_id !== user.id) return NOT_FOUND;
    } else if (
      isDepartmentScopedRole(role) &&
      service.department_id !== departmentId
    ) {
      return NOT_FOUND;
    }

    const admin = getSupabaseAdminClient();

    const since = new Date(
      Date.now() - MESSAGE_FLOOD_WINDOW_MINUTES * 60_000,
    ).toISOString();
    const { count, error: countError } = await admin
      .from("request_messages")
      .select("id", { count: "exact", head: true })
      .eq("request_id", request.id)
      .eq("sender_id", user.id)
      .gte("created_at", since);
    if (countError) {
      return {
        error: true as const,
        message: "We couldn't send your message. Please try again.",
      };
    }
    // A fast path only. The database trigger enforce_request_message_caps is
    // the authority: it holds a per-sender lock, so parallel requests cannot
    // slip past this count, and it also caps a sender across all requests.
    if (isFlooded(count ?? 0)) {
      return { error: true as const, message: FLOOD_MESSAGE };
    }

    const { data: inserted, error: insertError } = await admin
      .from("request_messages")
      .insert({
        request_id: request.id,
        sender_id: user.id,
        sender_role: senderRole,
        body: normalized.body,
      })
      .select("id")
      .single();
    if (insertError?.code === RATE_LIMIT_SQLSTATE) {
      return { error: true as const, message: FLOOD_MESSAGE };
    }
    if (insertError || !inserted) {
      return {
        error: true as const,
        message: "We couldn't send your message. Please try again.",
      };
    }

    // Applicant messages notify staff through the database trigger. Staff
    // messages notify the applicant here, with the staff member's own client,
    // like every other applicant notification.
    if (senderRole === "staff") {
      await dispatchApplicantNotification(
        supabase,
        request.id,
        buildNewMessageEmail(request.tracking_number),
      );
    }

    return { error: false as const, id: inserted.id as string };
  });
