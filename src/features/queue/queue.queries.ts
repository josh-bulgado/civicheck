import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import { requireActiveSession } from "~/server/auth";

export const getBookableRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireActiveSession("requests:view_own");

  const { data: requests, error } = await supabase
    .from("requests")
    .select("id, tracking_number, request_type, status, services_registry(name)")
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: booked, error: bookedError } = await supabase
    .from("appointments")
    .select("request_id")
    .eq("applicant_id", user.id)
    .neq("appointment_status", "cancelled");
  if (bookedError) throw new Error(bookedError.message);

  const bookedIds = new Set((booked ?? []).map((a) => a.request_id));

  return (requests ?? [])
    .filter((r) => !bookedIds.has(r.id))
    .map((r) => {
      const service = r.services_registry as { name?: string } | { name?: string }[] | null;
      const serviceName = Array.isArray(service) ? service[0]?.name : service?.name;
      return {
        id: r.id,
        trackingNumber: r.tracking_number,
        serviceName: serviceName || r.request_type,
        status: r.status,
      };
    });
});

export const getMyAppointmentsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireActiveSession("requests:view_own");

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, appointment_status, appointment_time_slots(label, start_time, end_time), requests(tracking_number, request_type, services_registry(name))",
    )
    .eq("applicant_id", user.id)
    .order("appointment_date", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((a) => {
    const slot = a.appointment_time_slots as
      | { label?: string; start_time?: string; end_time?: string }
      | { label?: string; start_time?: string; end_time?: string }[]
      | null;
    const slotInfo = Array.isArray(slot) ? slot[0] : slot;

    const request = a.requests as
      | { tracking_number?: string; request_type?: string; services_registry?: { name?: string } | { name?: string }[] | null }
      | { tracking_number?: string; request_type?: string; services_registry?: { name?: string } | { name?: string }[] | null }[]
      | null;
    const requestInfo = Array.isArray(request) ? request[0] : request;
    const service = requestInfo?.services_registry;
    const serviceName = Array.isArray(service) ? service[0]?.name : service?.name;

    return {
      id: a.id,
      appointmentDate: a.appointment_date,
      status: a.appointment_status,
      slotLabel: slotInfo?.label ?? "",
      trackingNumber: requestInfo?.tracking_number ?? "",
      serviceName: serviceName || requestInfo?.request_type || "",
    };
  });
});

export const getSlotAvailabilityFn = createServerFn({ method: "GET" })
  .validator((d: { date: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const { data: slots, error: slotsError } = await supabase
      .from("appointment_time_slots")
      .select("id, slot_code, label, start_time, end_time, capacity")
      .eq("is_active", true)
      .order("start_time", { ascending: true });
    if (slotsError) throw new Error(slotsError.message);

    const { data: booked, error: bookedError } = await supabase
      .from("appointments")
      .select("time_slot_id")
      .eq("appointment_date", data.date)
      .neq("appointment_status", "cancelled");
    if (bookedError) throw new Error(bookedError.message);

    const bookedCounts = new Map<string, number>();
    for (const row of booked ?? []) {
      bookedCounts.set(row.time_slot_id, (bookedCounts.get(row.time_slot_id) ?? 0) + 1);
    }

    return (slots ?? []).map((slot) => {
      const bookedCount = bookedCounts.get(slot.id) ?? 0;
      const remaining = slot.capacity == null ? null : Math.max(slot.capacity - bookedCount, 0);
      return {
        id: slot.id,
        slotCode: slot.slot_code,
        label: slot.label,
        startTime: slot.start_time,
        endTime: slot.end_time,
        remaining,
        isFull: remaining !== null && remaining <= 0,
      };
    });
  });
