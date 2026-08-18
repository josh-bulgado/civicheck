import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .validator((d: { notificationId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:view_own");

    const { data: row } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)")
      .eq("id", data.notificationId)
      .eq("requests.applicant_id", user.id)
      .maybeSingle();
    if (!row) return { error: true, message: "Notification not found." };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", data.notificationId);
    if (error) return { error: true, message: error.message };

    return { error: false };
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabase, user } = await requireActiveSession("requests:view_own");

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
