import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { one } from "~/lib/embed";
import { hasPermission, type Role } from "~/lib/permissions";
import { getNotificationAudience } from "~/features/notifications/notification-audience";

export type NotificationType =
  // applicant feed
  | "status_change"
  | "pre_validation_complete"
  | "document_rejected"
  | "message"
  // CCRO personnel feed
  | "new_request"
  | "document_resubmitted"
  | "awaiting_cashier"
  | "ready_to_release"
  | "request_incomplete"
  | "request_rejected"
  | "new_message";

/**
 * Where opening a notification leads. The cashier has no access to the request
 * detail page, so its notifications land on the counter with the tracking
 * number pre-filled.
 */
export type NotificationTarget =
  | { to: "/my-requests/$requestId"; requestId: string }
  | { to: "/requests/$requestId"; requestId: string }
  | { to: "/cashier"; tracking: string };

export const NOTIFICATIONS_PAGE_SIZE = 30;
const NOTIFICATIONS_MAX = 300;

export interface NotificationRow {
  id: string;
  requestId: string;
  type: NotificationType;
  archivedAt: string | null;
  subject: string;
  body: string;
  status: string;
  isRead: boolean;
  sentAt: string;
  trackingNumber: string;
  /**
   * The service the request is for, so a row says which request it is about
   * without the tracking number. Applicant feed only: staff alerts name the
   * request by tracking number.
   */
  serviceName: string | null;
  target: NotificationTarget;
}

/**
 * Rows written before the feed/email copy was split still end with the
 * email-only "Sign in to CiviCheck and …" lead-in, which is wrong for someone
 * reading the feed while signed in. Drop the lead-in and re-capitalize.
 */
function toFeedBody(body: string) {
  return body.replace(
    /Sign in to CiviCheck and (\w)/,
    (_match, first: string) => first.toUpperCase(),
  );
}

export interface NotificationsPage {
  items: NotificationRow[];
  hasMore: boolean;
}

const APPLICANT_FEED_COLUMNS =
  "id, request_id, type, archived_at, subject, body, status, is_read, sent_at, requests!inner(tracking_number, applicant_id, request_type, services_registry(name, display_name))";

/** A `notifications` row, with its request, as `APPLICANT_FEED_COLUMNS` selects it. */
interface ApplicantFeedRow {
  id: string;
  request_id: string;
  type: NotificationType;
  archived_at: string | null;
  subject: string;
  body: string;
  status: string;
  is_read: boolean;
  sent_at: string;
  requests:
    | {
        tracking_number: string;
        request_type: string | null;
        services_registry?: unknown;
      }
    | {
        tracking_number: string;
        request_type: string | null;
        services_registry?: unknown;
      }[]
    | null;
}

/** A `staff_notifications` row as `readStaffFeed` selects it. */
interface StaffFeedRow {
  id: string;
  request_id: string;
  tracking_number: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  archived_at: string | null;
  created_at: string;
}

function toApplicantRow(row: ApplicantFeedRow): NotificationRow {
  const request = one<{
    tracking_number: string;
    request_type: string | null;
    services_registry?: unknown;
  }>(row.requests);
  const service = one<{ name?: string; display_name?: string | null }>(
    request?.services_registry as never,
  );
  return {
    id: row.id,
    requestId: row.request_id,
    type: row.type,
    archivedAt: row.archived_at,
    subject: row.subject,
    body: toFeedBody(row.body),
    status: row.status,
    isRead: row.is_read,
    sentAt: row.sent_at,
    trackingNumber: request?.tracking_number ?? "",
    serviceName: service?.display_name || service?.name || request?.request_type || null,
    target: { to: "/my-requests/$requestId", requestId: row.request_id },
  };
}

async function readApplicantFeed(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<NotificationsPage> {
  const { data, error } = await supabase
    .from("notifications")
    .select(APPLICANT_FEED_COLUMNS)
    .eq("requests.applicant_id", userId)
    .order("sent_at", { ascending: false })
    // One extra row tells us whether there is another page without a count query.
    .limit(limit + 1);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ApplicantFeedRow[];
  return { items: rows.slice(0, limit).map(toApplicantRow), hasMore: rows.length > limit };
}

async function readStaffFeed(
  supabase: SupabaseClient,
  userId: string,
  role: Role,
  limit: number,
): Promise<NotificationsPage> {
  const { data, error } = await supabase
    .from("staff_notifications")
    .select(
      "id, request_id, tracking_number, type, title, body, is_read, archived_at, created_at",
    )
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (error) throw new Error(error.message);

  const canOpenRequest = hasPermission(role, "requests:view_all");
  const rows = (data ?? []) as StaffFeedRow[];
  const items: NotificationRow[] = rows.slice(0, limit).map((row) => ({
    id: row.id,
    requestId: row.request_id,
    type: row.type,
    archivedAt: row.archived_at,
    subject: row.title,
    body: row.body,
    status: "sent",
    isRead: row.is_read,
    sentAt: row.created_at,
    trackingNumber: row.tracking_number,
    serviceName: null,
    target: canOpenRequest
      ? { to: "/requests/$requestId", requestId: row.request_id }
      : { to: "/cashier", tracking: row.tracking_number },
  }));

  return { items, hasMore: rows.length > limit };
}

export const getMyNotificationsFn = createServerFn({ method: "GET" })
  .validator((d: { limit?: number } | undefined) => d)
  .handler(async ({ data: input }): Promise<NotificationsPage> => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) throw new Error("Forbidden: this role has no notification feed");

    const limit = Math.min(
      Math.max(Math.trunc(input?.limit ?? NOTIFICATIONS_PAGE_SIZE), 1),
      NOTIFICATIONS_MAX,
    );

    return audience === "applicant"
      ? readApplicantFeed(supabase, user.id, limit)
      : readStaffFeed(supabase, user.id, role, limit);
  });

/**
 * What the bell's popover shows: the applicant's unread updates first, then the
 * most recent read ones to fill the rest, archived ones left out. Ordering by
 * read-state first keeps the popover's "Unread" tab accurate for as many
 * unread items as fit, instead of only those inside the latest few.
 */
export const NOTIFICATION_PREVIEW_SIZE = 8;

export const getNotificationPreviewFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<NotificationRow[]> => {
    const { supabase, user, role } = await requireActiveSession();
    if (getNotificationAudience(role) !== "applicant") return [];

    const { data, error } = await supabase
      .from("notifications")
      .select(APPLICANT_FEED_COLUMNS)
      .eq("requests.applicant_id", user.id)
      .is("archived_at", null)
      .order("is_read", { ascending: true })
      .order("sent_at", { ascending: false })
      .limit(NOTIFICATION_PREVIEW_SIZE);

    if (error) throw new Error(error.message);
    return (data ?? []).map(toApplicantRow);
  },
);

/**
 * What the sidebar badge, the bell dot and the request list's "New" markers all
 * read, so they can never disagree: how many notifications are unread, and
 * which requests they are about. `requestIds` is empty for personnel, whose
 * alerts are not tied to one applicant's request list.
 */
export interface UnreadNotificationSummary {
  count: number;
  requestIds: string[];
}

export const getUnreadNotificationSummaryFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<UnreadNotificationSummary> => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) return { count: 0, requestIds: [] };

    if (audience === "staff") {
      const { count, error } = await supabase
        .from("staff_notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false)
        .is("archived_at", null);

      if (error) throw new Error(error.message);
      return { count: count ?? 0, requestIds: [] };
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("request_id, requests!inner(applicant_id)")
      .eq("requests.applicant_id", user.id)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
    const rows = data ?? [];
    return {
      count: rows.length,
      requestIds: [...new Set(rows.map((row) => row.request_id as string))],
    };
  },
);
