import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { hasPermission } from "~/lib/permissions";
import { requireActiveSession } from "~/server/auth";
import { getSupabaseAdminClient } from "~/utils/supabase";
import { getRequestNetworkSignal } from "./network-signal.server";
import { getSecurityCenter } from "./security-center.functions";
import {
  buildDashboard,
  MANUAL_CHECK_COOLDOWN_SECONDS,
  type RawHealthSummary,
  type RawSeriesRow,
} from "./system-health.model";
import type { SecurityGlance, SystemHealthDashboard } from "./system-admin.types";

const BYTES_PER_GB = 1024 ** 3;

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date and time.");

const maintenanceSchema = z
  .object({
    component: z.enum(["database", "authentication", "storage", "all"]),
    title: z.string().trim().min(1, "Enter a title.").max(120, "Use 120 characters or fewer."),
    note: z.string().trim().max(500, "Use 500 characters or fewer.").default(""),
    startsAt: isoDate,
    endsAt: isoDate,
  })
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    message: "The window must end after it starts.",
    path: ["endsAt"],
  });

const slowLimit = z.number().int().min(100, "Use at least 100 ms.").max(60_000, "Use 60,000 ms or fewer.");

const limitsSchema = z.object({
  database: slowLimit,
  authentication: slowLimit,
  storage: slowLimit,
  capacityGb: z.number().positive("Enter a capacity above zero.").max(1_000_000).nullable(),
});

const acknowledgeSchema = z.object({ eventId: z.string().uuid() });
const alertsSchema = z.object({ enabled: z.boolean() });

/** The Security Center numbers this page glances at. Health still loads if they cannot be read. */
async function readSecurityGlance(): Promise<SecurityGlance | null> {
  try {
    const security = await getSecurityCenter();
    return {
      posture: security.posture,
      openFindingCount: security.openFindingCount,
      overdueControlCount: security.overdueControlCount,
    };
  } catch {
    return null;
  }
}

/** The page only reads. Checking happens on a schedule and on Check Now. */
export const getSystemHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<SystemHealthDashboard> => {
    const session = await requireActiveSession("health:view");
    setResponseHeader("Cache-Control", "no-store");

    const admin = getSupabaseAdminClient();
    const [summary, series, security] = await Promise.all([
      admin.rpc("system_health_summary"),
      admin.rpc("system_health_series", { p_hours: 24 }),
      readSecurityGlance(),
    ]);

    // PostgREST reports a missing function as PGRST202: the migration has not been applied.
    if (summary.error?.code === "PGRST202") {
      throw new Error(
        "System Health needs its database migration. Apply supabase/migrations/20261024120000_system_health_monitoring.sql, then reload.",
      );
    }
    if (summary.error || !summary.data) {
      console.error("system_health_summary failed:", summary.error?.message);
      throw new Error("System health could not be loaded. Try again in a moment.");
    }
    if (series.error) console.error("system_health_series failed:", series.error.message);

    return buildDashboard({
      summary: summary.data as RawHealthSummary,
      series: (series.data ?? []) as RawSeriesRow[],
      security,
      canManage: hasPermission(session.role, "health:manage"),
    });
  },
);

/** The sidebar dot: true while an incident is open or the monitor has stopped. Cheap enough to run on every page. */
export const getHealthAttention = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  await requireActiveSession("health:view");
  setResponseHeader("Cache-Control", "no-store");
  const { data, error } = await getSupabaseAdminClient().rpc("system_health_attention");
  return !error && data === true;
});

/** Calls the same function the schedule calls, so a manual check and a scheduled one cannot differ. */
export const runHealthCheck = createServerFn({ method: "POST" }).handler(async () => {
  const session = await requireActiveSession("health:manage");
  const secret = process.env.HEALTH_PROBE_SECRET;
  const baseUrl = process.env.SUPABASE_URL;
  if (!secret || !baseUrl) {
    throw new Error(
      "Checks are not set up yet. Add HEALTH_PROBE_SECRET to .env and deploy the health-probe function.",
    );
  }

  const admin = getSupabaseAdminClient();
  const { data: last } = await admin
    .from("system_health_snapshots")
    .select("recorded_at")
    .eq("run_kind", "manual")
    .not("triggered_by", "is", null)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.recorded_at).getTime() < MANUAL_CHECK_COOLDOWN_SECONDS * 1000) {
    throw new Error("A check ran a moment ago. Wait a minute and try again.");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/functions/v1/health-probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-health-secret": secret },
      body: JSON.stringify({ run_kind: "manual", triggered_by: session.user.id }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new Error("The health-probe function did not answer. Check that it is deployed, then try again.");
  }
  if (response.status === 401) {
    throw new Error("The health-probe function rejected the secret. Use the same HEALTH_PROBE_SECRET in .env and in the function's secrets.");
  }
  if (response.status === 404) throw new Error("The health-probe function is not deployed yet.");
  if (!response.ok) throw new Error("The check could not be recorded. Try again in a moment.");

  await runHealthAction("system_health_audit_manual_run", session.user.id, {});
  return { success: true };
});

export const recordMaintenance = createServerFn({ method: "POST" })
  .validator(maintenanceSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("health:manage");
    await runHealthAction("system_health_record_maintenance", session.user.id, {
      p_component: data.component,
      p_title: data.title,
      p_note: data.note,
      p_start: new Date(data.startsAt).toISOString(),
      p_end: new Date(data.endsAt).toISOString(),
    });
    return { success: true };
  });

export const acknowledgeHealthEvent = createServerFn({ method: "POST" })
  .validator(acknowledgeSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("health:manage");
    await runHealthAction("system_health_acknowledge_event", session.user.id, { p_event: data.eventId });
    return { success: true };
  });

export const updateHealthLimits = createServerFn({ method: "POST" })
  .validator(limitsSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("health:manage");
    await runHealthAction("system_health_update_limits", session.user.id, {
      p_limits: {
        database: data.database,
        authentication: data.authentication,
        storage: data.storage,
        capacity_bytes: data.capacityGb === null ? null : Math.round(data.capacityGb * BYTES_PER_GB),
      },
    });
    return { success: true };
  });

export const setHealthAlerts = createServerFn({ method: "POST" })
  .validator(alertsSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("health:manage");
    await runHealthAction("system_health_set_alerts", session.user.id, { p_enabled: data.enabled });
    return { success: true };
  });

/**
 * Runs one of the administrative functions. Each writes its own audit entry in the same
 * transaction as the change, so an action and its record cannot come apart.
 */
async function runHealthAction(
  fn:
    | "system_health_audit_manual_run"
    | "system_health_record_maintenance"
    | "system_health_acknowledge_event"
    | "system_health_update_limits"
    | "system_health_set_alerts",
  actorId: string,
  args: Record<string, unknown>,
) {
  const { maskedIpAddress, userAgent } = getRequestNetworkSignal();
  const { error } = await getSupabaseAdminClient().rpc(fn, {
    p_actor: actorId,
    ...args,
    p_ip: maskedIpAddress,
    p_ua: userAgent,
  });
  if (error) throw new Error(error.message);
}
