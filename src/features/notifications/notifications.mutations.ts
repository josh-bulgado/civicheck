import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { getNotificationAudience } from "~/features/notifications/notification-audience";

export type NotificationAction = "read" | "unread" | "archive" | "unarchive";

/** The columns each action writes. Archiving also marks the row read so it never lingers in the unread badge. */
function patchFor(action: NotificationAction) {
  const now = new Date().toISOString();
  switch (action) {
    case "read":
      return { is_read: true, read_at: now };
    case "unread":
      return { is_read: false, read_at: null };
    case "archive":
      return { is_read: true, read_at: now, archived_at: now };
    case "unarchive":
      return { archived_at: null };
  }
}

export const updateNotificationFn = createServerFn({ method: "POST" })
  .validator((d: { notificationId: string; action: NotificationAction }) => d)
  .handler(async ({ data }) => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) return { error: true, message: "Notification not found." };

    if (audience === "staff") {
      const { data: row } = await supabase
        .from("staff_notifications")
        .select("id")
        .eq("id", data.notificationId)
        .eq("recipient_id", user.id)
        .maybeSingle();
      if (!row) return { error: true, message: "Notification not found." };

      const { error } = await supabase
        .from("staff_notifications")
        .update(patchFor(data.action))
        .eq("id", data.notificationId)
        .eq("recipient_id", user.id);
      if (error) return { error: true, message: error.message };

      return { error: false };
    }

    const { data: row } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)")
      .eq("id", data.notificationId)
      .eq("requests.applicant_id", user.id)
      .maybeSingle();
    if (!row) return { error: true, message: "Notification not found." };

    const { error } = await supabase
      .from("notifications")
      .update(patchFor(data.action))
      .eq("id", data.notificationId);
    if (error) return { error: true, message: error.message };

    return { error: false };
  });

/**
 * Opening a request is reading what it says, so its unread updates clear with
 * it. Applicant feed only; a request that isn't the caller's matches nothing.
 */
export const markRequestNotificationsReadFn = createServerFn({ method: "POST" })
  .validator((d: { requestId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user, role } = await requireActiveSession();
    if (getNotificationAudience(role) !== "applicant") return { error: false };

    // Same two-step shape as markAllNotificationsReadFn: PostgREST can't filter
    // an UPDATE by a joined table, so ownership is resolved with a SELECT.
    const { data: unread, error: fetchError } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)")
      .eq("request_id", data.requestId)
      .eq("requests.applicant_id", user.id)
      .eq("is_read", false);
    if (fetchError) return { error: true, message: fetchError.message };

    const ids = (unread ?? []).map((row) => row.id);
    if (ids.length === 0) return { error: false };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return { error: true, message: error.message };

    return { error: false };
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) return { error: false };

    if (audience === "staff") {
      const { error } = await supabase
        .from("staff_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      if (error) return { error: true, message: error.message };

      return { error: false };
    }

    // PostgREST only accepts a WHERE on the target table's own columns for
    // UPDATE, so the applicant-ownership join has to be resolved as a
    // separate SELECT first — matches getMyNotificationsFn's filter shape.
    const { data: unread, error: fetchError } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)")
      .eq("requests.applicant_id", user.id)
      .eq("is_read", false);
    if (fetchError) return { error: true, message: fetchError.message };

    const ids = (unread ?? []).map((row) => row.id);
    if (ids.length === 0) return { error: false };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return { error: true, message: error.message };

    return { error: false };
  },
);
