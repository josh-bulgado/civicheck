import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import { bucketRequestVolume } from "~/features/admin/reports/report-volume";
import {
  DEFAULT_REPORT_MONTHS,
  isReportPeriodMonths,
  periodStart,
  type ReportPeriodMonths,
} from "~/features/admin/reports/service-report";

const volumeSchema = z.object({
  months: z.coerce
    .number()
    .refine(isReportPeriodMonths, "Unsupported reporting period")
    .default(DEFAULT_REPORT_MONTHS),
});

/** PostgREST returns at most this many rows a call, so a long period is read in pages. */
const PAGE_SIZE = 1_000;

/**
 * Requests received per month (per quarter for the longest period).
 *
 * Only the submission time is selected, so no citizen data leaves the data
 * layer. Everything else on the Reports page (outcomes, turnaround, sent-back
 * counts, services) comes from `ccro_service_report`, so the page has one
 * definition of each figure.
 */
export const getCcroRequestVolume = createServerFn({ method: "GET" })
  .validator(volumeSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("dashboard:admin");
    const now = new Date();
    const since = periodStart(now, data.months as ReportPeriodMonths).toISOString();

    const createdAt: string[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: rows, error } = await supabase
        .from("requests")
        .select("created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Could not load request volume: ${error.message}`);
      }
      createdAt.push(...(rows ?? []).map((row) => row.created_at));
      if ((rows?.length ?? 0) < PAGE_SIZE) break;
    }

    return {
      buckets: bucketRequestVolume(createdAt, data.months as ReportPeriodMonths, now),
      generatedAt: now.toISOString(),
    };
  });

export type RequestVolumeData = Awaited<ReturnType<typeof getCcroRequestVolume>>;
