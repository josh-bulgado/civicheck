import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import { requireActiveSession } from "~/server/auth";
import { toDateKey } from "~/features/queue/queue-date";
import type {
  MyTicket,
  NowServingRow,
  QueueCounter,
  QueueTicket,
} from "~/features/queue/queue.types";

/** Supabase returns embedded rows as an object or a single-element array. */
function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/** The whole counter queue for today — staff view. */
export const getTodayQueueFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await requireActiveSession("queue:manage");

  const { data, error } = await supabase
    .from("queue_tickets")
    .select(
      `id, ticket_number, lane, status, counter_id, issue_source, called_at, created_at,
       walk_in_name, request_id,
       queue_counters(name),
       requests(tracking_number, services_registry(name)),
       profiles!queue_tickets_applicant_id_fkey(first_name, last_name)`,
    )
    .eq("queue_date", toDateKey())
    .order("daily_sequence", { ascending: true });

  if (error) throw new Error(error.message);

  const tickets: QueueTicket[] = (data ?? []).map((t: any) => {
    const counter = one<{ name?: string }>(t.queue_counters);
    const request = one<{
      tracking_number?: string;
      services_registry?: { name?: string } | { name?: string }[] | null;
    }>(t.requests);
    const service = one<{ name?: string }>(request?.services_registry);
    const profile = one<{ first_name?: string; last_name?: string }>(t.profiles);

    const profileName = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : "";

    return {
      id: t.id,
      ticketNumber: t.ticket_number,
      lane: t.lane,
      status: t.status,
      counterId: t.counter_id ?? null,
      counterName: counter?.name ?? null,
      requestId: t.request_id ?? null,
      trackingNumber: request?.tracking_number ?? null,
      applicantName: profileName || t.walk_in_name || null,
      serviceName: service?.name ?? null,
      issueSource: t.issue_source,
      calledAt: t.called_at ?? null,
      createdAt: t.created_at,
    };
  });

  return tickets;
});

export const getQueueCountersFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await requireActiveSession("queue:manage");

  const { data, error } = await supabase
    .from("queue_counters")
    .select("id, name, lane, is_active")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(
    (c): QueueCounter => ({
      id: c.id,
      name: c.name,
      lane: c.lane,
      isActive: c.is_active,
    }),
  );
});

/**
 * Flat service list for walk-in encoding. Unlike getServices(), this does not
 * collapse display groups — the front desk must pick the exact service_code
 * that carries the fee.
 */
export const getEncodableServicesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await requireActiveSession("requests:encode_walkin");

  const { data, error } = await supabase
    .from("services_registry")
    .select("service_code, name, display_name, fee")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((s) => ({
    serviceCode: s.service_code,
    name: s.display_name || s.name,
    fee: Number(s.fee ?? 0),
  }));
});

/** The signed-in applicant's live ticket, with how many are ahead of them. */
export const getMyTicketFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await requireActiveSession("queue:view_own");

  const { data, error } = await supabase.rpc("queue_my_ticket");
  if (error) throw new Error(error.message);

  const row = (data ?? [])[0];
  if (!row) return null;

  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    lane: row.lane,
    status: row.status,
    counterId: row.counter_id ?? null,
    counterName: row.counter_name ?? null,
    aheadCount: Number(row.ahead_count ?? 0),
    calledAt: row.called_at ?? null,
  } satisfies MyTicket;
});

/**
 * The applicant's scheduled appointment for today, if any — the only thing
 * that makes self check-in possible.
 */
export const getTodayAppointmentFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireActiveSession("queue:view_own");

  const dateKey = toDateKey();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, appointment_status, request_id, appointment_time_slots(label), requests(tracking_number, services_registry(name))",
    )
    .eq("applicant_id", user.id)
    .eq("appointment_date", dateKey)
    .eq("appointment_status", "scheduled")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const slot = one<{ label?: string }>((data as any).appointment_time_slots);
  const request = one<{
    tracking_number?: string;
    services_registry?: { name?: string } | { name?: string }[] | null;
  }>((data as any).requests);
  const service = one<{ name?: string }>(request?.services_registry);

  return {
    id: data.id,
    requestId: data.request_id,
    slotLabel: slot?.label ?? "",
    trackingNumber: request?.tracking_number ?? "",
    serviceName: service?.name ?? "",
  };
});

/** Public display board feed. No auth, no personal data. */
export const getNowServingFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();

  const [serving, summary] = await Promise.all([
    supabase.rpc("queue_now_serving"),
    supabase.rpc("queue_lane_summary"),
  ]);

  if (serving.error) throw new Error(serving.error.message);
  if (summary.error) throw new Error(summary.error.message);

  const nowServing: NowServingRow[] = (serving.data ?? []).map((r: any) => ({
    ticketNumber: r.ticket_number,
    lane: r.lane,
    status: r.status,
    counterId: r.counter_id ?? null,
    counterName: r.counter_name ?? null,
    calledAt: r.called_at ?? null,
  }));

  const waitingByLane: Record<string, number> = {};
  for (const row of (summary.data ?? []) as any[]) {
    waitingByLane[row.lane] = Number(row.waiting_count ?? 0);
  }

  return { nowServing, waitingByLane, fetchedAt: new Date().toISOString() };
});
