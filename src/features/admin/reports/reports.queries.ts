import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

const REPORT_MONTH_COUNT = 6;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1_000;
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function createReportPeriod(now: Date) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (REPORT_MONTH_COUNT - 1), 1),
  );
  const months = Array.from({ length: REPORT_MONTH_COUNT }, (_, index) => {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
    );

    return {
      key: monthKey(date),
      label: monthFormatter.format(date),
      count: 0,
    };
  });

  return { start, months };
}

/**
 * Aggregated CCRO operational reports. Only identifiers, statuses, and
 * timestamps are selected; citizen form data and attachments stay in the data
 * layer. Independent request and activity reads run in parallel.
 */
export const getCcroAdminReports = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabase } = await requireActiveSession("dashboard:admin");
    const now = new Date();
    const { start, months } = createReportPeriod(now);
    const periodStart = start.toISOString();

    const [requestsResult, activityResult] = await Promise.all([
      supabase.from("requests").select("id, status, created_at"),
      supabase
        .from("application_logs")
        .select("request_id, action_status, created_at")
        .in("action_status", ["incomplete", "released"])
        .gte("created_at", periodStart),
    ]);

    if (requestsResult.error) {
      throw new Error(
        `Could not load report request data: ${requestsResult.error.message}`,
      );
    }
    if (activityResult.error) {
      throw new Error(
        `Could not load report activity data: ${activityResult.error.message}`,
      );
    }

    const requests = requestsResult.data ?? [];
    const scopedRequests = requests.filter(
      (request) => new Date(request.created_at).getTime() >= start.getTime(),
    );
    const requestById = new Map(requests.map((request) => [request.id, request]));
    const monthByKey = new Map(months.map((month) => [month.key, month]));

    for (const request of scopedRequests) {
      const month = monthByKey.get(monthKey(new Date(request.created_at)));
      if (month) month.count += 1;
    }

    const incompleteRequestIds = new Set(
      scopedRequests
        .filter((request) => request.status === "incomplete")
        .map((request) => request.id),
    );
    const releasedAtByRequestId = new Map<string, number>();

    for (const activity of activityResult.data ?? []) {
      if (!activity.request_id) continue;

      if (
        activity.action_status === "incomplete" &&
        requestById.get(activity.request_id)?.created_at >= periodStart
      ) {
        incompleteRequestIds.add(activity.request_id);
      }

      if (activity.action_status === "released") {
        const releasedAt = new Date(activity.created_at).getTime();
        const existingReleasedAt = releasedAtByRequestId.get(activity.request_id);
        if (existingReleasedAt === undefined || releasedAt < existingReleasedAt) {
          releasedAtByRequestId.set(activity.request_id, releasedAt);
        }
      }
    }

    const processingDurations = Array.from(releasedAtByRequestId).flatMap(
      ([requestId, releasedAt]) => {
        const request = requestById.get(requestId);
        if (!request) return [];

        const submittedAt = new Date(request.created_at).getTime();
        return releasedAt >= submittedAt
          ? [(releasedAt - submittedAt) / DAY_IN_MILLISECONDS]
          : [];
      },
    );
    const averageProcessingDays =
      processingDurations.length > 0
        ? Math.round(
            (processingDurations.reduce((total, days) => total + days, 0) /
              processingDurations.length) *
              10,
          ) / 10
        : null;
    const submittedCount = scopedRequests.length;
    const incompleteCount = incompleteRequestIds.size;

    return {
      period: {
        start: periodStart,
        end: now.toISOString(),
        label: `${dateFormatter.format(start)}–${dateFormatter.format(now)}`,
      },
      requestVolume: {
        total: submittedCount,
        months,
      },
      processingTime: {
        averageDays: averageProcessingDays,
        releasedCount: processingDurations.length,
      },
      incompleteSubmissions: {
        count: incompleteCount,
        submittedCount,
        percentage:
          submittedCount > 0
            ? Math.round((incompleteCount / submittedCount) * 1_000) / 10
            : null,
      },
      generatedAt: now.toISOString(),
    };
  },
);
