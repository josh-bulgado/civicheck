import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { insertRequestWithTrackingNumber } from "~/features/requests/tracking-number";
import { isQueueLane, type QueueLane } from "~/features/queue/queue.types";
import { toDateKey } from "~/features/queue/queue-date";

type TicketRow = { id: string; ticket_number: string; lane: string; status: string };

function laneError(lane: string) {
  return { error: true as const, message: `"${lane}" is not a valid queue lane.` };
}

/** Applicant taps "I'm here" on the day of their appointment. */
export const selfCheckInFn = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string; lane?: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("queue:view_own");

    const lane: QueueLane = isQueueLane(data.lane ?? null)
      ? (data.lane as QueueLane)
      : "application";

    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("id, request_id, appointment_date, appointment_status")
      .eq("id", data.appointmentId)
      .eq("applicant_id", user.id)
      .maybeSingle();

    if (apptError) return { error: true, message: apptError.message };
    if (!appointment) {
      return { error: true, message: "We couldn't find that appointment." };
    }
    if (appointment.appointment_date !== toDateKey()) {
      return { error: true, message: "You can only check in on the day of your visit." };
    }
    if (appointment.appointment_status !== "scheduled") {
      return { error: true, message: "This appointment is no longer scheduled." };
    }

    const { data: ticket, error } = await supabase.rpc("issue_queue_ticket", {
      p_lane: lane,
      p_issue_source: "self_checkin",
      p_request_id: appointment.request_id,
      p_appointment_id: appointment.id,
      p_applicant_id: user.id,
      p_walk_in_name: null,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: true, message: "You're already checked in for this lane today." };
      }
      return { error: true, message: error.message };
    }

    await supabase
      .from("appointments")
      .update({ appointment_status: "attended" })
      .eq("id", appointment.id);

    const row = ticket as TicketRow;
    return { error: false, ticketNumber: row.ticket_number };
  });

/** Front desk issues a ticket for someone who already has a request. */
export const issueTicketByTrackingFn = createServerFn({ method: "POST" })
  .validator((d: { trackingNumber: string; lane: string }) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("queue:manage");

    if (!isQueueLane(data.lane)) return laneError(data.lane);

    const trackingNumber = data.trackingNumber.trim().toUpperCase();
    if (!trackingNumber) {
      return { error: true, message: "Enter a tracking number." };
    }

    const { data: request, error: reqError } = await supabase
      .from("requests")
      .select("id, applicant_id, tracking_number")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (reqError) return { error: true, message: reqError.message };
    if (!request) {
      return { error: true, message: `No request found for ${trackingNumber}.` };
    }

    const { data: ticket, error } = await supabase.rpc("issue_queue_ticket", {
      p_lane: data.lane,
      p_issue_source: "frontdesk",
      p_request_id: request.id,
      p_appointment_id: null,
      p_applicant_id: request.applicant_id,
      p_walk_in_name: null,
    });

    if (error) {
      if (error.code === "23505") {
        return {
          error: true,
          message: "That request already has a live ticket in this lane today.",
        };
      }
      return { error: true, message: error.message };
    }

    const row = ticket as TicketRow;
    return { error: false, ticketNumber: row.ticket_number };
  });

/**
 * Walk-in with no prior request: front desk creates a minimal request and a
 * ticket together, so the person is tracked from the moment they arrive.
 */
export const encodeWalkInFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      serviceCode: string;
      fee: number;
      lane: string;
      subjectFirstName: string;
      subjectLastName: string;
      purpose?: string;
      contactNumber?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:encode_walkin");

    if (!isQueueLane(data.lane)) return laneError(data.lane);

    const firstName = data.subjectFirstName.trim();
    const lastName = data.subjectLastName.trim();
    if (!firstName || !lastName) {
      return { error: true, message: "Enter the applicant's first and last name." };
    }
    if (!data.serviceCode) {
      return { error: true, message: "Pick the service being requested." };
    }

    const created = await insertRequestWithTrackingNumber(supabase, {
      // No account: the walk-in is identified by name on the request itself.
      applicant_id: null,
      request_type: data.serviceCode,
      fees_due: data.fee,
      form_data: {
        subject_first_name: firstName,
        subject_last_name: lastName,
        purpose: data.purpose?.trim() || null,
        contact_number: data.contactNumber?.trim() || null,
        encoded_by: user.id,
        intake_channel: "walk_in",
      },
    });

    if (created.error) return { error: true, message: created.message };

    const { data: ticket, error } = await supabase.rpc("issue_queue_ticket", {
      p_lane: data.lane,
      p_issue_source: "walk_in",
      p_request_id: created.requestId,
      p_appointment_id: null,
      p_applicant_id: null,
      p_walk_in_name: `${firstName} ${lastName}`,
    });

    if (error) return { error: true, message: error.message };

    await supabase.from("application_logs").insert({
      request_id: created.requestId,
      performed_by_profile_id: user.id,
      action_status: "submitted",
      remarks: "Walk-in encoded at the front desk.",
    });

    const row = ticket as TicketRow;
    return {
      error: false,
      trackingNumber: created.trackingNumber,
      ticketNumber: row.ticket_number,
    };
  });

export const callNextFn = createServerFn({ method: "POST" })
  .validator((d: { lane: string; counterId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("queue:manage");

    if (!isQueueLane(data.lane)) return laneError(data.lane);

    const { data: ticket, error } = await supabase.rpc("call_next_ticket", {
      p_lane: data.lane,
      p_counter_id: data.counterId,
    });

    if (error) return { error: true, message: error.message };
    if (!ticket) {
      return { error: true, message: "Nobody is waiting in this lane." };
    }

    const row = ticket as TicketRow;
    return { error: false, ticketNumber: row.ticket_number };
  });

const TICKET_ACTIONS = {
  serving: { status: "serving", stamp: "served_at" },
  served: { status: "served", stamp: "completed_at" },
  no_show: { status: "no_show", stamp: "completed_at" },
  cancelled: { status: "cancelled", stamp: "completed_at" },
} as const;

export const updateTicketStatusFn = createServerFn({ method: "POST" })
  .validator((d: { ticketId: string; action: keyof typeof TICKET_ACTIONS }) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("queue:manage");

    const action = TICKET_ACTIONS[data.action];
    if (!action) {
      return { error: true, message: `Unknown queue action "${data.action}".` };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("queue_tickets")
      .update({ status: action.status, [action.stamp]: now, updated_at: now })
      .eq("id", data.ticketId);

    if (error) return { error: true, message: error.message };
    return { error: false };
  });
