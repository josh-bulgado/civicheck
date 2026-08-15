import { createServerFn } from "@tanstack/react-start";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "~/utils/supabase";
import type {
  AdminDashboardData,
  DashboardAttentionItem,
  DashboardRequestItem,
  DashboardRequestStatus,
} from "./dashboard.types";

const INTERNAL_ROLES = [
  "frontdesk",
  "staff",
  "supervisor",
  "cashier",
  "admin",
] as const;

const ROLE_LABELS: Record<(typeof INTERNAL_ROLES)[number], string> = {
  frontdesk: "Front desk",
  staff: "Processing staff",
  supervisor: "Supervisors",
  cashier: "Cashiers",
  admin: "Administrators",
};

type RequestRow = {
  id: string;
  tracking_number: string | null;
  request_type: string | null;
  status: DashboardRequestStatus;
  payment_status: string | null;
  created_at: string;
  fees_due: number | string | null;
  services_registry: { name: string | null } | Array<{ name: string | null }> | null;
};

function getServiceName(row: Pick<RequestRow, "request_type" | "services_registry">) {
  const relation = Array.isArray(row.services_registry)
    ? row.services_registry[0]
    : row.services_registry;
  return relation?.name ?? row.request_type ?? "Unspecified service";
}

function toRequestItem(row: RequestRow): DashboardRequestItem {
  return {
    id: row.id,
    trackingNumber: row.tracking_number ?? "Not assigned",
    serviceName: getServiceName(row),
    status: row.status,
    paymentStatus: row.payment_status,
    submittedAt: row.created_at,
    feeDue: Number(row.fees_due ?? 0),
  };
}

function getAttentionReason(row: RequestRow) {
  const reasons: string[] = [];
  if (row.status === "incomplete") reasons.push("Missing requirements");
  if (row.status === "pending_approval") reasons.push("Approval needed");
  if (row.status === "ready_for_release") reasons.push("Ready for claimant");
  if (row.payment_status === "unpaid") reasons.push("Payment outstanding");
  return reasons.join(" · ") || "Needs attention";
}

function assertQuery(error: { message: string } | null, label: string) {
  if (error) throw new Error(`Unable to load ${label}: ${error.message}`);
}

export const getAdminDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminDashboardData> => {
    const sessionClient = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await sessionClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await sessionClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profileError) throw new Error("Forbidden");
    if (!hasPermission((profile?.role ?? "applicant") as Role, "dashboard:admin"))
      throw new Error("Forbidden");

    const supabase = getSupabaseAdminClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const requestFields =
      "id, tracking_number, request_type, status, payment_status, created_at, fees_due, services_registry(name)";

    const [
      activeResult,
      pendingReviewResult,
      incompleteResult,
      pendingApprovalResult,
      readyForReleaseResult,
      unpaidResult,
      validationResult,
      processingResult,
      attentionResult,
      recentResult,
      demandResult,
      profilesResult,
      departmentsResult,
    ] = await Promise.all([
      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .or("status.is.null,status.not.in.(released,rejected)"),
      supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "pending_frontdesk"),
      supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "incomplete"),
      supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
      supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "ready_for_release"),
      supabase.from("requests").select("id", { count: "exact", head: true }).eq("payment_status", "unpaid"),
      supabase.from("requests").select("id", { count: "exact", head: true }).in("status", ["under_validation", "incomplete"]),
      supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "processing"),
      supabase
        .from("requests")
        .select(requestFields)
        .or("status.in.(incomplete,pending_approval,ready_for_release),payment_status.eq.unpaid")
        .order("created_at", { ascending: true })
        .limit(8),
      supabase.from("requests").select(requestFields).order("created_at", { ascending: false }).limit(8),
      supabase
        .from("requests")
        .select("request_type, services_registry(name)")
        .gte("created_at", thirtyDaysAgo),
      supabase.from("profiles").select("role, department_id").in("role", [...INTERNAL_ROLES]),
      supabase.from("departments").select("id, name").eq("is_active", true),
    ]);

    const results = [
      [activeResult, "active requests"],
      [pendingReviewResult, "pending review count"],
      [incompleteResult, "incomplete count"],
      [pendingApprovalResult, "approval count"],
      [readyForReleaseResult, "release count"],
      [unpaidResult, "payment count"],
      [validationResult, "validation pipeline"],
      [processingResult, "processing pipeline"],
      [attentionResult, "attention queue"],
      [recentResult, "recent requests"],
      [demandResult, "service demand"],
      [profilesResult, "personnel"],
      [departmentsResult, "departments"],
    ] as const;
    for (const [result, label] of results) assertQuery(result.error, label);

    const attentionItems = ((attentionResult.data ?? []) as unknown as RequestRow[]).map(
      (row): DashboardAttentionItem => ({
        ...toRequestItem(row),
        reason: getAttentionReason(row),
      }),
    );
    const recentRequests = ((recentResult.data ?? []) as unknown as RequestRow[]).map(toRequestItem);

    const demandCounts = new Map<string, number>();
    for (const row of (demandResult.data ?? []) as unknown as Array<Pick<RequestRow, "request_type" | "services_registry">>) {
      const name = getServiceName(row);
      demandCounts.set(name, (demandCounts.get(name) ?? 0) + 1);
    }
    const serviceDemand = [...demandCounts.entries()]
      .map(([serviceName, count]) => ({ serviceName, count }))
      .sort((a, b) => b.count - a.count || a.serviceName.localeCompare(b.serviceName))
      .slice(0, 5);

    const profiles = (profilesResult.data ?? []) as Array<{
      role: (typeof INTERNAL_ROLES)[number];
      department_id: string | null;
    }>;
    const roleCounts = new Map(INTERNAL_ROLES.map((role) => [role, 0]));
    for (const item of profiles)
      roleCounts.set(item.role, (roleCounts.get(item.role) ?? 0) + 1);

    const activeDepartments = new Map(
      (departmentsResult.data ?? []).map((department) => [department.id, department.name]),
    );
    const departmentCounts = new Map<string, number>();
    for (const item of profiles) {
      const departmentName = item.department_id
        ? activeDepartments.get(item.department_id)
        : undefined;
      if (departmentName)
        departmentCounts.set(
          departmentName,
          (departmentCounts.get(departmentName) ?? 0) + 1,
        );
    }

    return {
      generatedAt: new Date().toISOString(),
      counts: {
        active: activeResult.count ?? 0,
        pendingReview: pendingReviewResult.count ?? 0,
        incomplete: incompleteResult.count ?? 0,
        pendingApproval: pendingApprovalResult.count ?? 0,
        readyForRelease: readyForReleaseResult.count ?? 0,
        unpaid: unpaidResult.count ?? 0,
      },
      pipeline: {
        intake: pendingReviewResult.count ?? 0,
        validation: validationResult.count ?? 0,
        processing: processingResult.count ?? 0,
        approval: pendingApprovalResult.count ?? 0,
        release: readyForReleaseResult.count ?? 0,
      },
      attentionItems,
      recentRequests,
      serviceDemand,
      personnel: {
        total: profiles.length,
        byRole: INTERNAL_ROLES.map((role) => ({
          role,
          label: ROLE_LABELS[role],
          count: roleCounts.get(role) ?? 0,
        })),
        byDepartment: [...departmentCounts.entries()]
          .map(([departmentName, count]) => ({ departmentName, count }))
          .sort((a, b) => b.count - a.count || a.departmentName.localeCompare(b.departmentName)),
      },
    };
  },
);
