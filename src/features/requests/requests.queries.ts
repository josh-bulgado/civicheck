import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import { isDepartmentScopedRole } from "~/lib/permissions";

const trackingLookupSchema = z.object({ trackingNumber: z.string().min(1) });
const requestIdSchema = z.object({ requestId: z.string().uuid() });

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export interface StaffRequestRow {
  id: string;
  trackingNumber: string;
  status: string;
  paymentStatus: string;
  serviceName: string;
  departmentId: string | null;
  departmentName: string;
  applicantName: string;
  feesDue: number;
  isWalkIn: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Label for a request whose service hasn't been routed to a department yet. */
export const UNASSIGNED_DEPARTMENT = "Unassigned";

type ServiceEmbed = {
  name?: string;
  display_name?: string;
  processing_time?: string;
  department_id?: string | null;
  departments?: { id: string; name: string } | { id: string; name: string }[] | null;
  event_date_label?: string | null;
  event_place_label?: string | null;
  reference_number_label?: string | null;
};

/**
 * A request is targeted at the department that owns its service — there is no
 * per-request routing column (see the 20260817120000 migration).
 */
function departmentOf(service: ServiceEmbed | undefined) {
  const department = one<{ id: string; name: string }>(service?.departments);
  return {
    departmentId: department?.id ?? service?.department_id ?? null,
    departmentName: department?.name ?? UNASSIGNED_DEPARTMENT,
  };
}

function applicantNameOf(row: any): string {
  const profile = one<{ first_name?: string; last_name?: string }>(row.profiles);
  const fromProfile = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "";
  if (fromProfile) return fromProfile;

  const form = row.form_data ?? {};
  const fromForm = `${form.subject_first_name ?? ""} ${form.subject_last_name ?? ""}`.trim();
  return fromForm || "—";
}

/**
 * Every request in the office pipeline — or, for a department-scoped role
 * (staff/supervisor), every request belonging to their own department only.
 * This filter is applied here, server-side, before the data ever reaches the
 * browser — it is not a UI-only restriction.
 */
export const getAllRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, role, departmentId } = await requireActiveSession("requests:view_all");

  const { data, error } = await supabase
    .from("requests")
    .select(
      `id, tracking_number, request_type, status, payment_status, fees_due, form_data,
       applicant_id, created_at, updated_at,
       services_registry(name, display_name, department_id, departments(id, name)),
       profiles(first_name, last_name)`,
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row: any): StaffRequestRow => {
    const service = one<ServiceEmbed>(row.services_registry);
    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      status: row.status,
      paymentStatus: row.payment_status,
      serviceName: service?.display_name || service?.name || row.request_type || "—",
      ...departmentOf(service),
      applicantName: applicantNameOf(row),
      feesDue: Number(row.fees_due ?? 0),
      isWalkIn: row.applicant_id == null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  if (isDepartmentScopedRole(role)) {
    return departmentId ? rows.filter((r) => r.departmentId === departmentId) : [];
  }
  return rows;
});

export interface CashierLookupResult {
  id: string;
  trackingNumber: string;
  status: string;
  paymentStatus: string;
  orNumber: string | null;
  feesDue: number;
  applicantName: string;
  serviceName: string;
}

/**
 * Counter lookup by tracking number, for the cashier's payment desk. Returns
 * only what a cashier needs to collect payment — no `form_data`, no
 * attachments, no logs — deliberately narrower than `getRequestDetailFn`.
 */
export const lookupRequestByTrackingFn = createServerFn({ method: "GET" })
  .validator(trackingLookupSchema)
  .handler(async ({ data }): Promise<CashierLookupResult | null> => {
    const { supabase } = await requireActiveSession("requests:collect_payment");

    const trackingNumber = data.trackingNumber.trim();
    if (!trackingNumber) return null;

    const { data: row, error } = await supabase
      .from("requests")
      .select(
        `id, tracking_number, status, payment_status, or_number, fees_due,
         subject_first_name:form_data->>subject_first_name,
         subject_last_name:form_data->>subject_last_name,
         services_registry(name, display_name),
         profiles(first_name, last_name)`,
      )
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return null;

    const service = one<ServiceEmbed>((row as any).services_registry);
    const profile = one<{ first_name?: string; last_name?: string }>(
      (row as any).profiles,
    );
    const applicantName =
      (profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "") ||
      `${(row as any).subject_first_name ?? ""} ${(row as any).subject_last_name ?? ""}`.trim() ||
      "—";

    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      status: row.status,
      paymentStatus: row.payment_status,
      orNumber: row.or_number,
      feesDue: Number(row.fees_due ?? 0),
      applicantName,
      serviceName: service?.display_name || service?.name || "—",
    };
  });

/** How many requests are ready for release but still unpaid, for the cashier dashboard. */
export const getAwaitingPaymentCountFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await requireActiveSession("requests:collect_payment");

  const { count, error } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "ready_for_release")
    .neq("payment_status", "verified");

  if (error) throw new Error(error.message);
  return count ?? 0;
});

export interface PaymentHistoryRow {
  id: string;
  trackingNumber: string;
  applicantName: string;
  serviceName: string;
  orNumber: string | null;
  feesDue: number;
  verifiedAt: string;
  verifiedBy: string;
}

/** Today's verified payments, for the cashier's end-of-day reconciliation. */
export const getPaymentHistoryFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PaymentHistoryRow[]> => {
    const { supabase } = await requireActiveSession("requests:collect_payment");

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("application_logs")
      .select(
        `id, created_at,
         profiles(first_name, last_name),
         requests(tracking_number, fees_due, or_number,
           services_registry(name, display_name),
           profiles(first_name, last_name),
           subject_first_name:form_data->>subject_first_name,
           subject_last_name:form_data->>subject_last_name)`,
      )
      .eq("action_status", "payment_verified")
      .gte("created_at", startOfToday.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).flatMap((log: any): PaymentHistoryRow[] => {
      const request = one<any>(log.requests);
      if (!request) return [];

      const service = one<ServiceEmbed>(request.services_registry);
      const applicantProfile = one<{ first_name?: string; last_name?: string }>(
        request.profiles,
      );
      const applicantName =
        (applicantProfile
          ? `${applicantProfile.first_name ?? ""} ${applicantProfile.last_name ?? ""}`.trim()
          : "") ||
        `${request.subject_first_name ?? ""} ${request.subject_last_name ?? ""}`.trim() ||
        "—";

      const verifier = one<{ first_name?: string; last_name?: string }>(log.profiles);
      const verifiedBy = verifier
        ? `${verifier.first_name ?? ""} ${verifier.last_name ?? ""}`.trim() || "System"
        : "System";

      return [
        {
          id: log.id,
          trackingNumber: request.tracking_number,
          applicantName,
          serviceName: service?.display_name || service?.name || "—",
          orNumber: request.or_number,
          feesDue: Number(request.fees_due ?? 0),
          verifiedAt: log.created_at,
          verifiedBy,
        },
      ];
    });
  },
);

/** How many payments the cashier has verified today, for the dashboard. */
export const getPaymentsVerifiedTodayCountFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabase } = await requireActiveSession("requests:collect_payment");

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("application_logs")
      .select("id", { count: "exact", head: true })
      .eq("action_status", "payment_verified")
      .gte("created_at", startOfToday.toISOString());

    if (error) throw new Error(error.message);
    return count ?? 0;
  },
);

/** What department (if any) the caller is scoped to, for UI display. */
export const getMyDepartmentScopeFn = createServerFn({ method: "GET" }).handler(async () => {
  const { role, departmentId, departmentName } = await requireActiveSession();
  return {
    isScoped: isDepartmentScopedRole(role),
    departmentId,
    departmentName,
  };
});

export type RequestDetail = Awaited<ReturnType<typeof getRequestDetailFn>>;

export const getRequestDetailFn = createServerFn({ method: "GET" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    const { supabase, role, departmentId } = await requireActiveSession("requests:view_all");

    const { data: row, error } = await supabase
      .from("requests")
      .select(
        `id, tracking_number, request_type, status, payment_status, or_number,
         fees_due, form_data, applicant_id, created_at, updated_at,
         services_registry(name, display_name, processing_time, department_id, departments(id, name),
           event_date_label, event_place_label, reference_number_label),
         profiles(first_name, last_name)`,
      )
      .eq("id", data.requestId)
      .single();

    if (error || !row) throw new Error(error?.message ?? "Request not found");

    const service = one<ServiceEmbed>((row as any).services_registry);
    // Same "not found" phrasing as a missing row — a department-scoped staff
    // member shouldn't be able to tell a wrong-department request even exists.
    if (isDepartmentScopedRole(role) && departmentOf(service).departmentId !== departmentId) {
      throw new Error("Request not found");
    }

    const [attachments, logs] = await Promise.all([
      supabase
        .from("requirements_attachments")
        .select("id, requirement_name, file_url, verification_status, rejection_reason, uploaded_at")
        .eq("request_id", data.requestId)
        .order("uploaded_at", { ascending: true }),
      supabase
        .from("application_logs")
        .select(
          "id, action_status, remarks, created_at, profiles(first_name, last_name)",
        )
        .eq("request_id", data.requestId)
        .order("created_at", { ascending: true }),
    ]);

    if (attachments.error) throw new Error(attachments.error.message);
    if (logs.error) throw new Error(logs.error.message);

    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      status: row.status,
      paymentStatus: row.payment_status,
      orNumber: row.or_number,
      feesDue: Number(row.fees_due ?? 0),
      // Narrowed to primitives: TanStack's server-fn return validator rejects
      // `unknown` values as potentially non-serializable.
      formData: (row.form_data ?? {}) as Record<string, string | number | boolean | null>,
      isWalkIn: row.applicant_id == null,
      serviceName: service?.display_name || service?.name || row.request_type,
      ...departmentOf(service),
      processingTime: service?.processing_time ?? null,
      eventDateLabel: service?.event_date_label ?? null,
      eventPlaceLabel: service?.event_place_label ?? null,
      referenceNumberLabel: service?.reference_number_label ?? null,
      applicantName: applicantNameOf(row),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attachments: (attachments.data ?? []).map((a) => ({
        id: a.id,
        requirementName: a.requirement_name,
        fileUrl: a.file_url,
        verificationStatus: a.verification_status,
        rejectionReason: a.rejection_reason,
      })),
      logs: (logs.data ?? []).map((l: any) => {
        const actor = one<{ first_name?: string; last_name?: string }>(l.profiles);
        const fallbackActor = l.action_status === "document_resubmitted" ? "Applicant" : "System";
        return {
          id: l.id,
          actionStatus: l.action_status,
          remarks: l.remarks,
          createdAt: l.created_at,
          actorName: actor
            ? `${actor.first_name ?? ""} ${actor.last_name ?? ""}`.trim() || fallbackActor
            : fallbackActor,
        };
      }),
    };
  });
