import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = request.headers.get("x-reminder-secret");
  if (!secret) return json({ error: "Unauthorized" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authorized, error: authError } = await supabase.rpc("authorize_registration_reminder_worker", { p_secret: secret });
  if (authError || !authorized) return json({ error: "Unauthorized" }, 401);
  const input = await request.json().catch(() => ({}));
  const requestId = input?.request_id;
  if (requestId !== undefined && (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))) {
    return json({ error: "Invalid request ID" }, 400);
  }
  const { data: converted, error: conversionError } = await supabase.rpc("convert_expired_registrations", { p_request_id: requestId ?? null });
  if (conversionError) return json({ error: "Could not check expired registrations" }, 500);
  const { data: config, error: configError } = await supabase.rpc("registration_reminder_email_config");
  const apiKey = config?.key;
  const from = config?.from;
  if (configError || !apiKey || !from) return json({ error: "Reminder email delivery is not configured" }, 503);
  const { data: delayEmails, error: delayError } = await supabase.rpc("claim_registration_delay_emails", { p_request_id: requestId ?? null });
  if (delayError) return json({ error: "Could not prepare delayed registration emails" }, 500);
  const { data: reminders, error } = await supabase.rpc("claim_registration_reminders", {
    p_request_id: requestId ?? null,
  });
  if (error) {
    console.error("Could not prepare registration reminders", error.code);
    return json({ error: "Could not prepare reminders" }, 500);
  }
  let sent = 0;
  let failed = 0;
  for (const reminder of [...(delayEmails ?? []), ...(reminders ?? [])]) {
    // Recheck after claiming: staff may have completed the check in the meantime.
    const { data: eligible, error: checkError } = await supabase.rpc("registration_reminder_deliverable", {
      p_notification_id: reminder.notification_id,
    });
    if (checkError || !eligible) continue;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
          "Idempotency-Key": `registration-reminder/${reminder.notification_id}`,
        },
        body: JSON.stringify({
          from, to: reminder.recipient_email, subject: reminder.subject, text: reminder.body,
          reply_to: config.reply_to || undefined,
        }),
      });
      if (!response.ok) throw new Error(`Email delivery returned ${response.status}`);
      const { error: saveError } = await supabase.from("notifications").update({ status: "sent" }).eq("id", reminder.notification_id);
      if (saveError) throw new Error("Could not record email delivery");
      sent++;
    } catch {
      failed++;
      await supabase.from("notifications").update({ status: "failed" }).eq("id", reminder.notification_id);
    }
    // Resend's default limit is two requests per second.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return json({ sent, failed, converted });
});
