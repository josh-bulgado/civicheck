import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
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
  target: NotificationTarget;
}

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
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

async function readApplicantFeed(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<NotificationsPage> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, request_id, type, archived_at, subject, body, status, is_read, sent_at, requests!inner(tracking_number, applicant_id)",
    )
    .eq("requests.applicant_id", userId)
    .order("sent_at", { ascending: false })
    // One extra row tells us whether there is another page without a count query.
    .limit(limit + 1);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const items: NotificationRow[] = rows.slice(0, limit).map((row: any) => ({
    id: row.id,
    requestId: row.request_id,
    type: row.type,
    archivedAt: row.archived_at,
    subject: row.subject,
    body: toFeedBody(row.body),
    status: row.status,
    isRead: row.is_read,
    sentAt: row.sent_at,
    trackingNumber: one<{ tracking_number: string }>(row.requests)?.tracking_number ?? "",
    target: { to: "/my-requests/$requestId", requestId: row.request_id },
  }));

  return { items, hasMore: rows.length > limit };
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
  const rows = data ?? [];
  const items: NotificationRow[] = rows.slice(0, limit).map((row: any) => ({
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

export const getUnreadNotificationCountFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) return 0;

    if (audience === "staff") {
      const { count, error } = await supabase
        .from("staff_notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false)
        .is("archived_at", null);

      if (error) throw new Error(error.message);
      return count ?? 0;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)", { count: "exact", head: true })
      .eq("requests.applicant_id", user.id)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
    return count ?? 0;
  },
);
