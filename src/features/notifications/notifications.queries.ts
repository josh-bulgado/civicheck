import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

export type NotificationType = "status_change" | "pre_validation_complete" | "document_rejected";

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

export const getMyNotificationsFn = createServerFn({ method: "GET" })
  .validator((d: { limit?: number } | undefined) => d)
  .handler(async ({ data: input }): Promise<NotificationsPage> => {
    const { supabase, user } = await requireActiveSession("requests:view_own");
    const limit = Math.min(
      Math.max(Math.trunc(input?.limit ?? NOTIFICATIONS_PAGE_SIZE), 1),
      NOTIFICATIONS_MAX,
    );

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, request_id, type, archived_at, subject, body, status, is_read, sent_at, requests!inner(tracking_number, applicant_id)",
      )
      .eq("requests.applicant_id", user.id)
      .order("sent_at", { ascending: false })
      // One extra row tells us whether there is another page without a count query.
      .limit(limit + 1);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const items = rows.slice(0, limit).map((row: any) => ({
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
    }));

    return { items, hasMore: rows.length > limit };
  });

export const getUnreadNotificationCountFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const { supabase, user } = await requireActiveSession("requests:view_own");

    const { count, error } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)", { count: "exact", head: true })
      .eq("requests.applicant_id", user.id)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
    return count ?? 0;
  },
);
