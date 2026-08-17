import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

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

/** Every request in the office pipeline. */
export const getAllRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await requireActiveSession("requests:view_all");

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

  return (data ?? []).map((row: any): StaffRequestRow => {
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
});

export const getRequestDetailFn = createServerFn({ method: "GET" })
  .validator((d: { requestId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("requests:view_all");

    const { data: row, error } = await supabase
      .from("requests")
      .select(
        `id, tracking_number, request_type, status, payment_status, or_number,
         fees_due, form_data, applicant_id, created_at, updated_at,
         services_registry(name, display_name, processing_time, department_id, departments(id, name)),
         profiles(first_name, last_name)`,
      )
      .eq("id", data.requestId)
      .single();

    if (error || !row) throw new Error(error?.message ?? "Request not found");

    const [attachments, logs] = await Promise.all([
      supabase
        .from("requirements_attachments")
        .select("id, requirement_name, file_url, verification_status, rejection_reason, created_at")
        .eq("request_id", data.requestId)
        .order("created_at", { ascending: true }),
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

    const service = one<ServiceEmbed>((row as any).services_registry);

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
        return {
          id: l.id,
          actionStatus: l.action_status,
          remarks: l.remarks,
          createdAt: l.created_at,
          actorName: actor
            ? `${actor.first_name ?? ""} ${actor.last_name ?? ""}`.trim() || "System"
            : "System",
        };
      }),
    };
  });
