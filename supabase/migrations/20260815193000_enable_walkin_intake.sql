-- Walk-in intake (CLAUDE.md §5 #2) needs two things the schema didn't allow:
--   1. a request that belongs to no account, because the person at the counter
--      has never registered;
--   2. staff to be able to create a request at all — the only INSERT policy was
--      "auth.uid() = applicant_id", which no staff member can ever satisfy.
--
-- It also fixes the staff role arrays in existing policies: they still list the
-- 'archive' and 'legal' roles dropped in simplify_staff_roles, and they omit
-- 'supervisor' entirely, so supervisors could not see any request.

alter table public.requests
  alter column applicant_id drop not null;

comment on column public.requests.applicant_id is
  'Null for walk-ins encoded at the counter by staff, who have no account. The subject''s name lives in form_data.';

-- Single definition of "CCRO personnel" so the role list stops drifting
-- between policies.
create or replace function public.is_ccro_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_role()
    in ('frontdesk', 'staff', 'supervisor', 'cashier', 'admin');
$$;

revoke execute on function public.is_ccro_staff() from public, anon;
grant execute on function public.is_ccro_staff() to authenticated;

-- requests -------------------------------------------------------------------

drop policy if exists "Staff can view all requests" on public.requests;
create policy "Staff can view all requests" on public.requests
  for select to authenticated
  using (public.is_ccro_staff());

drop policy if exists "Staff can update requests" on public.requests;
create policy "Staff can update requests" on public.requests
  for update to authenticated
  using (public.is_ccro_staff())
  with check (public.is_ccro_staff());

-- Front desk encodes walk-ins; the applicant-owned path is unchanged.
drop policy if exists "Staff can create requests" on public.requests;
create policy "Staff can create requests" on public.requests
  for insert to authenticated
  with check (public.is_ccro_staff());

-- application_logs -----------------------------------------------------------

drop policy if exists "Staff can view all logs" on public.application_logs;
create policy "Staff can view all logs" on public.application_logs
  for select to authenticated
  using (public.is_ccro_staff());

-- requirements_attachments ---------------------------------------------------

drop policy if exists "Staff can view all attachments" on public.requirements_attachments;
create policy "Staff can view all attachments" on public.requirements_attachments
  for select to authenticated
  using (public.is_ccro_staff());

drop policy if exists "Staff can update attachment verification" on public.requirements_attachments;
create policy "Staff can update attachment verification" on public.requirements_attachments
  for update to authenticated
  using (public.get_user_role() in ('admin', 'frontdesk', 'staff', 'supervisor'))
  with check (public.get_user_role() in ('admin', 'frontdesk', 'staff', 'supervisor'));
