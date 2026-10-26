-- Rolls back 20261027120000_security_hardening.sql, 20261027121000_add_rate_limits.sql
-- and 20261027122000_scope_personnel_profile_reads.sql, restoring the definitions
-- the live project had before them. Run by hand, and only together with a
-- deployment of code that still writes attachments and applicant log entries
-- with the applicant's own session (anything before the hardening commit).
-- Rolling back reopens every hole those migrations closed.

-- 1. Profile reads (20261027122000).
drop policy if exists "Personnel can view profiles they work with" on public.profiles;
drop policy if exists "Staff and admin can view all profiles" on public.profiles;
create policy "Staff and admin can view all profiles"
  on public.profiles
  for select
  using (get_user_role() = any (array['admin', 'frontdesk', 'staff', 'archive', 'legal', 'cashier']));

-- 2. Rate limits (20261027121000).
drop function if exists public.consume_rate_limit(text, integer, integer);
drop table if exists public.rate_limit_hits;

-- 3. Security hardening (20261027120000), last block first.
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  new.confirmed_at := coalesce(new.confirmed_at, now());
  return new;
end;
$$;
alter function public.handle_updated_at() reset search_path;
alter function public.fee_components_are_valid(jsonb, numeric) reset search_path;

update storage.buckets
set file_size_limit = null, allowed_mime_types = null
where id = 'request-documents';

drop policy if exists "Personnel read documents on permitted requests" on storage.objects;
create policy "Staff can read all uploaded documents"
  on storage.objects
  for select
  using (
    bucket_id = 'request-documents'
    and public.get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier'])
  );
drop index if exists public.requirements_attachments_file_url_idx;

create or replace function public.get_applicant_email(p_request_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select au.email::text
  from auth.users au
  join public.requests r on r.applicant_id = au.id
  where r.id = p_request_id
    and public.get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']);
$$;

drop policy if exists "Staff can view all notifications" on public.notifications;
create policy "Staff can view all notifications"
  on public.notifications
  for select
  using (get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']));
drop policy if exists "Staff can insert notifications" on public.notifications;
create policy "Staff can insert notifications"
  on public.notifications
  for insert
  with check (get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']));
drop policy if exists "Staff can update notification delivery status" on public.notifications;
create policy "Staff can update notification delivery status"
  on public.notifications
  for update
  using (get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']))
  with check (get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']));

drop policy if exists "Applicants can view own request logs" on public.application_logs;
create policy "Applicants can view own request logs"
  on public.application_logs
  for select
  using (exists (
    select 1 from public.requests r
    where r.id = application_logs.request_id and r.applicant_id = (select auth.uid())
  ));
drop policy if exists "Personnel can insert permitted logs" on public.application_logs;
create policy "Users can insert permitted logs"
  on public.application_logs
  for insert
  to authenticated
  with check (
    (select public.is_active_user())
    and performed_by_profile_id = (select auth.uid())
    and (
      exists (
        select 1 from public.requests r
        where r.id = application_logs.request_id and r.applicant_id = (select auth.uid())
      )
      or (select public.get_user_role()) = any (array['admin', 'cashier'])
      or (
        (select public.get_user_role()) = any (array['staff', 'supervisor'])
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

drop trigger if exists guard_request_workflow on public.requests;
drop function if exists public.guard_request_workflow();

drop trigger if exists guard_attachment_review_fields on public.requirements_attachments;
drop function if exists public.guard_attachment_review_fields();
create policy "Applicants can upload attachments"
  on public.requirements_attachments
  for insert
  with check (exists (
    select 1 from public.requests r
    where r.id = requirements_attachments.request_id and r.applicant_id = (select auth.uid())
  ));
create policy "Applicants can resubmit own attachments"
  on public.requirements_attachments
  for update
  using (exists (
    select 1 from public.requests r
    where r.id = requirements_attachments.request_id and r.applicant_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.requests r
    where r.id = requirements_attachments.request_id and r.applicant_id = (select auth.uid())
  ));

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
      or new.sessions_revoked_at is distinct from old.sessions_revoked_at
    ) then
      raise exception 'Protected profile access fields cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;
alter function public.get_user_role() reset search_path;
