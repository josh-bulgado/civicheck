import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/** The applicant's own request list — feeds `/my-requests`. */
export const getMyRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireActiveSession("requests:view_own");

  const { data, error } = await supabase
    .from("requests")
    .select(
      `id, tracking_number, request_type, status, payment_status, created_at,
       fees_due, form_data, services_registry(name)`,
    )
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
});

/**
 * The applicant's own single-request detail — feeds `/my-requests/$requestId`.
 * Mirrors `getRequestDetailFn` (the staff version) but scoped to the caller's
 * own request instead of department, and without the staff-only remarks UI.
 */
export const getMyRequestDetailFn = createServerFn({ method: "GET" })
  .validator((d: { requestId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:view_own");

    const { data: row, error } = await supabase
      .from("requests")
      .select(
        `id, tracking_number, request_type, status, payment_status,
         fees_due, form_data, created_at, updated_at,
         services_registry(name, display_name, processing_time)`,
      )
      .eq("id", data.requestId)
      .eq("applicant_id", user.id)
      .single();

    if (error || !row) throw new Error(error?.message ?? "Request not found");

    const service = one<{ name?: string; display_name?: string; processing_time?: string }>(
      row.services_registry,
    );

    const [attachments, logs] = await Promise.all([
      supabase
        .from("requirements_attachments")
        .select("id, requirement_name, verification_status, rejection_reason, uploaded_at")
        .eq("request_id", data.requestId)
        .order("uploaded_at", { ascending: true }),
      supabase
        .from("application_logs")
        .select("id, action_status, remarks, created_at")
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
      feesDue: Number(row.fees_due ?? 0),
      formData: (row.form_data ?? {}) as Record<string, string | number | boolean | null>,
      serviceName: service?.display_name || service?.name || row.request_type,
      processingTime: service?.processing_time ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attachments: (attachments.data ?? []).map((a) => ({
        id: a.id,
        requirementName: a.requirement_name,
        verificationStatus: a.verification_status,
        rejectionReason: a.rejection_reason,
      })),
      logs: (logs.data ?? []).map((l) => ({
        id: l.id,
        actionStatus: l.action_status,
        remarks: l.remarks,
        createdAt: l.created_at,
      })),
    };
  });
