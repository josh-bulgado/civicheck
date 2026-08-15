-- System administrators are application-level users. Supabase Auth continues
-- to see them as ordinary `authenticated` users; service_role is never assigned.

do $$
declare
  role_type_name text;
begin
  select t.typname into role_type_name
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  where a.attrelid = 'public.profiles'::regclass and a.attname = 'role';

  if role_type_name is not null and exists (
    select 1 from pg_type where typname = role_type_name and typtype = 'e'
  ) then
    execute format('alter type %I add value if not exists %L', role_type_name, 'system_admin');
  end if;
end $$;

-- Replace the conventional text-role check when the installation uses one.
alter table public.profiles drop constraint if exists profiles_role_check;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'role' and data_type <> 'USER-DEFINED'
  ) then
    alter table public.profiles add constraint profiles_role_check check (
      role in ('applicant', 'frontdesk', 'staff', 'supervisor', 'cashier', 'admin', 'system_admin')
    );
  end if;
end $$;

alter table public.profiles
  add column if not exists access_status text not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles(id),
  add column if not exists suspension_reason text;

alter table public.profiles drop constraint if exists profiles_access_status_check;
alter table public.profiles add constraint profiles_access_status_check
  check (access_status in ('active', 'suspended', 'deactivated'));

alter table public.profiles drop constraint if exists profiles_suspension_details_check;
alter table public.profiles add constraint profiles_suspension_details_check check (
  (access_status = 'active' and suspended_at is null and suspended_by is null and suspension_reason is null)
  or
  (access_status <> 'active' and suspended_at is not null and suspended_by is not null and length(trim(suspension_reason)) > 0)
);

-- Profile self-service policies must never become a path to role escalation or
-- self-reactivation. Server service-role writes and SECURITY DEFINER operations
-- remain allowed.
create or replace function public.guard_profile_access_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.role::text = 'system_admin' then
      raise exception 'System Administrator promotion is manual only';
    end if;
    if tg_op = 'UPDATE' and (
      new.role is distinct from old.role
      or new.access_status is distinct from old.access_status
      or new.suspended_at is distinct from old.suspended_at
      or new.suspended_by is distinct from old.suspended_by
      or new.suspension_reason is distinct from old.suspension_reason
    ) then
      raise exception 'Protected profile access fields cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_access_fields on public.profiles;
create trigger guard_profile_access_fields
  before insert or update on public.profiles
  for each row execute function public.guard_profile_access_fields();

create index if not exists profiles_access_status_idx on public.profiles(access_status);
-- CiviCheck serves one CCRO, so there can be at most one active CCRO Administrator.
create unique index if not exists profiles_one_active_ccro_admin_idx
  on public.profiles ((role)) where role = 'admin' and access_status = 'active';

create table if not exists public.system_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'staff_invited', 'invitation_resent', 'invitation_cancelled',
    'role_changed', 'account_suspended', 'account_reactivated',
    'staff_deactivated', 'staff_reactivated', 'ccro_admin_replaced'
  )),
  actor_profile_id uuid not null references public.profiles(id),
  target_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_audit_events_created_at_idx
  on public.system_audit_events(created_at desc);
create index if not exists system_audit_events_actor_idx
  on public.system_audit_events(actor_profile_id);
create index if not exists system_audit_events_type_idx
  on public.system_audit_events(event_type);

alter table public.system_audit_events enable row level security;
grant select on public.system_audit_events to authenticated;
revoke insert, update, delete, truncate on public.system_audit_events from authenticated, anon;

drop policy if exists "System administrators can read system audit events" on public.system_audit_events;
create policy "System administrators can read system audit events"
  on public.system_audit_events for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'system_admin' and p.access_status = 'active'
    )
  );

-- Intentionally no authenticated INSERT/UPDATE/DELETE policies. Server-side
-- service-role operations append events; clients can never mutate the history.

create or replace function public.replace_ccro_admin(
  candidate_id uuid,
  outgoing_role text,
  outgoing_department_id text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  outgoing_id uuid;
  candidate_role text;
begin
  if not exists (
    select 1 from profiles
    where id = actor_id and role::text = 'system_admin' and access_status = 'active'
  ) then raise exception 'Forbidden'; end if;

  if outgoing_role not in ('frontdesk', 'staff', 'supervisor', 'cashier') then
    raise exception 'Invalid outgoing role';
  end if;
  if outgoing_role in ('staff', 'supervisor') and outgoing_department_id is null then
    raise exception 'A department is required for this outgoing role';
  end if;
  if outgoing_department_id is not null and not exists (
    select 1 from departments where id = outgoing_department_id and is_active
  ) then raise exception 'Invalid department'; end if;

  perform pg_advisory_xact_lock(hashtext('civicheck.ccro-admin-replacement'));
  select id into outgoing_id from profiles
    where role = 'admin' and access_status = 'active' for update;
  if outgoing_id is null then raise exception 'Active CCRO Administrator not found'; end if;
  if outgoing_id = candidate_id then raise exception 'Candidate is already the CCRO Administrator'; end if;

  select role into candidate_role from profiles
    where id = candidate_id and access_status = 'active' for update;
  if candidate_role not in ('frontdesk', 'staff', 'supervisor', 'cashier') then
    raise exception 'Candidate must be an active operational staff member';
  end if;

  update profiles set role = outgoing_role,
    department_id = case when outgoing_role in ('staff', 'supervisor') then outgoing_department_id else null end
    where id = outgoing_id;
  update profiles set role = 'admin', department_id = null where id = candidate_id;

  insert into system_audit_events(event_type, actor_profile_id, target_profile_id, metadata)
  values ('ccro_admin_replaced', actor_id, candidate_id,
    jsonb_build_object('outgoing_admin_id', outgoing_id, 'outgoing_role', outgoing_role));
end;
$$;

revoke all on function public.replace_ccro_admin(uuid, text, text) from public;
grant execute on function public.replace_ccro_admin(uuid, text, text) to authenticated;

comment on table public.system_audit_events is
  'Append-only metadata audit history. Never store request form data, citizen records, document URLs, or file contents here.';
