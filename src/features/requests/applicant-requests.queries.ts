import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import {
  parseFormTemplateDefinition,
  templateFieldLabels,
} from "~/features/forms/form-template.utils";
import { readRequestMessages } from "~/features/requests/request-messages.server";
import { loadServiceCatalogue } from "~/features/services/services.catalogue";

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/** The service a request is for, as the applicant's list embeds it. */
export interface RequestServiceName {
  name?: string | null;
  display_name?: string | null;
}

function fieldLabelsOf(row: {
  form_template_versions?:
    | { definition?: unknown }
    | { definition?: unknown }[]
    | null;
}): Record<string, string> {
  const version = one<{ definition?: unknown }>(row.form_template_versions);
  if (!version?.definition) return {};
  try {
    return templateFieldLabels(parseFormTemplateDefinition(version.definition));
  } catch {
    return {};
  }
}

/** The applicant's own request list — feeds `/my-requests`. */
export const getMyRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireActiveSession("requests:view_own");

  const { data, error } = await supabase
    .from("requests")
    .select(
      `id, tracking_number, request_type, status, payment_status, created_at,
       fees_due, form_data, services_registry(name, display_name),
       application_logs(action_status, created_at, remarks)`,
    )
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // The short name comes from the in-process catalogue rather than another
  // embed on this query: it is reference data, the catalogue is already warm,
  // and a missing catalogue just means requests keep their full service name.
  const catalogue = await loadServiceCatalogue().catch(() => null);
  return (data ?? []).map((row) => ({
    ...row,
    // A to-one embed: the client types it as a list, but it is one object.
    services_registry: one<RequestServiceName>(row.services_registry) ?? null,
    short_name: catalogue?.servicesByCode.get(row.request_type)?.short_name ?? null,
  }));
});

/**
 * The applicant's own single-request detail — feeds `/my-requests/$requestId`.
 * Mirrors `getRequestDetailFn` (the staff version) but scoped to the caller's
 * own request instead of department, and without the staff-only remarks UI.
 */
export type MyRequestDetail = Awaited<ReturnType<typeof getMyRequestDetailFn>>;

export const getMyRequestDetailFn = createServerFn({ method: "GET" })
  .validator((d: { requestId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:view_own");

    const { data: row, error } = await supabase
      .from("requests")
      .select(
        `id, tracking_number, request_type, status, payment_status,
         fees_due, copies, form_data, created_at, updated_at,
         services_registry(name, display_name, processing_time, departments(name),
           event_date_label, event_place_label, reference_number_label, allows_messages),
         form_template_versions(definition)`,
      )
      .eq("id", data.requestId)
      .eq("applicant_id", user.id)
      .single();

    if (error || !row) throw new Error(error?.message ?? "Request not found");

    const service = one<{
      name?: string;
      display_name?: string;
      processing_time?: string;
      departments?: { name: string } | { name: string }[] | null;
      event_date_label?: string | null;
      event_place_label?: string | null;
      reference_number_label?: string | null;
      allows_messages?: boolean;
    }>(row.services_registry);

    const [attachments, logs] = await Promise.all([
      supabase
        .from("requirements_attachments")
        .select("id, requirement_name, subject_role, verification_status, rejection_reason, uploaded_at")
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

    const allowsMessages = service?.allows_messages === true;
    const messages = allowsMessages
      ? await readRequestMessages(supabase, data.requestId)
      : [];

    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      status: row.status,
      paymentStatus: row.payment_status,
      feesDue: Number(row.fees_due ?? 0),
      copies: Number(row.copies ?? 1),
      formData: (row.form_data ?? {}) as Record<string, string | number | boolean | null>,
      serviceName: service?.display_name || service?.name || row.request_type,
      processingTime: service?.processing_time ?? null,
      departmentName: one<{ name: string }>(service?.departments)?.name ?? null,
      eventDateLabel: service?.event_date_label ?? null,
      eventPlaceLabel: service?.event_place_label ?? null,
      referenceNumberLabel: service?.reference_number_label ?? null,
      allowsMessages,
      messages,
      fieldLabels: fieldLabelsOf(row),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attachments: (attachments.data ?? []).map((a) => ({
        id: a.id,
        requirementName: a.requirement_name,
        subjectRole: a.subject_role,
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
