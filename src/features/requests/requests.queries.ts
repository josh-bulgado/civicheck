import { createServerFn } from "@tanstack/react-start";
import { requirementDisplayName } from "~/features/services/requirement-display";
import { endorsementDetailsOf } from "./electronic-endorsement-release";
import { parsePreviousUploads } from "./previous-uploads";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import { one } from "~/lib/embed";
import { isDepartmentScopedRole } from "~/lib/permissions";
import { normalizePaymentRange, paymentRangeBounds } from "~/features/requests/payment-history";
import { requestFieldDisplayOf } from "~/features/requests/request-field-labels";
import { readRequestMessages } from "~/features/requests/request-messages.server";
import type { RequestClaim } from "~/features/requests/request-claims";
import { REQUEST_QUEUE_SORTS } from "~/features/requests/request-queue";
import { REQUEST_STATUSES } from "~/features/requests/request-workflow";
import type { StageCounts } from "~/features/requests/requests-table.utils";

// A counter lookup sends the numbers a bare 6-digit entry could mean: one per
// year it might have been filed in (see cashier/tracking-input.ts).
const trackingLookupSchema = z.object({
  trackingNumbers: z.array(z.string().regex(/^CCRO-\d{4}-\d{6}$/)).min(1).max(3),
});
const requestIdSchema = z.object({ requestId: z.string().uuid() });
const paymentHistorySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
const requestQueuePageSchema = z.object({
  page: z.number().int().min(0).max(100_000),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
  search: z.string().trim().max(100).optional(),
  stage: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
  payment: z.enum(["unpaid", "verified"]).optional(),
  department: z.string().max(100).optional(),
  needs: z.literal(true).optional(),
  mine: z.literal(true).optional(),
  attention: z.literal(true).optional(),
  sort: z.enum(REQUEST_QUEUE_SORTS),
  desc: z.boolean(),
});

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
  claim: RequestClaim | null;
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
  allows_messages?: boolean;
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

type PersonName = { first_name?: string | null; last_name?: string | null };
type Embed<T> = T | T[] | null | undefined;

// What each query's `select` returns, written out. The client is not generated
// from the schema, so these are the one place a row's shape is stated; a to-one
// embed may arrive as an object or a one-item list, hence `Embed`.

interface RequestReadRow {
  id: string;
  tracking_number: string;
  request_type: string | null;
  status: string;
  payment_status: string;
  fees_due: number | string | null;
  form_data: Record<string, unknown> | null;
  applicant_id: string | null;
  created_at: string;
  updated_at: string;
  claimed_by: string | null;
  claimed_stage: string | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  services_registry: Embed<ServiceEmbed>;
  profiles: Embed<PersonName>;
}

/** A `requests` row as `getAllRequestsFn` selects it. */
type RequestListRow = RequestReadRow;

interface RequestQueueRpcRow {
  id: string;
  tracking_number: string;
  status: string;
  payment_status: string;
  fees_due: number | string | null;
  applicant_id: string | null;
  created_at: string;
  updated_at: string;
  claimed_by: string | null;
  claimed_stage: string | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  claim_staff_name: string;
  department_id: string | null;
  department_name: string;
  service_name: string;
  applicant_name: string;
}

interface RequestQueueRpcResult {
  rows: RequestQueueRpcRow[];
  total: number;
  page: number;
  pageSize: number;
  requestCount: number;
  waitingCount: number;
  attentionCount: number;
  stageCounts: StageCounts;
}

export interface RequestQueuePage {
  rows: StaffRequestRow[];
  total: number;
  page: number;
  pageSize: number;
  requestCount: number;
  waitingCount: number;
  attentionCount: number;
  stageCounts: StageCounts;
  now: number;
}

/** A `requests` row as `lookupRequestsByTrackingFn` selects it. */
interface CashierLookupRow {
  psa_endorsed_on: string | null;
  request_type: string;
  posting_start_date: string | null;
  id: string;
  tracking_number: string;
  status: string;
  payment_status: string;
  or_number: string | null;
  fees_due: number | string | null;
  subject_first_name: string | null;
  subject_last_name: string | null;
  services_registry: Embed<ServiceEmbed>;
  profiles: Embed<PersonName>;
}

/** An `application_logs` row, with whoever acted, as the detail and payment queries select it. */
interface ActionLogRow {
  id: string;
  action_status: string;
  remarks: string | null;
  created_at: string;
  profiles: Embed<PersonName>;
}

/** A verified-payment log, with the request it was for, as `getPaymentHistoryFn` selects it. */
interface PaymentLogRow {
  id: string;
  created_at: string;
  profiles: Embed<PersonName>;
  requests: Embed<{
    tracking_number: string;
    fees_due: number | string | null;
    or_number: string | null;
    services_registry: Embed<ServiceEmbed>;
    profiles: Embed<PersonName>;
    subject_first_name: string | null;
    subject_last_name: string | null;
  }>;
}

/** A `requests` row as `getRequestDetailFn` selects it. */
interface RequestDetailRow extends RequestReadRow {
  psa_endorsed_on: string | null;
  claiming_location: string | null;
  claiming_instructions: string | null;
  psa_certificate_available_at: string | null;
  posting_start_date: string | null;
  posting_end_date: string | null;
  or_number: string | null;
  copies: number | null;
  form_template_versions: Embed<{ definition?: unknown }>;
}

type ClaimRow = Pick<
  RequestDetailRow,
  "claimed_by" | "claimed_stage" | "claimed_at" | "claim_expires_at"
>;

function claimOf(
  row: ClaimRow,
  staffNames: ReadonlyMap<string, string>,
  viewerId: string,
): RequestClaim | null {
  if (
    !row.claimed_by ||
    !row.claimed_stage ||
    !row.claimed_at ||
    !row.claim_expires_at
  ) {
    return null;
  }
  return {
    staffId: row.claimed_by,
    staffName: staffNames.get(row.claimed_by) ?? "Another staff member",
    stage: row.claimed_stage,
    claimedAt: row.claimed_at,
    expiresAt: row.claim_expires_at,
    isMine: row.claimed_by === viewerId,
  };
}

function applicantNameOf(row: {
  profiles?: Embed<PersonName>;
  form_data?: Record<string, unknown> | null;
}): string {
  const profile = one<PersonName>(row.profiles);
  const fromProfile = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "";
  if (fromProfile) return fromProfile;

  const form = row.form_data ?? {};
  const fromForm = `${form.subject_first_name ?? ""} ${form.subject_last_name ?? ""}`.trim();
  return fromForm || "—";
}

/** One filtered, sorted request page plus the queue counts used around it. */
export const getRequestQueuePageFn = createServerFn({ method: "GET" })
  .validator(requestQueuePageSchema)
  .handler(async ({ data }): Promise<RequestQueuePage> => {
    const { supabase, user } = await requireActiveSession("requests:view_all");
    const now = Date.now();
    const { data: result, error } = await supabase.rpc("get_request_queue_page", {
      p_page: data.page,
      p_page_size: data.pageSize,
      p_search: data.search ?? null,
      p_stage: data.stage ?? null,
      p_status: data.status ?? null,
      p_payment: data.payment ?? null,
      p_department: data.department ?? null,
      p_needs: data.needs ?? false,
      p_mine: data.mine ?? false,
      p_attention: data.attention ?? false,
      p_sort: data.sort,
      p_desc: data.desc,
      p_now: new Date(now).toISOString(),
    });

    if (error) throw new Error(error.message);
    const page = result as RequestQueueRpcResult;

    return {
      ...page,
      rows: page.rows.map((row) => ({
        id: row.id,
        trackingNumber: row.tracking_number,
        status: row.status,
        paymentStatus: row.payment_status,
        serviceName: row.service_name,
        departmentId: row.department_id,
        departmentName: row.department_name,
        applicantName: row.applicant_name,
        feesDue: Number(row.fees_due ?? 0),
        isWalkIn: row.applicant_id == null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        claim:
          row.claimed_by &&
          row.claimed_stage &&
          row.claimed_at &&
          row.claim_expires_at
            ? {
                staffId: row.claimed_by,
                staffName: row.claim_staff_name,
                stage: row.claimed_stage,
                claimedAt: row.claimed_at,
                expiresAt: row.claim_expires_at,
                isMine: row.claimed_by === user.id,
              }
            : null,
      })),
      now,
    };
  });

/**
 * Every request in the office pipeline — or, for a department-scoped role
 * (staff/supervisor), every request belonging to their own department only.
 * This filter is applied here, server-side, before the data ever reaches the
 * browser — it is not a UI-only restriction.
 */
export const getAllRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user, role, departmentId } = await requireActiveSession("requests:view_all");

  const { data, error } = await supabase
    .from("requests")
    .select(
      `id, tracking_number, request_type, status, payment_status, fees_due, form_data,
       applicant_id, created_at, updated_at, claimed_by, claimed_stage, claimed_at, claim_expires_at,
       services_registry(name, display_name, department_id, departments(id, name)),
       profiles!fk_requests_applicant(first_name, last_name)`,
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const claimIds = [...new Set((data ?? []).map((row) => row.claimed_by).filter(Boolean))] as string[];
  const claimProfiles = claimIds.length > 0
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", claimIds)
    : { data: [], error: null };
  if (claimProfiles.error) throw new Error(claimProfiles.error.message);
  const staffNames = new Map(
    (claimProfiles.data ?? []).map((profile) => [
      profile.id,
      `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Staff member",
    ]),
  );

  const rows = ((data ?? []) as RequestListRow[]).map((row): StaffRequestRow => {
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
      claim: claimOf(row, staffNames, user.id),
    };
  });

  if (isDepartmentScopedRole(role)) {
    return departmentId ? rows.filter((r) => r.departmentId === departmentId) : [];
  }
  return rows;
});

export interface CashierLookupResult {
  psaEndorsedOn?: string | null;
  serviceCode?: string;
  postingStartDate?: string | null;
  id: string;
  trackingNumber: string;
  status: string;
  paymentStatus: string;
  orNumber: string | null;
  feesDue: number;
  applicantName: string;
  serviceName: string;
}

function toCashierLookupResult(row: CashierLookupRow): CashierLookupResult {
  const service = one<ServiceEmbed>(row.services_registry);
  const profile = one<PersonName>(row.profiles);
  const applicantName =
    (profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "") ||
    `${row.subject_first_name ?? ""} ${row.subject_last_name ?? ""}`.trim() ||
    "—";

  return {
    id: row.id,
    serviceCode: row.request_type,
    psaEndorsedOn: row.psa_endorsed_on,
    postingStartDate: row.posting_start_date,
    trackingNumber: row.tracking_number,
    status: row.status,
    paymentStatus: row.payment_status,
    orNumber: row.or_number,
    feesDue: Number(row.fees_due ?? 0),
    applicantName,
    serviceName: service?.display_name || service?.name || "—",
  };
}

/**
 * Counter lookup by tracking number, for the cashier's payment desk. Takes the
 * full numbers an entry could mean and returns whichever exist, newest year
 * first: usually one, and two when the same 6 digits were issued in both years.
 * Returns only what a cashier needs to collect payment — no `form_data`, no
 * attachments, no logs — deliberately narrower than `getRequestDetailFn`.
 */
export const lookupRequestsByTrackingFn = createServerFn({ method: "GET" })
  .validator(trackingLookupSchema)
  .handler(async ({ data }): Promise<CashierLookupResult[]> => {
    const { supabase } = await requireActiveSession("requests:collect_payment");

    const { data: found, error } = await supabase
      .from("requests")
      .select(
        `id, tracking_number, request_type, posting_start_date, psa_endorsed_on, status, payment_status, or_number, fees_due,
         subject_first_name:form_data->>subject_first_name,
         subject_last_name:form_data->>subject_last_name,
         services_registry(name, display_name),
         profiles!fk_requests_applicant(first_name, last_name)`,
      )
      .in("tracking_number", data.trackingNumbers)
      .order("tracking_number", { ascending: false });

    if (error) throw new Error(error.message);
    return ((found ?? []) as CashierLookupRow[]).map(toCashierLookupResult);
  });

/** Requests eligible for payment that remain unpaid. */
export const getAwaitingPaymentCountFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await requireActiveSession("requests:collect_payment");

  const { count, error } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .or("status.eq.ready_for_release,and(status.eq.processing,request_type.eq.DEATH_DELAYED,posting_start_date.not.is.null),and(status.eq.processing,request_type.eq.ELEC_ENDORSEMENT)")
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

// PostgREST caps a response at 1,000 rows, so a long range is read in pages.
const PAYMENT_PAGE_SIZE = 1000;
const MAX_PAYMENT_PAGES = 20;

/**
 * Verified payments in a date range (default: today), newest first. Open to
 * the cashier, who verifies them, and to the admin, read-only. The range is
 * re-normalized here — the client's dates are never trusted as-is.
 */
export const getPaymentHistoryFn = createServerFn({ method: "GET" })
  .validator(paymentHistorySchema)
  .handler(async ({ data: range }): Promise<PaymentHistoryRow[]> => {
    const { supabase } = await requireActiveSession("requests:view_payments");

    const { start, end } = paymentRangeBounds(normalizePaymentRange(range.from, range.to));

    const logs: PaymentLogRow[] = [];
    for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
      const { data, error } = await supabase
        .from("application_logs")
        .select(
          `id, created_at,
         profiles(first_name, last_name),
         requests(tracking_number, fees_due, or_number,
           services_registry(name, display_name),
           profiles!fk_requests_applicant(first_name, last_name),
           subject_first_name:form_data->>subject_first_name,
           subject_last_name:form_data->>subject_last_name)`,
        )
        .eq("action_status", "payment_verified")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page * PAYMENT_PAGE_SIZE, (page + 1) * PAYMENT_PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      logs.push(...((data ?? []) as PaymentLogRow[]));
      if ((data?.length ?? 0) < PAYMENT_PAGE_SIZE) break;
    }

    return logs.flatMap((log): PaymentHistoryRow[] => {
      const request = one(log.requests);
      if (!request) return [];

      const service = one<ServiceEmbed>(request.services_registry);
      const applicantProfile = one<PersonName>(request.profiles);
      const applicantName =
        (applicantProfile
          ? `${applicantProfile.first_name ?? ""} ${applicantProfile.last_name ?? ""}`.trim()
          : "") ||
        `${request.subject_first_name ?? ""} ${request.subject_last_name ?? ""}`.trim() ||
        "—";

      const verifier = one<PersonName>(log.profiles);
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
  });

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
    const { supabase, user, role, departmentId } = await requireActiveSession("requests:view_all");

    const { data: found, error } = await supabase
      .from("requests")
      .select(
        `id, tracking_number, request_type, status, payment_status, or_number,
         fees_due, copies, form_data, applicant_id, created_at, updated_at, posting_start_date, posting_end_date,
         psa_endorsed_on, claiming_location, claiming_instructions, psa_certificate_available_at,
         claimed_by, claimed_stage, claimed_at, claim_expires_at,
         services_registry(name, display_name, processing_time, department_id, departments(id, name),
           event_date_label, event_place_label, reference_number_label, allows_messages),
         profiles!fk_requests_applicant(first_name, last_name),
         form_template_versions(definition)`,
      )
      .eq("id", data.requestId)
      .single();

    if (error || !found) throw new Error(error?.message ?? "Request not found");
    const row = found as RequestDetailRow;
    const accountProfile = row.applicant_id ? one<PersonName>(row.profiles) : null;
    const accountHolderName = accountProfile
      ? `${accountProfile.first_name ?? ""} ${accountProfile.last_name ?? ""}`.trim() || null
      : null;

    const service = one<ServiceEmbed>(row.services_registry);
    // Same "not found" phrasing as a missing row — a department-scoped staff
    // member shouldn't be able to tell a wrong-department request even exists.
    if (isDepartmentScopedRole(role) && departmentOf(service).departmentId !== departmentId) {
      throw new Error("Request not found");
    }

    const encodedBy = typeof row.form_data?.encoded_by === "string" ? row.form_data.encoded_by : null;
    const staffIds = [...new Set([row.claimed_by, encodedBy].filter((id): id is string => Boolean(id)))];
    const [attachments, logs, claimProfiles] = await Promise.all([
      supabase
        .from("requirements_attachments")
        .select("id, requirement_name, subject_role, file_url, verification_status, rejection_reason, uploaded_at, previous_uploads")
        .eq("request_id", data.requestId)
        .order("uploaded_at", { ascending: true }),
      supabase
        .from("application_logs")
        .select(
          "id, action_status, remarks, created_at, profiles(first_name, last_name)",
        )
        .eq("request_id", data.requestId)
        .order("created_at", { ascending: true }),
      staffIds.length
        ? supabase.from("profiles").select("id, first_name, last_name").in("id", staffIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (attachments.error) throw new Error(attachments.error.message);
    if (logs.error) throw new Error(logs.error.message);
    if (claimProfiles.error) throw new Error(claimProfiles.error.message);
    const staffNames = new Map(
      (claimProfiles.data ?? []).map((profile) => [
        profile.id,
        `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Staff member",
      ]),
    );

    const allowsMessages = service?.allows_messages === true;
    const messages = allowsMessages
      ? await readRequestMessages(supabase, data.requestId)
      : [];

    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      status: row.status,
      paymentStatus: row.payment_status,
      orNumber: row.or_number,
      postingStartDate: row.posting_start_date,
      postingEndDate: row.posting_end_date,
      ...(row.request_type === "ELEC_ENDORSEMENT" ? { endorsement: endorsementDetailsOf(row) } : {}),
      feesDue: Number(row.fees_due ?? 0),
      copies: Number(row.copies ?? 1),
      // Narrowed to primitives: TanStack's server-fn return validator rejects
      // `unknown` values as potentially non-serializable.
      formData: (row.form_data ?? {}) as Record<string, string | number | boolean | null>,
      isWalkIn: row.applicant_id == null,
      accountHolderName,
      serviceCode: row.request_type as string,
      serviceName: service?.display_name || service?.name || row.request_type,
      ...departmentOf(service),
      processingTime: service?.processing_time ?? null,
      eventDateLabel: service?.event_date_label ?? null,
      eventPlaceLabel: service?.event_place_label ?? null,
      referenceNumberLabel: service?.reference_number_label ?? null,
      allowsMessages,
      messages,
      ...requestFieldDisplayOf(row),
      fieldDisplayValues: {
        ...requestFieldDisplayOf(row).fieldDisplayValues,
        ...(encodedBy ? { encoded_by: staffNames.get(encodedBy) ?? "Staff member unavailable" } : {}),
      },
      applicantName: applicantNameOf(row),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      claim: claimOf(row, staffNames, user.id),
      attachments: (attachments.data ?? []).map((a) => ({
        id: a.id,
        requirementName: requirementDisplayName(a.requirement_name),
        subjectRole: a.subject_role,
        fileUrl: a.file_url,
        verificationStatus: a.verification_status,
        rejectionReason: a.rejection_reason,
        previousUploads: parsePreviousUploads(a.previous_uploads),
      })),
      logs: ((logs.data ?? []) as ActionLogRow[]).map((l) => {
        const actor = one<PersonName>(l.profiles);
        const fallbackActor =
          l.action_status === "document_resubmitted" || l.action_status === "document_uploaded"
            ? "Applicant"
            : "System";
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
