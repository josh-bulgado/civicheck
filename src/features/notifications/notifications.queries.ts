import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

export interface NotificationRow {
  id: string;
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

export const getMyNotificationsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<NotificationRow[]> => {
    const { supabase, user } = await requireActiveSession("requests:view_own");

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, subject, body, status, is_read, sent_at, requests!inner(tracking_number, applicant_id)",
      )
      .eq("requests.applicant_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any) => ({
      id: row.id,
      subject: row.subject,
      body: row.body,
      status: row.status,
      isRead: row.is_read,
      sentAt: row.sent_at,
      trackingNumber: one<{ tracking_number: string }>(row.requests)?.tracking_number ?? "",
    }));
  },
);

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
