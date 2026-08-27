import { createServerFn } from "@tanstack/react-start";
import { toDateKey } from "~/lib/date";
import {
  STAGE_LABELS,
  STAGE_OF,
  isRequestStatus,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import { STAGES } from "~/features/requests/request-queue";
import { requireActiveSession } from "~/server/auth";

/**
 * Presentation-safe operational totals for the CCRO administrator.
 *
 * The query deliberately selects only fields needed for aggregation. Citizen
 * names, request contents, and uploaded documents never leave the data layer.
 */
export const getCcroAdminOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabase } = await requireActiveSession("dashboard:admin");
    const officeDate = toDateKey();

    const requestsResult = await supabase.from("requests").select("status, payment_status");

    if (requestsResult.error) {
      throw new Error(`Could not load request metrics: ${requestsResult.error.message}`);
    }

    const stageCounts = Object.fromEntries(
      STAGES.map((stage) => [stage, 0]),
    ) as Record<WorkflowStage, number>;
    let incompleteRequests = 0;
    let readyForReleaseUnpaid = 0;

    for (const request of requestsResult.data ?? []) {
      if (!isRequestStatus(request.status)) continue;

      if (request.status === "incomplete") incompleteRequests += 1;
      if (
        request.status === "ready_for_release" &&
        request.payment_status !== "verified"
      ) {
        readyForReleaseUnpaid += 1;
      }

      // Rejected and released requests are complete. Keep the overview focused
      // on work that can still move through the office pipeline.
      if (request.status === "rejected" || request.status === "released") continue;
      stageCounts[STAGE_OF[request.status]] += 1;
    }

    const stages = STAGES.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      count: stageCounts[stage],
    }));

    return {
      officeDate,
      requests: {
        openTotal: stages.reduce((total, stage) => total + stage.count, 0),
        stages,
        incomplete: incompleteRequests,
        readyForReleaseUnpaid,
      },
    };
  },
);
