-- Remove the frontdesk role and the appointments feature. The office is a
-- small, single-counter CCRO: a separate reception role and an appointment-
-- booking layer don't earn their keep at this scale. Staff handle walk-ins
-- directly at the counter. Department staff/supervisor requests, logs, and
-- attachment access also become department-scoped here (previously office-
-- wide), matching how the app already scopes department staff.

-- Roles -----------------------------------------------------------------

-- No frontdesk accounts should remain once the role is retired.
update public.profiles
set role = 'staff'
where role = 'frontdesk';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (
    role in ('applicant', 'staff', 'supervisor', 'cashier', 'admin', 'system_admin')
  );

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

  if outgoing_role not in ('staff', 'supervisor', 'cashier') then
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
  if candidate_role not in ('staff', 'supervisor', 'cashier') then
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

drop policy if exists "Staff can read all uploaded documents" on storage.objects;
create policy "Staff can read all uploaded documents"
  on storage.objects
  for select
  using (
    bucket_id = 'request-documents'
    and public.get_user_role() = any (array['admin', 'staff', 'archive', 'legal', 'cashier'])
  );

-- Request workflow --------------------------------------------------------

alter table public.requests
  drop constraint if exists requests_status_check;

update public.requests
set status = 'submitted'
where status = 'pending_frontdesk';

alter table public.requests
  alter column status set default 'submitted';

alter table public.requests
  add constraint requests_status_check
  check (status in (
    'submitted',
    'under_validation',
    'incomplete',
    'rejected',
    'processing',
    'pending_approval',
    'ready_for_release',
    'released'
  ));

-- Department-scoped personnel access --------------------------------------

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and access_status = 'active'
  );
$$;

revoke execute on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

create or replace function public.get_user_department_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select department_id
  from public.profiles
  where id = (select auth.uid())
    and access_status = 'active';
$$;

revoke execute on function public.get_user_department_id() from public, anon;
grant execute on function public.get_user_department_id() to authenticated;

create or replace function public.is_ccro_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user()
    and public.get_user_role()::text in ('staff', 'supervisor', 'cashier', 'admin');
$$;

-- Cashier and admin remain office-wide for their dedicated duties. Staff and
-- supervisor are scoped to services owned by their assigned department.
drop policy if exists "Staff can view all requests" on public.requests;
create policy "Personnel can view permitted requests" on public.requests
  for select to authenticated
  using (
    (select public.is_active_user())
    and (
      (select public.get_user_role())::text in ('admin', 'cashier')
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1 from public.services_registry s
          where s.service_code = requests.request_type
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  );

drop policy if exists "Staff can update requests" on public.requests;
create policy "Personnel can update permitted requests" on public.requests
  for update to authenticated
  using (
    (select public.is_active_user())
    and (
      (select public.get_user_role())::text in ('admin', 'cashier')
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1 from public.services_registry s
          where s.service_code = requests.request_type
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  )
  with check (
    (select public.is_active_user())
    and (
      (select public.get_user_role())::text in ('admin', 'cashier')
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1 from public.services_registry s
          where s.service_code = requests.request_type
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  );

drop policy if exists "Staff can create requests" on public.requests;
create policy "Department personnel can create requests" on public.requests
  for insert to authenticated
  with check (
    (select public.is_active_user())
    and (
      (select public.get_user_role())::text = 'admin'
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1 from public.services_registry s
          where s.service_code = requests.request_type
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  );

drop policy if exists "Staff can view all logs" on public.application_logs;
create policy "Personnel can view permitted logs" on public.application_logs
  for select to authenticated
  using (
    (select public.is_active_user())
    and (
      (select public.get_user_role())::text in ('admin', 'cashier')
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1
          from public.requests r
          join public.services_registry s on s.service_code = r.request_type
          where r.id = application_logs.request_id
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  );

drop policy if exists "Authenticated users can insert logs" on public.application_logs;
create policy "Users can insert permitted logs" on public.application_logs
  for insert to authenticated
  with check (
    (select public.is_active_user())
    and performed_by_profile_id = (select auth.uid())
    and (
      exists (
        select 1 from public.requests r
        where r.id = application_logs.request_id
          and r.applicant_id = (select auth.uid())
      )
      or (select public.get_user_role())::text in ('admin', 'cashier')
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1
          from public.requests r
          join public.services_registry s on s.service_code = r.request_type
          where r.id = application_logs.request_id
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  );

drop policy if exists "Staff can view all attachments" on public.requirements_attachments;
create policy "Personnel can view permitted attachments" on public.requirements_attachments
  for select to authenticated
  using (
    (select public.is_active_user())
    and (
      (select public.get_user_role())::text = 'admin'
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1
          from public.requests r
          join public.services_registry s on s.service_code = r.request_type
          where r.id = requirements_attachments.request_id
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  );

drop policy if exists "Staff can update attachment verification" on public.requirements_attachments;
create policy "Personnel can update permitted attachments" on public.requirements_attachments
  for update to authenticated
  using (
    (select public.is_active_user())
    and (
      (select public.get_user_role())::text = 'admin'
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1
          from public.requests r
          join public.services_registry s on s.service_code = r.request_type
          where r.id = requirements_attachments.request_id
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  )
  with check (
    (select public.is_active_user())
    and (
      (select public.get_user_role())::text = 'admin'
      or (
        (select public.get_user_role())::text in ('staff', 'supervisor')
        and exists (
          select 1
          from public.requests r
          join public.services_registry s on s.service_code = r.request_type
          where r.id = requirements_attachments.request_id
            and s.department_id = (select public.get_user_department_id())
        )
      )
    )
  );

-- Appointments teardown -----------------------------------------------------
-- Walk-in requests are now submitted directly at the counter with no booking
-- step (src/features/requests/walk-in-intake.mutations.ts).

drop table if exists public.appointments cascade;
drop table if exists public.appointment_time_slots cascade;

-- Queue teardown --------------------------------------------------------

drop function if exists public.queue_my_ticket();
drop function if exists public.queue_lane_summary();
drop function if exists public.queue_now_serving();
drop function if exists public.call_next_ticket(text, text);
drop function if exists public.issue_queue_ticket(text, text, uuid, uuid, uuid, text);
drop table if exists public.queue_tickets cascade;
drop table if exists public.queue_counters cascade;
