// health-probe: measures the platform and hands the numbers to the database.
//
// Called by the schedule (pg_cron through pg_net) and by Check Now in the app.
// This file only measures. What a measurement means (ok, slow or failed), and when an
// incident opens or closes, is decided once in system_health_record_run, so the
// schedule and Check Now can never disagree.
//
// Metadata only: availability, response time, object count and total bytes. It never
// reads request data, document names or paths, or anything a citizen submitted.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Measurement = {
  key: "database" | "authentication" | "storage" | "capacity";
  ok: boolean;
  response_ms: number | null;
  object_count?: number | null;
  total_bytes?: number | null;
};

const PROBE_TIMEOUT_MS = 8_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/** Compares without stopping at the first difference, so timing reveals nothing. */
function sameSecret(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Times one check. A thrown error or a timeout is a failed check, not a crash. */
async function measure<T>(
  key: Measurement["key"],
  check: () => Promise<T>,
): Promise<{ result: Measurement; value: T | null }> {
  const startedAt = performance.now();
  try {
    const value = await withTimeout(check());
    return {
      result: { key, ok: true, response_ms: Math.max(0, Math.round(performance.now() - startedAt)) },
      value,
    };
  } catch {
    return { result: { key, ok: false, response_ms: null }, value: null };
  }
}

type RunOutcome = {
  opened: { key: string; title: string; severity: string }[];
  closed: { key: string; title: string }[];
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Emails the active system administrators when an incident opens or closes.
 * Does nothing when alerts are off, a recent alert is still cooling down, or no sender is
 * configured (RESEND_API_KEY). A failed send never fails the check run.
 */
async function sendAlert(admin: ReturnType<typeof createClient>, outcome: RunOutcome) {
  if (outcome.opened.length === 0 && outcome.closed.length === 0) return;
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return;

  const { data: recipients } = await admin.rpc("system_health_claim_alert");
  if (!Array.isArray(recipients) || recipients.length === 0) return;

  const titles = [...outcome.opened.map((e) => e.title), ...outcome.closed.map((e) => e.title)];
  const subject = `CiviCheck: ${titles[0]}${titles.length > 1 ? ` and ${titles.length - 1} more` : ""}`;
  const appUrl = Deno.env.get("APP_URL");
  const html =
    `<p>System Health recorded a change.</p><ul>${titles.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` +
    (appUrl ? `<p><a href="${escapeHtml(appUrl)}/system-admin/health">Open System Health</a></p>` : "");
  const from = Deno.env.get("HEALTH_ALERT_FROM") ?? "CiviCheck <noreply@civicheck.abrdns.com>";

  // One message per person, so nobody sees the other addresses.
  await Promise.allSettled(
    recipients.map((to: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from, to, subject, html }),
      }),
    ),
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("HEALTH_PROBE_SECRET");
  const sent = request.headers.get("x-health-secret") ?? "";
  if (!expected || !sameSecret(sent, expected)) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => ({}));
  const runKind = body?.run_kind === "manual" ? "manual" : "scheduled";
  const triggeredBy =
    typeof body?.triggered_by === "string" && UUID.test(body.triggered_by) ? body.triggered_by : null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const startedAt = new Date().toISOString();
  try {
    const [database, authentication, storage, usage] = await Promise.all([
      measure("database", async () => {
        const { error } = await admin.from("profiles").select("id", { count: "exact", head: true });
        if (error) throw error;
      }),
      measure("authentication", async () => {
        const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
        if (error) throw error;
      }),
      measure("storage", async () => {
        const { error } = await admin.storage.listBuckets();
        if (error) throw error;
      }),
      measure("capacity", async () => {
        const { data, error } = await admin.rpc("system_health_storage_usage");
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return {
          objectCount: Number(row?.object_count ?? 0),
          totalBytes: Number(row?.total_bytes ?? 0),
        };
      }),
    ]);

    const capacity: Measurement = {
      ...usage.result,
      response_ms: null,
      object_count: usage.value?.objectCount ?? null,
      total_bytes: usage.value?.totalBytes ?? null,
    };

    const { data, error } = await admin.rpc("system_health_record_run", {
      p_run_kind: runKind,
      p_triggered_by: triggeredBy,
      p_started_at: startedAt,
      p_results: [database.result, authentication.result, storage.result, capacity],
    });
    if (error) throw error;
    await sendAlert(admin, data as RunOutcome).catch(() => {});
    return json(data);
  } catch {
    // The run itself failed. Say so in the job record so the monitor never fails silently.
    await admin.rpc("system_health_record_job_failure", {
      p_started_at: startedAt,
      p_code: "record_failed",
    });
    return json({ error: "The check could not be recorded." }, 500);
  }
});
