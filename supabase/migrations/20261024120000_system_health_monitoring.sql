-- System Health: scheduled monitoring, saved incidents, editable limits.
--
-- Today the page is the monitor: opening it runs the probes and inserts the rows,
-- incidents are rebuilt from snapshot changes on every load, and the limits live in
-- code. This migration moves that into the database so a schedule can do the
-- checking and the page can only read.
--
-- Additive: existing snapshots are kept and backfilled. Nothing here may hold request
-- bodies, citizen data, document names or paths, or secrets. Metadata only.

-- ── Components: one row per thing the page reports on ────────────────────────
-- The sources table and the limits come from here, so a new component appears on
-- the page without a code change.

create table if not exists public.system_health_components (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  name text not null check (length(name) between 1 and 60),
  description text not null default '' check (length(description) <= 200),
  kind text not null check (kind in ('service', 'platform')),
  measured_by text not null check (length(measured_by) between 1 and 200),
  update_cadence text not null check (length(update_cadence) between 1 and 80),
  exposure text not null check (length(exposure) between 1 and 200),
  -- A check slower than this counts as slow. Null for components with no latency limit.
  slow_after_ms integer check (slow_after_ms is null or slow_after_ms between 100 and 60000),
  -- Total size the storage capacity gauge is measured against. Null means not configured.
  capacity_bytes bigint check (capacity_bytes is null or capacity_bytes > 0),
  sort_order smallint not null default 0,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.system_health_components
  (key, name, description, kind, measured_by, update_cadence, exposure, slow_after_ms, sort_order)
values
  ('database', 'Core database', 'Profiles and operational records', 'service',
   'Metadata-only profiles availability probe', 'Every 15 minutes', 'Availability and response time only', 600, 1),
  ('authentication', 'Authentication', 'Account sign-in and session service', 'service',
   'Supabase Auth administrative availability probe', 'Every 15 minutes', 'Availability and response time only', 1200, 2),
  ('storage', 'Document storage', 'Protected upload storage availability', 'service',
   'Storage bucket availability probe', 'Every 15 minutes', 'Availability and response time only', 1500, 3)
on conflict (key) do nothing;

insert into public.system_health_components
  (key, name, description, kind, measured_by, update_cadence, exposure, sort_order)
values
  ('capacity', 'Storage capacity', 'Objects and bytes held in document storage', 'platform',
   'Aggregate storage usage function', 'Every 15 minutes', 'Object count and total bytes only', 4),
  ('monitor', 'Scheduled checks', 'The monitor that runs these checks', 'platform',
   'Metadata-only job run records', 'Written by each check run', 'Job key, state, retries and failure code', 5)
on conflict (key) do nothing;

-- ── Settings: one row. Email alerts are off until a system administrator turns them on ──

create table if not exists public.system_health_settings (
  id boolean primary key default true check (id),
  email_alerts boolean not null default false,
  -- After an alert goes out, no other alert is sent for this long.
  cooldown_minutes integer not null default 30 check (cooldown_minutes between 5 and 1440),
  last_alert_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.system_health_settings (id) values (true) on conflict (id) do nothing;

-- ── Snapshots: one row per check ──────────────────────────────────────────────
-- outcome separates a slow check (over its limit) from a failed one (no answer).

alter table public.system_health_snapshots
  drop constraint if exists system_health_snapshots_component_key_check;

alter table public.system_health_snapshots
  add column if not exists outcome text not null default 'ok'
    check (outcome in ('ok', 'slow', 'failed')),
  add column if not exists run_kind text not null default 'manual'
    check (run_kind in ('scheduled', 'manual')),
  add column if not exists triggered_by uuid references public.profiles(id) on delete set null,
  add column if not exists object_count bigint check (object_count is null or object_count >= 0),
  add column if not exists total_bytes bigint check (total_bytes is null or total_bytes >= 0);

-- Rows written by the old page-load probe: a missing response time means no answer.
update public.system_health_snapshots
set outcome = case when response_time_ms is null then 'failed' else 'slow' end
where status <> 'operational' and outcome = 'ok';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'system_health_snapshots_component_fk'
  ) then
    alter table public.system_health_snapshots
      add constraint system_health_snapshots_component_fk
      foreign key (component_key) references public.system_health_components(key);
  end if;
end $$;

create index if not exists system_health_snapshots_recorded_idx
  on public.system_health_snapshots(recorded_at desc);

-- ── Incidents: saved when the state changes ──────────────────────────────────

alter table public.system_operational_events
  add column if not exists acknowledged_by uuid references public.profiles(id) on delete set null,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists planned_start timestamptz,
  add column if not exists planned_end timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'system_operational_events_window_check'
  ) then
    alter table public.system_operational_events
      add constraint system_operational_events_window_check
      check (planned_start is null or planned_end is null or planned_end > planned_start);
  end if;
end $$;

-- One open degradation per component, so a probe that keeps failing never stacks incidents.
create unique index if not exists system_operational_events_one_open_degradation
  on public.system_operational_events(component_key)
  where event_type = 'degradation' and resolved_at is null;

create index if not exists system_operational_events_maintenance_idx
  on public.system_operational_events(planned_start, planned_end)
  where event_type = 'maintenance';

-- ── Audit: the new administrative actions ────────────────────────────────────

alter table public.system_audit_events
  drop constraint if exists system_audit_events_event_type_check;

alter table public.system_audit_events
  add constraint system_audit_events_event_type_check check (event_type = any (array[
    'staff_invited', 'invitation_resent', 'invitation_cancelled', 'role_changed',
    'account_suspended', 'account_reactivated', 'staff_deactivated', 'staff_reactivated',
    'ccro_admin_replaced', 'ccro_admin_appointed', 'security_finding_acknowledged',
    'security_finding_assigned', 'security_finding_resolved', 'security_control_reviewed',
    'account_details_updated', 'password_reset_sent', 'sessions_revoked', 'verification_resent',
    'service_created', 'service_updated', 'service_deleted', 'service_form_published',
    'password_changed',
    'health_check_run', 'health_maintenance_recorded', 'health_event_acknowledged',
    'health_limits_updated', 'health_settings_updated'
  ]::text[]));

-- ── Access: system administrators read, only the service role writes ─────────

alter table public.system_health_components enable row level security;
grant select on public.system_health_components to authenticated;
grant all on public.system_health_components to service_role;
revoke insert, update, delete, truncate on public.system_health_components from authenticated, anon;

drop policy if exists "System administrators can read health components" on public.system_health_components;
create policy "System administrators can read health components"
  on public.system_health_components for select to authenticated
  using ((select public.is_active_system_administrator()));

alter table public.system_health_settings enable row level security;
grant select on public.system_health_settings to authenticated;
grant all on public.system_health_settings to service_role;
revoke insert, update, delete, truncate on public.system_health_settings from authenticated, anon;

drop policy if exists "System administrators can read health settings" on public.system_health_settings;
create policy "System administrators can read health settings"
  on public.system_health_settings for select to authenticated
  using ((select public.is_active_system_administrator()));

-- ── Recording a run ──────────────────────────────────────────────────────────
-- The probe function sends what it measured. Everything that decides what it means
-- (outcome, status, incidents) happens here, once, for both the schedule and Check Now.
--
-- p_results: [{ "key": "database", "ok": true, "response_ms": 88,
--               "object_count": null, "total_bytes": null }, ...]

create or replace function public.system_health_record_run(
  p_run_kind text,
  p_triggered_by uuid,
  p_started_at timestamptz,
  p_results jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  comp public.system_health_components%rowtype;
  open_event public.system_operational_events%rowtype;
  v_now timestamptz := clock_timestamp();
  v_ok boolean;
  v_ms integer;
  v_bytes bigint;
  v_outcome text;
  v_status text;
  v_has_open boolean;
  v_planned boolean;
  v_title text;
  v_summary text;
  v_severity text;
  v_pct numeric;
  v_new uuid;
  v_opened jsonb := '[]'::jsonb;
  v_closed jsonb := '[]'::jsonb;
begin
  if p_run_kind not in ('scheduled', 'manual') then
    raise exception 'Unknown run kind %', p_run_kind;
  end if;
  if jsonb_typeof(p_results) is distinct from 'array' or jsonb_array_length(p_results) = 0 then
    raise exception 'A run needs at least one result';
  end if;

  for r in select value from jsonb_array_elements(p_results) loop
    select * into comp
    from public.system_health_components
    where key = r ->> 'key' and enabled and key <> 'monitor';
    if not found then
      continue;
    end if;

    v_ok := coalesce((r ->> 'ok')::boolean, false);
    v_ms := nullif(r ->> 'response_ms', '')::integer;
    v_bytes := nullif(r ->> 'total_bytes', '')::bigint;
    v_pct := null;

    if not v_ok then
      v_outcome := 'failed';
    elsif comp.key = 'capacity' then
      -- Capacity has no latency. It is "slow" (over its limit) at 85% of the configured size.
      v_pct := case
        when comp.capacity_bytes is not null and v_bytes is not null
          then round(v_bytes::numeric / comp.capacity_bytes * 100, 1)
      end;
      v_outcome := case when v_pct is not null and v_pct >= 85 then 'slow' else 'ok' end;
    elsif comp.slow_after_ms is not null and v_ms is not null and v_ms > comp.slow_after_ms then
      v_outcome := 'slow';
    else
      v_outcome := 'ok';
    end if;

    v_status := case v_outcome
      when 'ok' then 'operational'
      when 'slow' then 'degraded'
      else case when comp.key = 'database' then 'outage' else 'degraded' end
    end;

    insert into public.system_health_snapshots
      (component_key, status, outcome, response_time_ms, recorded_at, run_kind, triggered_by, object_count, total_bytes)
    values
      (comp.key, v_status, v_outcome, case when v_ok then v_ms end, v_now, p_run_kind, p_triggered_by,
       nullif(r ->> 'object_count', '')::bigint, v_bytes);

    -- State change: open or close the incident for this component.
    select * into open_event
    from public.system_operational_events
    where component_key = comp.key and event_type = 'degradation' and resolved_at is null;
    v_has_open := found;

    if v_outcome <> 'ok' and not v_has_open then
      -- Planned maintenance on this component (or on everything) is not an incident.
      v_planned := exists (
        select 1 from public.system_operational_events m
        where m.event_type = 'maintenance'
          and m.component_key in (comp.key, 'all')
          and m.planned_start <= v_now and m.planned_end > v_now
      );
      if not v_planned then
        v_title := case
          when v_outcome = 'failed' then comp.name || ' is not responding'
          when comp.key = 'capacity' then comp.name || ' is nearly full'
          else comp.name || ' is slow'
        end;
        v_summary := case
          when v_outcome = 'failed' then 'The latest check did not get an answer.'
          when comp.key = 'capacity' then trim_scale(v_pct) || '% of the configured capacity is used.'
          else 'Slower than ' || to_char(comp.slow_after_ms, 'FM999,999') || ' ms on the latest check.'
        end;
        v_severity := case when v_outcome = 'failed' and comp.key = 'database' then 'critical' else 'warning' end;
        v_new := null;
        -- Two runs at once must not stack incidents: the unique index allows one open per component.
        insert into public.system_operational_events
          (component_key, severity, event_type, title, summary, started_at)
        values (comp.key, v_severity, 'degradation', v_title, v_summary, v_now)
        on conflict (component_key) where event_type = 'degradation' and resolved_at is null do nothing
        returning id into v_new;
        if v_new is not null then
          v_opened := v_opened || jsonb_build_object('key', comp.key, 'title', v_title, 'severity', v_severity);
        end if;
      end if;
    elsif v_outcome = 'ok' and v_has_open then
      update public.system_operational_events set resolved_at = v_now where id = open_event.id;
      insert into public.system_operational_events
        (component_key, severity, event_type, title, summary, started_at, resolved_at)
      values (comp.key, 'info', 'recovery', comp.name || ' recovered',
              'The latest check returned to normal.', v_now, v_now);
      v_closed := v_closed || jsonb_build_object('key', comp.key, 'title', comp.name || ' recovered');
    end if;
  end loop;

  -- The monitor's own record: one job run per check run, so a silent stop is visible.
  insert into public.system_background_job_runs (job_key, status, started_at, completed_at)
  values ('health-probe', 'succeeded', least(coalesce(p_started_at, v_now), v_now), v_now);

  return jsonb_build_object('recorded_at', v_now, 'opened', v_opened, 'closed', v_closed);
end;
$$;

-- When the probe function itself fails before it can report, it records that here.
create or replace function public.system_health_record_job_failure(
  p_started_at timestamptz,
  p_code text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.system_background_job_runs (job_key, status, failure_code, started_at, completed_at)
  values ('health-probe', 'failed', left(coalesce(nullif(p_code, ''), 'unknown'), 80),
          least(coalesce(p_started_at, clock_timestamp()), clock_timestamp()), clock_timestamp());
$$;

-- ── Reading: one call for the page ───────────────────────────────────────────
-- Availability is weighted by time: each check stands for the time until the next one,
-- capped at 30 minutes, so a gap in checking is not counted as up or down.

create or replace function public.system_health_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with since as (select now() - interval '24 hours' as t),
  latest as (
    select distinct on (component_key)
      component_key, recorded_at, outcome, status, response_time_ms, object_count, total_bytes
    from public.system_health_snapshots
    order by component_key, recorded_at desc
  ),
  win as (
    select s.component_key, s.outcome,
      least(
        coalesce(lead(s.recorded_at) over (partition by s.component_key order by s.recorded_at), now()) - s.recorded_at,
        interval '30 minutes'
      ) as covers
    from public.system_health_snapshots s, since
    where s.recorded_at >= since.t
  ),
  avail as (
    select component_key,
      coalesce(sum(extract(epoch from covers)) filter (where outcome = 'ok'), 0) as ok_s,
      sum(extract(epoch from covers)) as all_s,
      count(*) filter (where outcome = 'ok') as ok_n,
      count(*) filter (where outcome = 'slow') as slow_n,
      count(*) filter (where outcome = 'failed') as failed_n
    from win group by component_key
  ),
  comps as (
    select c.*, l.recorded_at as last_at, l.outcome as last_outcome, l.status as last_status,
      l.response_time_ms as last_ms, l.object_count, l.total_bytes,
      case when a.all_s > 0 then round((a.ok_s / a.all_s * 100)::numeric, 1) end as availability,
      coalesce(a.ok_n, 0) as ok_n, coalesce(a.slow_n, 0) as slow_n, coalesce(a.failed_n, 0) as failed_n
    from public.system_health_components c
    left join latest l on l.component_key = c.key
    left join avail a on a.component_key = c.key
    where c.enabled
  ),
  runs as (
    select
      (select started_at from public.system_background_job_runs where job_key = 'health-probe' order by started_at desc limit 1) as last_run_at,
      (select status from public.system_background_job_runs where job_key = 'health-probe' order by started_at desc limit 1) as last_status,
      (select count(*) from public.system_background_job_runs, since where job_key = 'health-probe' and started_at >= since.t) as runs_24h,
      (select count(*) from public.system_background_job_runs, since where job_key = 'health-probe' and started_at >= since.t and status = 'succeeded') as ok_24h
  ),
  evs as (
    select e.*, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '') as acknowledged_by_name
    from public.system_operational_events e
    left join public.profiles p on p.id = e.acknowledged_by
    where (e.resolved_at is null and e.event_type <> 'maintenance')
       or e.started_at >= now() - interval '7 days'
       or (e.event_type = 'maintenance' and e.planned_end > now())
    order by e.started_at desc
    limit 30
  )
  select jsonb_build_object(
    'now', now(),
    'checked_at', (select max(recorded_at) from public.system_health_snapshots),
    'last_manual_at', (select max(recorded_at) from public.system_health_snapshots where run_kind = 'manual' and triggered_by is not null),
    'components', coalesce((select jsonb_agg(to_jsonb(comps) order by comps.sort_order) from comps), '[]'::jsonb),
    'monitor', (select to_jsonb(runs) from runs),
    'events', coalesce((select jsonb_agg(to_jsonb(evs) order by evs.started_at desc) from evs), '[]'::jsonb),
    'settings', (select to_jsonb(s) from public.system_health_settings s where s.id)
  );
$$;

-- One row per check for the strips and bars. Services only.
create or replace function public.system_health_series(p_hours integer default 24)
returns table (component_key text, recorded_at timestamptz, outcome text, response_time_ms integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.component_key, s.recorded_at, s.outcome, s.response_time_ms
  from public.system_health_snapshots s
  join public.system_health_components c on c.key = s.component_key and c.kind = 'service' and c.enabled
  where s.recorded_at >= now() - make_interval(hours => least(greatest(coalesce(p_hours, 24), 1), 48))
  order by s.recorded_at
  limit 1500;
$$;

-- The sidebar dot. Cheap on purpose: it runs on every dashboard load for a system administrator.
-- True when an incident is open, or when the monitor has failed or gone quiet for 30 minutes.
-- A monitor that has never run is not "needs attention": nothing has been scheduled yet.
create or replace function public.system_health_attention()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.system_operational_events
    where event_type = 'degradation' and resolved_at is null
  ) or coalesce((
    select status <> 'succeeded' or started_at < now() - interval '30 minutes'
    from public.system_background_job_runs
    where job_key = 'health-probe'
    order by started_at desc
    limit 1
  ), false);
$$;

-- ── Administrative actions. Each writes its own audit entry in the same transaction. ──

create or replace function public.system_health_record_maintenance(
  p_actor uuid,
  p_component text,
  p_title text,
  p_note text,
  p_start timestamptz,
  p_end timestamptz,
  p_ip text,
  p_ua text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audit uuid;
  v_event uuid;
begin
  if p_component <> 'all' and not exists (
    select 1 from public.system_health_components where key = p_component and kind = 'service' and enabled
  ) then
    raise exception 'Choose a service or All services.';
  end if;
  if p_title is null or length(trim(p_title)) not between 1 and 120 then
    raise exception 'Enter a title of up to 120 characters.';
  end if;
  if p_note is not null and length(p_note) > 500 then
    raise exception 'The note can be up to 500 characters.';
  end if;
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'The window must end after it starts.';
  end if;

  insert into public.system_audit_events (event_type, actor_profile_id, metadata, masked_ip_address, user_agent)
  values ('health_maintenance_recorded', p_actor,
          jsonb_build_object('component', p_component, 'title', trim(p_title),
                             'starts', p_start, 'ends', p_end),
          left(p_ip, 45), left(p_ua, 300))
  returning id into v_audit;

  insert into public.system_operational_events
    (component_key, severity, event_type, title, summary, started_at, planned_start, planned_end, created_by, related_audit_event_id)
  values (p_component, 'info', 'maintenance', trim(p_title), coalesce(trim(p_note), ''), p_start, p_start, p_end, p_actor, v_audit)
  returning id into v_event;

  return v_event;
end;
$$;

create or replace function public.system_health_acknowledge_event(
  p_actor uuid,
  p_event uuid,
  p_ip text,
  p_ua text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.system_operational_events%rowtype;
  v_audit uuid;
begin
  select * into ev from public.system_operational_events
  where id = p_event and event_type = 'degradation' for update;
  if not found then
    raise exception 'That incident no longer exists.';
  end if;
  if ev.acknowledged_at is not null then
    return;
  end if;

  insert into public.system_audit_events (event_type, actor_profile_id, metadata, masked_ip_address, user_agent)
  values ('health_event_acknowledged', p_actor,
          jsonb_build_object('event_id', ev.id, 'component', ev.component_key, 'title', ev.title),
          left(p_ip, 45), left(p_ua, 300))
  returning id into v_audit;

  update public.system_operational_events
  set acknowledged_by = p_actor, acknowledged_at = clock_timestamp(),
      related_audit_event_id = coalesce(related_audit_event_id, v_audit)
  where id = ev.id;
end;
$$;

-- p_limits: { "database": 600, "authentication": 1200, "storage": 1500, "capacity_bytes": 1073741824 | null }
create or replace function public.system_health_update_limits(
  p_actor uuid,
  p_limits jsonb,
  p_ip text,
  p_ua text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  v_before jsonb;
  v_ms integer;
begin
  select jsonb_object_agg(key, coalesce(slow_after_ms::text, 'null')) ||
         jsonb_build_object('capacity_bytes', (select capacity_bytes from public.system_health_components where key = 'capacity'))
  into v_before
  from public.system_health_components where kind = 'service';

  foreach k in array array['database', 'authentication', 'storage'] loop
    if p_limits ? k then
      v_ms := (p_limits ->> k)::integer;
      if v_ms not between 100 and 60000 then
        raise exception 'A slow limit must be between 100 and 60,000 ms.';
      end if;
      update public.system_health_components
      set slow_after_ms = v_ms, updated_at = clock_timestamp(), updated_by = p_actor
      where key = k;
    end if;
  end loop;

  if p_limits ? 'capacity_bytes' then
    if jsonb_typeof(p_limits -> 'capacity_bytes') = 'null' then
      update public.system_health_components
      set capacity_bytes = null, updated_at = clock_timestamp(), updated_by = p_actor
      where key = 'capacity';
    else
      if (p_limits ->> 'capacity_bytes')::bigint <= 0 then
        raise exception 'Storage capacity must be more than zero.';
      end if;
      update public.system_health_components
      set capacity_bytes = (p_limits ->> 'capacity_bytes')::bigint, updated_at = clock_timestamp(), updated_by = p_actor
      where key = 'capacity';
    end if;
  end if;

  insert into public.system_audit_events (event_type, actor_profile_id, metadata, masked_ip_address, user_agent)
  values ('health_limits_updated', p_actor, jsonb_build_object('before', v_before, 'after', p_limits),
          left(p_ip, 45), left(p_ua, 300));
end;
$$;

-- Manual runs are audited here so the audit row and the snapshots share one transaction.
create or replace function public.system_health_audit_manual_run(
  p_actor uuid,
  p_ip text,
  p_ua text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.system_audit_events (event_type, actor_profile_id, metadata, masked_ip_address, user_agent)
  values ('health_check_run', p_actor, '{}'::jsonb, left(p_ip, 45), left(p_ua, 300));
$$;

-- ── Email alerts ─────────────────────────────────────────────────────────────

create or replace function public.system_health_set_alerts(
  p_actor uuid,
  p_enabled boolean,
  p_ip text,
  p_ua text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.system_health_settings
  set email_alerts = p_enabled, updated_at = clock_timestamp(), updated_by = p_actor
  where id;

  insert into public.system_audit_events (event_type, actor_profile_id, metadata, masked_ip_address, user_agent)
  values ('health_settings_updated', p_actor, jsonb_build_object('email_alerts', p_enabled),
          left(p_ip, 45), left(p_ua, 300));
end;
$$;

-- The probe function asks this when an incident opens or closes. It returns the addresses to
-- email, or null when alerts are off or one went out recently. Claiming starts the cooldown.
create or replace function public.system_health_claim_alert()
returns text[]
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  s public.system_health_settings%rowtype;
  v_to text[];
begin
  select * into s from public.system_health_settings where id for update;
  if not found or not s.email_alerts then
    return null;
  end if;
  if s.last_alert_at is not null
     and s.last_alert_at > clock_timestamp() - make_interval(mins => s.cooldown_minutes) then
    return null;
  end if;

  select array_agg(au.email::text order by au.email) into v_to
  from auth.users au
  join public.profiles p on p.id = au.id
  where p.role::text = 'system_admin' and p.access_status = 'active' and au.email is not null;
  if v_to is null then
    return null;
  end if;

  update public.system_health_settings set last_alert_at = clock_timestamp() where id;
  return v_to;
end;
$$;

-- ── Retention: 30 days of checks, 90 days of resolved incidents ──────────────

create or replace function public.system_health_prune()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshots bigint;
  v_runs bigint;
  v_events bigint;
begin
  delete from public.system_health_snapshots where recorded_at < clock_timestamp() - interval '30 days';
  get diagnostics v_snapshots = row_count;
  delete from public.system_background_job_runs where started_at < clock_timestamp() - interval '30 days';
  get diagnostics v_runs = row_count;
  delete from public.system_operational_events
  where coalesce(resolved_at, planned_end) < clock_timestamp() - interval '90 days';
  get diagnostics v_events = row_count;
  return jsonb_build_object('snapshots', v_snapshots, 'job_runs', v_runs, 'events', v_events);
end;
$$;

-- Only the service role (the app server and the probe function) may call these.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'system_health_record_run(text, uuid, timestamptz, jsonb)',
    'system_health_record_job_failure(timestamptz, text)',
    'system_health_summary()',
    'system_health_series(integer)',
    'system_health_attention()',
    'system_health_record_maintenance(uuid, text, text, text, timestamptz, timestamptz, text, text)',
    'system_health_acknowledge_event(uuid, uuid, text, text)',
    'system_health_update_limits(uuid, jsonb, text, text)',
    'system_health_audit_manual_run(uuid, text, text)',
    'system_health_set_alerts(uuid, boolean, text, text)',
    'system_health_claim_alert()',
    'system_health_prune()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;

-- ── Realtime: the page re-reads when a check lands ───────────────────────────

do $$
declare
  target text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach target in array array[
      'system_health_snapshots', 'system_operational_events',
      'system_background_job_runs', 'system_health_components'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = target
      ) then
        execute format('alter publication supabase_realtime add table public.%I', target);
      end if;
    end loop;
  end if;
end $$;

comment on table public.system_health_components is
  'One row per monitored component: its source, cadence, exposure and limits. Metadata only.';
comment on column public.system_health_snapshots.outcome is
  'ok, slow (over the component limit) or failed (no answer).';
