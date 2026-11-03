-- Security hardening from the October 2026 penetration test.
--
-- The browser holds both the publishable key and the signed-in user's access
-- token, so anything RLS allows, a user can do straight through PostgREST
-- without going near a server function. Each block below closes a path where
-- the server functions enforced a rule that the database did not.

-- ─── 1. Suspended and deactivated accounts lose their role here too ─────────
-- get_user_role() backs most role policies but ignored access_status, so an
-- inactive account kept its database privileges for as long as its access
-- token stayed valid. It now answers only for active profiles.

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and access_status = 'active';
$$;

-- ─── 2. A staff member cannot move themselves into another department ───────
-- department_id is what scopes staff and supervisors to their own requests and
-- documents, but the guard did not cover it: "Users can update own profile"
-- let anyone rewrite it. Employment type is an administrative field as well.

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
      or new.department_id is distinct from old.department_id
      or new.employment_type is distinct from old.employment_type
    ) then
      raise exception 'Protected profile access fields cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;

-- Supervisors were missing from this list (and three retired roles were still
-- in it), so a supervisor's queue showed no applicant names.
drop policy if exists "Staff and admin can view all profiles" on public.profiles;
create policy "Staff and admin can view all profiles"
  on public.profiles
  for select
  using (
    (select public.get_user_role()) = any (array['admin', 'staff', 'supervisor', 'cashier'])
  );

-- ─── 3. Applicants cannot approve or repoint their own documents ────────────
-- The applicant INSERT and UPDATE policies had no column limits, so an
-- applicant could mark their own uploads "approved", or point file_url at
-- another applicant's file and have the resubmit flow delete it with the
-- service role. Both writes now happen only in server functions, after their
-- ownership checks, with the service role.

drop policy if exists "Applicants can upload attachments" on public.requirements_attachments;
drop policy if exists "Applicants can resubmit own attachments" on public.requirements_attachments;

-- Personnel review a document; they never change which file it is or which
-- request it belongs to.
create or replace function public.guard_attachment_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.request_id is distinct from old.request_id
    or new.requirement_name is distinct from old.requirement_name
    or new.subject_role is distinct from old.subject_role
    or new.file_url is distinct from old.file_url
    or new.uploaded_at is distinct from old.uploaded_at
  ) then
    raise exception 'Only the review decision on a document can be changed directly';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_attachment_review_fields on public.requirements_attachments;
create trigger guard_attachment_review_fields
  before update on public.requirements_attachments
  for each row execute function public.guard_attachment_review_fields();

-- ─── 4. The workflow and the cashier hold at the database ───────────────────
-- Personnel may update requests in their scope, and nothing stopped a direct
-- write from skipping stages, releasing an unpaid request, or marking payment
-- verified without the cashier. These are the rules advanceRequestStatusFn and
-- verifyPaymentFn already apply. The transition list mirrors
-- ALLOWED_TRANSITIONS in src/features/requests/request-workflow.ts.

create or replace function public.guard_request_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text;
begin
  -- Server functions on the service role and SECURITY DEFINER routines are
  -- trusted; this guards what a signed-in user can send directly.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'submitted'
      or new.payment_status is distinct from 'unpaid'
      or new.or_number is not null then
      raise exception 'A new request starts submitted and unpaid';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.tracking_number is distinct from old.tracking_number
    or new.applicant_id is distinct from old.applicant_id
    or new.request_type is distinct from old.request_type
    or new.form_data is distinct from old.form_data
    or new.fees_due is distinct from old.fees_due
    or new.copies is distinct from old.copies
    or new.form_template_version_id is distinct from old.form_template_version_id
    or new.created_at is distinct from old.created_at then
    raise exception 'The details of a submitted request cannot be changed directly';
  end if;

  v_role := public.get_user_role();

  if new.payment_status is distinct from old.payment_status
    or new.or_number is distinct from old.or_number then
    if v_role is distinct from 'cashier'
      or old.payment_status is distinct from 'unpaid'
      or new.payment_status is distinct from 'verified'
      or old.status is distinct from 'ready_for_release' then
      raise exception 'Only the cashier verifies payment, once, on a request ready for release';
    end if;
  end if;

  if new.status is distinct from old.status then
    if v_role is null or v_role not in ('staff', 'supervisor', 'admin') then
      raise exception 'Only CCRO staff can move a request through the workflow';
    end if;
    if (old.status::text, new.status::text) not in (
      ('submitted', 'under_validation'),
      ('submitted', 'rejected'),
      ('under_validation', 'incomplete'),
      ('under_validation', 'processing'),
      ('under_validation', 'rejected'),
      ('incomplete', 'under_validation'),
      ('incomplete', 'rejected'),
      ('processing', 'ready_for_release'),
      ('processing', 'under_validation'),
      ('processing', 'rejected'),
      ('ready_for_release', 'released'),
      ('ready_for_release', 'under_validation')
    ) then
      raise exception 'A request cannot move from % to %', old.status, new.status;
    end if;
    if new.status = 'released' and new.payment_status is distinct from 'verified' then
      raise exception 'Payment must be verified before this request can be released';
    end if;
    if new.status = 'processing' and exists (
      select 1 from public.requirements_attachments a
      where a.request_id = new.id
        and a.verification_status is distinct from 'approved'
    ) then
      raise exception 'Every uploaded requirement must be accepted before processing';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_request_workflow on public.requests;
create trigger guard_request_workflow
  before insert or update on public.requests
  for each row execute function public.guard_request_workflow();

-- ─── 5. Only personnel write the audit trail ────────────────────────────────
-- Applicants could insert log rows on their own requests with any action and
-- remark, including "payment_verified", which feeds the cashier's Payment
-- History. Applicant-originated entries are now written by the server.
-- Payment entries belong to the cashier alone.

drop policy if exists "Users can insert permitted logs" on public.application_logs;
drop policy if exists "Personnel can insert permitted logs" on public.application_logs;
create policy "Personnel can insert permitted logs"
  on public.application_logs
  for insert
  to authenticated
  with check (
    (select public.is_active_user())
    and performed_by_profile_id = (select auth.uid())
    and (
      (
        (select public.get_user_role()) = 'cashier'
        and action_status = 'payment_verified'
      )
      or (
        action_status is distinct from 'payment_verified'
        and (
          (select public.get_user_role()) = 'admin'
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
      )
    )
  );

-- A reopened document's reason is a note between staff. The applicant UI never
-- showed it, but the API returned it; now the applicant can't read the row.
drop policy if exists "Applicants can view own request logs" on public.application_logs;
create policy "Applicants can view own request logs"
  on public.application_logs
  for select
  to authenticated
  using (
    action_status is distinct from 'document_reverted'
    and exists (
      select 1 from public.requests r
      where r.id = application_logs.request_id
        and r.applicant_id = (select auth.uid())
    )
  );

-- ─── 6. Applicant notifications follow request scope ────────────────────────
-- Any staff member could read, and write into, every applicant's feed office
-- wide. The subquery runs under the caller's own request policies, so it keeps
-- staff and supervisors to their department.

drop policy if exists "Staff can view all notifications" on public.notifications;
create policy "Staff can view all notifications"
  on public.notifications
  for select
  to authenticated
  using (
    (select public.get_user_role()) = any (array['admin', 'staff', 'supervisor', 'cashier'])
    and exists (select 1 from public.requests r where r.id = notifications.request_id)
  );

drop policy if exists "Staff can insert notifications" on public.notifications;
create policy "Staff can insert notifications"
  on public.notifications
  for insert
  to authenticated
  with check (
    (select public.get_user_role()) = any (array['admin', 'staff', 'supervisor', 'cashier'])
    and exists (select 1 from public.requests r where r.id = notifications.request_id)
  );

drop policy if exists "Staff can update notification delivery status" on public.notifications;
create policy "Staff can update notification delivery status"
  on public.notifications
  for update
  to authenticated
  using (
    (select public.get_user_role()) = any (array['admin', 'staff', 'supervisor', 'cashier'])
    and exists (select 1 from public.requests r where r.id = notifications.request_id)
  )
  with check (
    (select public.get_user_role()) = any (array['admin', 'staff', 'supervisor', 'cashier'])
    and exists (select 1 from public.requests r where r.id = notifications.request_id)
  );

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
  join public.services_registry s on s.service_code = r.request_type
  where r.id = p_request_id
    and (
      public.get_user_role() = any (array['admin', 'cashier'])
      or (
        public.get_user_role() = any (array['staff', 'supervisor'])
        and s.department_id = public.get_user_department_id()
      )
    );
$$;

-- ─── 7. Uploaded documents ──────────────────────────────────────────────────
-- Staff of every department, and the cashier, could list and read every file
-- in the bucket. Personnel now read only files attached to a request they may
-- see. The attachments subquery runs under the caller's own policies, which
-- already scope staff and supervisors to their department.

create index if not exists requirements_attachments_file_url_idx
  on public.requirements_attachments (file_url);

drop policy if exists "Staff can read all uploaded documents" on storage.objects;
drop policy if exists "Personnel read documents on permitted requests" on storage.objects;
create policy "Personnel read documents on permitted requests"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'request-documents'
    and (select public.get_user_role()) = any (array['admin', 'staff', 'supervisor'])
    and exists (
      select 1 from public.requirements_attachments a
      where a.file_url = storage.objects.name
    )
  );

-- The server functions only accept these types and sizes, but applicants
-- upload to their folder with their own session, so the bucket enforces them.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf']
where id = 'request-documents';

-- ─── 8. Leftovers ───────────────────────────────────────────────────────────
-- auto_confirm_user is attached to nothing, but attached to auth.users it
-- would skip email verification entirely. Nothing should be able to reach it.
drop function if exists public.auto_confirm_user();

alter function public.handle_updated_at() set search_path = public;
alter function public.fee_components_are_valid(jsonb, numeric) set search_path = public;
