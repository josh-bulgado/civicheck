import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import {
  DEFAULT_REPORT_MONTHS,
  isReportPeriodMonths,
  periodStart,
  type ReportPeriodMonths,
} from "~/features/admin/reports/service-report";

const serviceReportSchema = z.object({
  months: z.coerce
    .number()
    .refine(isReportPeriodMonths, "Unsupported reporting period")
    .default(DEFAULT_REPORT_MONTHS),
  service: z.string().trim().min(1).max(80).optional(),
});

export interface ServiceReportRow {
  key: string;
  label: string;
  departmentId: string | null;
  total: number;
  released: number;
  incomplete: number;
  rejected: number;
  pending: number;
  walkIn: number;
  eventDated: number;
  avgReleaseDays: number | null;
  releaseSample: number;
  asksPurpose: boolean;
  eventDateLabel: string | null;
  eventDateDirection: "past" | "future" | "any";
}

export interface ServiceInsight {
  serviceKey: string | null;
  sampleSize: number;
  eventDated: number;
  seasonality: Array<{ month: number; count: number }>;
  lag: Record<string, number>;
  sex: Record<string, number>;
  purpose: Record<string, number>;
  channel: { online: number; walkIn: number };
  upcoming: Array<{ date: string; count: number }>;
}

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});

const asNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

type JsonObject = Record<string, unknown>;

/** The RPC's jsonb is untyped: anything that is not an object reads as empty. */
function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asObjects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.map(asObject) : [];
}

/** jsonb objects arrive as `unknown`; keep only the numeric entries. */
function asTally(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

/**
 * Service-level report for the CCRO administrator.
 *
 * Every figure is aggregated inside Postgres by `ccro_service_report` and
 * arrives here as counts. Citizen form data, names, and attachments never
 * leave the data layer — this function has no row-level data to leak.
 *
 * The returned jsonb is narrowed to primitives before it is handed back:
 * TanStack's server-fn return validator rejects `unknown` values as
 * potentially non-serializable.
 */
export const getCcroServiceReport = createServerFn({ method: "GET" })
  .validator(serviceReportSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("dashboard:admin");

    const now = new Date();
    const start = periodStart(now, data.months as ReportPeriodMonths);
    // Exclusive upper bound one day out, so requests filed today are included
    // regardless of the time of day.
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1_000);

    const { data: report, error } = await supabase.rpc("ccro_service_report", {
      p_start: start.toISOString(),
      p_end: end.toISOString(),
      p_service: data.service ?? null,
    });

    if (error) {
      throw new Error(`Could not load the service report: ${error.message}`);
    }

    const payload = asObject(report);
    const rawServices = asObjects(payload.services);
    const rawInsight = asObject(payload.insight);
    const rawTotals = asObject(payload.totals);

    const services: ServiceReportRow[] = rawServices.map((row) => ({
      key: String(row.key),
      label: String(row.label ?? row.key),
      departmentId: row.departmentId ? String(row.departmentId) : null,
      total: asNumber(row.total),
      released: asNumber(row.released),
      incomplete: asNumber(row.incomplete),
      rejected: asNumber(row.rejected),
      pending: asNumber(row.pending),
      walkIn: asNumber(row.walkIn),
      eventDated: asNumber(row.eventDated),
      // Postgres `round(numeric)` comes back as a string over PostgREST.
      avgReleaseDays:
        row.avgReleaseDays === null || row.avgReleaseDays === undefined
          ? null
          : Number(row.avgReleaseDays),
      releaseSample: asNumber(row.releaseSample),
      asksPurpose: row.asksPurpose === true,
      eventDateLabel: row.eventDateLabel ? String(row.eventDateLabel) : null,
      eventDateDirection:
        row.eventDateDirection === "future" || row.eventDateDirection === "any"
          ? row.eventDateDirection
          : "past",
    }));

    const insight: ServiceInsight = {
      serviceKey: rawInsight.serviceKey ? String(rawInsight.serviceKey) : null,
      sampleSize: asNumber(rawInsight.sampleSize),
      eventDated: asNumber(rawInsight.eventDated),
      seasonality: asObjects(rawInsight.seasonality).map((bucket) => ({
        month: asNumber(bucket.month),
        count: asNumber(bucket.count),
      })),
      lag: asTally(rawInsight.lag),
      sex: asTally(rawInsight.sex),
      purpose: asTally(rawInsight.purpose),
      channel: {
        online: asNumber(asObject(rawInsight.channel).online),
        walkIn: asNumber(asObject(rawInsight.channel).walkIn),
      },
      upcoming: asObjects(rawInsight.upcoming).map((entry) => ({
        date: String(entry.date),
        count: asNumber(entry.count),
      })),
    };

    return {
      period: {
        months: data.months,
        start: start.toISOString(),
        end: now.toISOString(),
        label: `${dateFormatter.format(start)} – ${dateFormatter.format(now)}`,
      },
      totals: {
        requests: asNumber(rawTotals.requests),
        released: asNumber(rawTotals.released),
        incomplete: asNumber(rawTotals.incomplete),
        rejected: asNumber(rawTotals.rejected),
        pending: asNumber(rawTotals.pending),
      },
      services,
      insight,
      // The selector needs a service even when the caller named none: the RPC
      // falls back to the busiest one, so mirror that choice back to the UI.
      selectedService:
        services.find((service) => service.key === insight.serviceKey) ?? null,
      generatedAt: now.toISOString(),
    };
  });

export type ServiceReportData = Awaited<ReturnType<typeof getCcroServiceReport>>;
