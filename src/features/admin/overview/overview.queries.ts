import { createServerFn } from "@tanstack/react-start";
import { toDateKey } from "~/features/queue/queue-date";
import {
  STAGE_LABELS,
  STAGE_OF,
  isRequestStatus,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import { requireActiveSession } from "~/server/auth";

const WORKFLOW_STAGES = [1, 2, 3, 4, 5] as const;
const ACTIVE_QUEUE_STATUSES = ["called", "serving"];

/**
 * Presentation-safe operational totals for the CCRO administrator.
 *
 * The query deliberately selects only fields needed for aggregation. Citizen
 * names, request contents, and uploaded documents never leave the data layer.
 */
export const getCcroAdminOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabase } = await requireActiveSession("dashboard:admin");
    const queueDate = toDateKey();

    const [requestsResult, queueResult] = await Promise.all([
      supabase.from("requests").select("status, payment_status"),
      supabase
        .from("queue_tickets")
        .select("status, lane")
        .eq("queue_date", queueDate),
    ]);

    if (requestsResult.error) {
      throw new Error(`Could not load request metrics: ${requestsResult.error.message}`);
    }
    if (queueResult.error) {
      throw new Error(`Could not load queue metrics: ${queueResult.error.message}`);
    }

    const stageCounts: Record<WorkflowStage, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
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

    let waiting = 0;
    let active = 0;
    let servedToday = 0;
    const waitingByLane: Record<string, number> = {};

    for (const ticket of queueResult.data ?? []) {
      if (ticket.status === "waiting") {
        waiting += 1;
        waitingByLane[ticket.lane] = (waitingByLane[ticket.lane] ?? 0) + 1;
      }
      if (ACTIVE_QUEUE_STATUSES.includes(ticket.status)) active += 1;
      if (ticket.status === "served") servedToday += 1;
    }

    const stages = WORKFLOW_STAGES.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      count: stageCounts[stage],
    }));

    return {
      queueDate,
      requests: {
        openTotal: stages.reduce((total, stage) => total + stage.count, 0),
        stages,
        incomplete: incompleteRequests,
        readyForReleaseUnpaid,
      },
      queue: {
        waiting,
        active,
        servedToday,
        waitingByLane,
      },
    };
  },
);
