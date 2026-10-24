import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Runs the System Health migration against an in-process Postgres (PGlite), on top of the
// real health migration that came before it, so the backfill meets old-style rows. The parts of
// a Supabase project the migration leans on (auth, roles, profiles, the audit table) are stubbed.

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const read = (file: string) =>
  readFileSync(fileURLToPath(new URL(`../../../supabase/migrations/${file}`, import.meta.url)), "utf8");
const OLD = read("20260816120000_add_system_health_dashboard.sql");
const NEW = read("20261024120000_system_health_monitoring.sql");

const ADMIN = "11111111-1111-1111-1111-111111111111";

const STUBS = `
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create schema storage;
  create table storage.objects (bucket_id text, metadata jsonb);
  create table public.profiles (
    id uuid primary key references auth.users(id),
    first_name text, last_name text, role text, access_status text default 'active'
  );
  create table public.system_audit_events (
    id uuid primary key default gen_random_uuid(),
    event_type text not null check (event_type = any (array[
      'staff_invited','invitation_resent','invitation_cancelled','role_changed','account_suspended',
      'account_reactivated','staff_deactivated','staff_reactivated','ccro_admin_replaced','ccro_admin_appointed',
      'security_finding_acknowledged','security_finding_assigned','security_finding_resolved','security_control_reviewed',
      'account_details_updated','password_reset_sent','sessions_revoked','verification_resent','service_created',
      'service_updated','service_deleted','service_form_published','password_changed'])),
    actor_profile_id uuid not null references public.profiles(id),
    target_profile_id uuid references public.profiles(id) on delete set null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    masked_ip_address text check (masked_ip_address is null or length(masked_ip_address) <= 45),
    user_agent text check (user_agent is null or length(user_agent) <= 300)
  );
`;

async function fresh({ seedOld = false } = {}) {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'sysadmin@example.com');
    insert into public.profiles (id, first_name, last_name, role, access_status)
    values ('${ADMIN}', 'Casey', 'Admin', 'system_admin', 'active');
  `);
  await db.exec(OLD);
  if (seedOld) {
    await db.exec(`
      insert into public.system_health_snapshots (component_key, status, response_time_ms, recorded_at) values
        ('database', 'operational', 90, now() - interval '3 hours'),
        ('storage', 'degraded', 2100, now() - interval '2 hours'),
        ('authentication', 'degraded', null, now() - interval '1 hour');
    `);
  }
  await db.exec(NEW);
  return db;
}

type Db = Awaited<ReturnType<typeof fresh>>;

// Booting a database costs about a second, so the tests share one and start each from a clean slate.
// Only the test that proves the migration on top of old rows needs its own.
let shared: Db;

async function reset(db: Db) {
  await db.exec(`
    truncate public.system_health_snapshots, public.system_operational_events,
      public.system_background_job_runs, public.system_audit_events;
    update public.system_health_components
      set slow_after_ms = case key when 'database' then 600 when 'authentication' then 1200 when 'storage' then 1500 end,
          capacity_bytes = null;
    update public.system_health_settings set email_alerts = false, last_alert_at = null;
    update public.profiles set access_status = 'active';
  `);
}

beforeAll(async () => {
  shared = await fresh();
});
beforeEach(async () => {
  await reset(shared);
});

type Probe = { key: string; ok: boolean; response_ms: number | null; object_count?: number; total_bytes?: number };
type Outcome = { opened: { key: string; title: string; severity: string }[]; closed: { key: string }[] };
type Overrides = Partial<Record<"database" | "authentication" | "storage" | "capacity", Partial<Probe>>>;

const probes = (over: Overrides = {}): Probe[] => [
  { key: "database", ok: true, response_ms: 88, ...over.database },
  { key: "authentication", ok: true, response_ms: 110, ...over.authentication },
  { key: "storage", ok: true, response_ms: 233, ...over.storage },
  { key: "capacity", ok: true, response_ms: null, object_count: 182, total_bytes: 17196646, ...over.capacity },
];

async function run(db: Db, results: Probe[], kind = "scheduled", by: string | null = null) {
  const { rows } = await db.query<{ r: Outcome }>(
    "select public.system_health_record_run($1, $2, now(), $3::jsonb) as r",
    [kind, by, JSON.stringify(results)],
  );
  return rows[0].r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = async <T = any>(db: Db, sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summary = async (db: Db) => (await q(db, "select public.system_health_summary() as s"))[0].s as any;
const count = async (db: Db, sql: string) => (await q<{ n: number }>(db, `select count(*)::int as n from ${sql}`))[0].n;

describe("migration", () => {
  it("applies on top of the old health tables and backfills old rows", async () => {
    const db = await fresh({ seedOld: true });
    const rows = await q(db, "select outcome, run_kind from public.system_health_snapshots order by recorded_at");
    expect(rows.map((r) => r.outcome)).toEqual(["ok", "slow", "failed"]);
    expect(rows.every((r) => r.run_kind === "manual")).toBe(true);
    expect(await count(db, "public.system_health_components")).toBe(5);
    expect(await count(db, "public.system_health_settings")).toBe(1);
  });

  it("runs twice without error", async () => {
    const db = shared;
    await db.exec(NEW);
    expect(await count(db, "public.system_health_components")).toBe(5);
  });

  it("accepts the new audit types and still rejects unknown ones", async () => {
    const db = shared;
    for (const type of [
      "health_check_run",
      "health_maintenance_recorded",
      "health_event_acknowledged",
      "health_limits_updated",
      "health_settings_updated",
      "password_changed",
    ]) {
      await db.query("insert into public.system_audit_events (event_type, actor_profile_id) values ($1, $2)", [type, ADMIN]);
    }
    await expect(
      db.query("insert into public.system_audit_events (event_type, actor_profile_id) values ('made_up', $1)", [ADMIN]),
    ).rejects.toThrow();
  });

  it("allows only one open degradation per component", async () => {
    const db = shared;
    const insert = "insert into public.system_operational_events (component_key, severity, event_type, title, summary) values ('storage', 'warning', 'degradation', 'x', '')";
    await db.exec(insert);
    await expect(db.exec(insert)).rejects.toThrow(/unique/);
  });
});

describe("recording a run", () => {
  it("writes four snapshots and one job run for a healthy run, and opens nothing", async () => {
    const db = shared;
    const out = await run(db, probes());
    expect(out.opened).toEqual([]);
    expect(out.closed).toEqual([]);
    const snaps = await q(db, "select outcome, status from public.system_health_snapshots");
    expect(snaps).toHaveLength(4);
    expect(snaps.every((s) => s.outcome === "ok" && s.status === "operational")).toBe(true);
    expect(await q(db, "select job_key, status from public.system_background_job_runs")).toEqual([
      { job_key: "health-probe", status: "succeeded" },
    ]);
  });

  it("opens one incident for a slow check, does not stack it, and closes it on recovery", async () => {
    const db = shared;
    const first = await run(db, probes({ storage: { response_ms: 2000 } }));
    expect(first.opened.map((e) => e.title)).toEqual(["Document storage is slow"]);
    const [open] = await q(db, "select summary, severity, resolved_at from public.system_operational_events where event_type = 'degradation'");
    expect(open.summary).toBe("Slower than 1,500 ms on the latest check.");
    expect(open.severity).toBe("warning");
    expect(open.resolved_at).toBeNull();

    expect((await run(db, probes({ storage: { response_ms: 2500 } }))).opened).toEqual([]);
    expect(await count(db, "public.system_operational_events where event_type = 'degradation'")).toBe(1);

    expect((await run(db, probes())).closed).toHaveLength(1);
    const events = await q(db, "select event_type, resolved_at from public.system_operational_events order by event_type");
    expect(events.map((e) => e.event_type)).toEqual(["degradation", "recovery"]);
    expect(events.every((e) => e.resolved_at !== null)).toBe(true);
  });

  it("treats a failed database check as an outage and a critical incident", async () => {
    const db = shared;
    const out = await run(db, probes({ database: { ok: false, response_ms: null } }));
    expect(out.opened[0]).toMatchObject({ title: "Core database is not responding", severity: "critical" });
    const [snap] = await q(db, "select status, outcome, response_time_ms from public.system_health_snapshots where component_key = 'database'");
    expect(snap).toEqual({ status: "outage", outcome: "failed", response_time_ms: null });
  });

  it("treats a failed non-database check as degraded, not an outage", async () => {
    const db = shared;
    await run(db, probes({ storage: { ok: false, response_ms: null } }));
    const [snap] = await q(db, "select status, outcome from public.system_health_snapshots where component_key = 'storage'");
    expect(snap).toEqual({ status: "degraded", outcome: "failed" });
  });

  it("uses the current limit, so a lowered limit changes the next outcome", async () => {
    const db = shared;
    await db.query("select public.system_health_update_limits($1, '{\"database\": 100}'::jsonb, null, null)", [ADMIN]);
    expect((await run(db, probes({ database: { response_ms: 150 } }))).opened[0].title).toBe("Core database is slow");
  });

  it("alerts on capacity only once one is set, at 85%", async () => {
    const db = shared;
    expect((await run(db, probes({ capacity: { total_bytes: 9e15 } }))).opened).toEqual([]);
    await db.exec("update public.system_health_components set capacity_bytes = 20000000 where key = 'capacity'");
    const out = await run(db, probes({ capacity: { total_bytes: 17000000 } }));
    expect(out.opened[0].title).toBe("Storage capacity is nearly full");
    const [ev] = await q(db, "select summary from public.system_operational_events where component_key = 'capacity'");
    expect(ev.summary).toBe("85% of the configured capacity is used.");
  });

  it("rejects an empty run and an unknown run kind", async () => {
    const db = shared;
    await expect(run(db, [])).rejects.toThrow();
    await expect(run(db, probes(), "nightly")).rejects.toThrow();
  });

  it("ignores unknown components, and the monitor cannot be posted", async () => {
    const db = shared;
    await run(db, [...probes(), { key: "nonsense", ok: true, response_ms: 1 }, { key: "monitor", ok: true, response_ms: 1 }]);
    expect(await count(db, "public.system_health_snapshots")).toBe(4);
  });

  it("records a failure of the probe function itself", async () => {
    const db = shared;
    await db.query("select public.system_health_record_job_failure(now(), 'record_failed')");
    const s = await summary(db);
    expect(s.monitor).toMatchObject({ last_status: "failed", runs_24h: 1, ok_24h: 0 });
  });
});

describe("planned maintenance", () => {
  const record = (db: Db, component: string, title: string, start: string, end: string) =>
    db.query(
      "select public.system_health_record_maintenance($1, $2, $3, 'note', $4::timestamptz, $5::timestamptz, '9.9.9.0', 'ua')",
      [ADMIN, component, title, start, end],
    );

  it("suppresses an incident on that component only", async () => {
    const db = shared;
    await db.query(
      "select public.system_health_record_maintenance($1, 'storage', 'Provider upgrade', 'Restart', now() - interval '5 minutes', now() + interval '25 minutes', null, null)",
      [ADMIN],
    );
    const out = await run(db, probes({ storage: { response_ms: 3000 }, authentication: { response_ms: 4000 } }));
    expect(out.opened.map((e) => e.key)).toEqual(["authentication"]);
  });

  it("suppresses every service when the window is for all", async () => {
    const db = shared;
    await db.query(
      "select public.system_health_record_maintenance($1, 'all', 'Platform window', '', now() - interval '1 minute', now() + interval '10 minutes', null, null)",
      [ADMIN],
    );
    expect((await run(db, probes({ storage: { response_ms: 3000 }, database: { ok: false, response_ms: null } }))).opened).toEqual([]);
  });

  it("validates input and writes the audit row with the event", async () => {
    const db = shared;
    await expect(record(db, "monitor", "x", "2026-11-01T10:00Z", "2026-11-01T11:00Z")).rejects.toThrow(/Choose a service/);
    await expect(record(db, "storage", "  ", "2026-11-01T10:00Z", "2026-11-01T11:00Z")).rejects.toThrow(/title/);
    await expect(record(db, "storage", "x", "2026-11-01T11:00Z", "2026-11-01T10:00Z")).rejects.toThrow(/end after/);
    await record(db, "storage", "Provider upgrade", "2030-01-01T10:00Z", "2030-01-01T11:00Z");
    const [ev] = await q(db, "select event_type, related_audit_event_id, created_by from public.system_operational_events");
    const [audit] = await q(db, "select id, event_type, metadata from public.system_audit_events");
    expect(ev).toMatchObject({ event_type: "maintenance", created_by: ADMIN });
    expect(audit.event_type).toBe("health_maintenance_recorded");
    expect(audit.id).toBe(ev.related_audit_event_id);
    expect(audit.metadata.title).toBe("Provider upgrade");
    expect((await summary(db)).events).toHaveLength(1);
  });
});

describe("the summary", () => {
  it("weights availability by time and counts slow and failed apart", async () => {
    const db = shared;
    // storage: ok -60m, slow -45m, ok -30m, ok -15m. Each stands for 15 minutes, so 45 of 60 are ok.
    await db.exec(`
      insert into public.system_health_snapshots (component_key, status, outcome, response_time_ms, recorded_at) values
        ('storage', 'operational', 'ok', 200, now() - interval '60 minutes'),
        ('storage', 'degraded', 'slow', 2000, now() - interval '45 minutes'),
        ('storage', 'operational', 'ok', 210, now() - interval '30 minutes'),
        ('storage', 'operational', 'ok', 220, now() - interval '15 minutes'),
        ('database', 'degraded', 'failed', null, now() - interval '20 minutes');
    `);
    const s = await summary(db);
    const storage = s.components.find((c: { key: string }) => c.key === "storage");
    expect(storage.availability).toBe(75);
    expect([storage.ok_n, storage.slow_n, storage.failed_n]).toEqual([3, 1, 0]);
    const database = s.components.find((c: { key: string }) => c.key === "database");
    // A service that failed every check is 0%, not "no data".
    expect(database).toMatchObject({ failed_n: 1, availability: 0 });
  });

  it("does not count a gap in checking as up", async () => {
    const db = shared;
    await db.exec(`insert into public.system_health_snapshots (component_key, status, outcome, response_time_ms, recorded_at)
      values ('storage', 'operational', 'ok', 200, now() - interval '3 hours'),
             ('storage', 'degraded', 'slow', 2000, now() - interval '30 minutes')`);
    const storage = (await summary(db)).components.find((c: { key: string }) => c.key === "storage");
    // The ok check stands for 30 minutes (capped), the slow one for the 30 minutes to now.
    expect(storage.availability).toBe(50);
  });

  it("lists components in order, with the monitor, events and settings", async () => {
    const db = shared;
    await run(db, probes({ storage: { response_ms: 2000 } }), "manual", ADMIN);
    const s = await summary(db);
    expect(s.components.map((c: { key: string }) => c.key)).toEqual(["database", "authentication", "storage", "capacity", "monitor"]);
    expect(s.monitor).toMatchObject({ runs_24h: 1, ok_24h: 1, last_status: "succeeded" });
    expect(s.events).toHaveLength(1);
    expect(s.settings.email_alerts).toBe(false);
    expect(s.last_manual_at).toBeTruthy();
    expect(s.components.find((c: { key: string }) => c.key === "capacity").total_bytes).toBe(17196646);
  });

  it("summarises an empty database without error", async () => {
    const db = shared;
    const s = await summary(db);
    expect(s.checked_at).toBeNull();
    expect(s.monitor.last_run_at).toBeNull();
    expect(s.events).toEqual([]);
  });

  it("returns the series for services only, oldest first", async () => {
    const db = shared;
    await run(db, probes());
    await run(db, probes());
    const rows = await q(db, "select * from public.system_health_series(24)");
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.component_key !== "capacity")).toBe(true);
    expect(rows.every((r, i) => i === 0 || rows[i - 1].recorded_at <= r.recorded_at)).toBe(true);
  });
});

describe("administrative actions", () => {
  it("acknowledges once, records who, audits, and ignores a repeat", async () => {
    const db = shared;
    await run(db, probes({ storage: { response_ms: 2000 } }));
    const [{ id }] = await q(db, "select id from public.system_operational_events where event_type = 'degradation'");
    await db.query("select public.system_health_acknowledge_event($1, $2, null, null)", [ADMIN, id]);
    await db.query("select public.system_health_acknowledge_event($1, $2, null, null)", [ADMIN, id]);
    const [ev] = await q(db, "select acknowledged_by, acknowledged_at, related_audit_event_id from public.system_operational_events where id = $1", [id]);
    expect(ev.acknowledged_by).toBe(ADMIN);
    expect(ev.acknowledged_at && ev.related_audit_event_id).toBeTruthy();
    expect(await count(db, "public.system_audit_events where event_type = 'health_event_acknowledged'")).toBe(1);
    expect((await summary(db)).events[0].acknowledged_by_name).toBe("Casey Admin");
    await expect(
      db.query("select public.system_health_acknowledge_event($1, gen_random_uuid(), null, null)", [ADMIN]),
    ).rejects.toThrow(/no longer exists/);
  });

  it("updates limits, audits before and after, and rejects out-of-range values", async () => {
    const db = shared;
    await db.query("select public.system_health_update_limits($1, $2::jsonb, null, null)", [
      ADMIN,
      JSON.stringify({ storage: 1800, capacity_bytes: 1073741824 }),
    ]);
    const comps = Object.fromEntries((await q(db, "select key, slow_after_ms, capacity_bytes from public.system_health_components")).map((c) => [c.key, c]));
    expect(comps.storage.slow_after_ms).toBe(1800);
    expect(comps.database.slow_after_ms).toBe(600);
    expect(Number(comps.capacity.capacity_bytes)).toBe(1073741824);
    const [audit] = await q(db, "select metadata from public.system_audit_events where event_type = 'health_limits_updated'");
    expect(audit.metadata.before.storage).toBe("1500");
    expect(audit.metadata.after.storage).toBe(1800);

    await db.query("select public.system_health_update_limits($1, '{\"capacity_bytes\": null}'::jsonb, null, null)", [ADMIN]);
    expect((await q(db, "select capacity_bytes from public.system_health_components where key = 'capacity'"))[0].capacity_bytes).toBeNull();
    await expect(db.query("select public.system_health_update_limits($1, '{\"storage\": 50}'::jsonb, null, null)", [ADMIN])).rejects.toThrow(/between 100 and 60,000/);
    await expect(db.query("select public.system_health_update_limits($1, '{\"capacity_bytes\": 0}'::jsonb, null, null)", [ADMIN])).rejects.toThrow(/more than zero/);
  });

  it("keeps alerts off by default, and claims respect the cooldown and the active admins", async () => {
    const db = shared;
    const claim = async () => (await q(db, "select public.system_health_claim_alert() as a"))[0].a;
    expect(await claim()).toBeNull();
    await db.query("select public.system_health_set_alerts($1, true, null, null)", [ADMIN]);
    expect(await count(db, "public.system_audit_events where event_type = 'health_settings_updated'")).toBe(1);
    expect(await claim()).toEqual(["sysadmin@example.com"]);
    expect(await claim()).toBeNull();
    await db.exec("update public.system_health_settings set last_alert_at = now() - interval '31 minutes'");
    expect(await claim()).toEqual(["sysadmin@example.com"]);
    await db.exec("update public.profiles set access_status = 'suspended'; update public.system_health_settings set last_alert_at = null");
    expect(await claim()).toBeNull();
  });
});

describe("the sidebar dot and retention", () => {
  const attention = async (db: Db) => (await q(db, "select public.system_health_attention() as a"))[0].a;

  it("is quiet when healthy, on for an open incident or a stale or failed monitor, and off before any run", async () => {
    const db = shared;
    expect(await attention(db)).toBe(false);
    await run(db, probes());
    expect(await attention(db)).toBe(false);
    await run(db, probes({ storage: { response_ms: 2000 } }));
    expect(await attention(db)).toBe(true);
    await run(db, probes());
    expect(await attention(db)).toBe(false);
    await db.exec("update public.system_background_job_runs set started_at = now() - interval '31 minutes'");
    expect(await attention(db)).toBe(true);
    await reset(db);
    await db.query("select public.system_health_record_job_failure(now(), 'record_failed')");
    expect(await attention(db)).toBe(true);
  });

  it("prunes old rows and keeps recent and open ones", async () => {
    const db = shared;
    await db.exec(`
      insert into public.system_health_snapshots (component_key, status, outcome, response_time_ms, recorded_at) values
        ('storage', 'operational', 'ok', 1, now() - interval '31 days'),
        ('storage', 'operational', 'ok', 1, now() - interval '29 days');
      insert into public.system_background_job_runs (job_key, status, started_at) values
        ('health-probe', 'succeeded', now() - interval '31 days'), ('health-probe', 'succeeded', now());
      insert into public.system_operational_events (component_key, severity, event_type, title, summary, started_at, resolved_at) values
        ('storage', 'info', 'recovery', 'old', '', now() - interval '100 days', now() - interval '100 days'),
        ('storage', 'warning', 'degradation', 'still open', '', now() - interval '100 days', null);
    `);
    expect((await q(db, "select public.system_health_prune() as r"))[0].r).toEqual({ snapshots: 1, job_runs: 1, events: 1 });
    expect(await count(db, "public.system_operational_events")).toBe(1);
  });
});
