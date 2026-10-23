import { createServerFn } from "@tanstack/react-start";
import { toDateKey } from "~/lib/date";
import { one } from "~/lib/embed";
import { TERMINAL_STATUSES } from "~/features/requests/request-workflow";
import { loadCcroStaff } from "~/features/admin/staff/staff.server";
import {
  summarizeOpenRequests,
  summarizeServices,
  summarizeTeam,
  type OpenRequestRow,
} from "~/features/admin/overview/overview-metrics";
import type { ServiceClassification } from "~/features/admin/services/services.types";
import { requireActiveSession } from "~/server/auth";

type SessionSupabase = Awaited<ReturnType<typeof requireActiveSession>>["supabase"];

/** PostgREST returns at most this many rows per request, so larger sets are paged. */
const PAGE_SIZE = 1000;

type OpenRequestRecord = {
  id: string;
  tracking_number: string;
  request_type: string | null;
  status: string;
  payment_status: string | null;
  updated_at: string;
  services_registry:
    | { name: string | null; display_name: string | null }
    | Array<{ name: string | null; display_name: string | null }>
    | null;
};

/**
 * Every request that can still move, with only the columns the overview reads.
 * Citizen names, request contents and uploaded documents never leave the data
 * layer. Paged so an office with thousands of open requests is counted in full
 * rather than cut off at the first page.
 */
async function loadOpenRequests(supabase: SessionSupabase): Promise<OpenRequestRow[]> {
  const rows: OpenRequestRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("requests")
      .select(
        "id, tracking_number, request_type, status, payment_status, updated_at, services_registry(name, display_name)",
      )
      .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not load request metrics: ${error.message}`);
    }

    const page = (data ?? []) as OpenRequestRecord[];
    for (const row of page) {
      const service = one(row.services_registry);
      rows.push({
        id: row.id,
        trackingNumber: row.tracking_number,
        serviceName: service?.display_name || service?.name || row.request_type || "—",
        status: row.status,
        paymentStatus: row.payment_status ?? "unpaid",
        updatedAt: row.updated_at,
      });
    }

    if (page.length < PAGE_SIZE) return rows;
  }
}

async function loadServiceClassifications(supabase: SessionSupabase) {
  const { data, error } = await supabase
    .from("services_registry")
    .select("classification");

  if (error) {
    throw new Error(`Could not load service metrics: ${error.message}`);
  }
  return (data ?? []).map(
    (row) => row.classification as ServiceClassification | null,
  );
}

/**
 * Presentation-safe operational totals for the CCRO administrator: where the
 * open requests sit, which have waited too long for staff, and the size of the
 * team and service list the administrator manages.
 */
export const getCcroAdminOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabase } = await requireActiveSession("dashboard:admin");
    const now = Date.now();

    const [openRequests, { staff }, classifications] = await Promise.all([
      loadOpenRequests(supabase),
      loadCcroStaff(),
      loadServiceClassifications(supabase),
    ]);

    return {
      officeDate: toDateKey(),
      requests: summarizeOpenRequests(openRequests, now),
      team: summarizeTeam(staff),
      services: summarizeServices(classifications),
    };
  },
);
