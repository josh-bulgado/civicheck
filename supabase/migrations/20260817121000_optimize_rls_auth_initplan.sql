-- Wrap `auth.uid()` (and `get_user_role()`) in a scalar subselect inside RLS
-- policy expressions.
--
-- Written bare, `auth.uid()` is treated as volatile per row, so Postgres
-- re-evaluates it for every candidate row the policy filters. Wrapped as
-- `(select auth.uid())` the planner hoists it into an InitPlan: evaluated once
-- per statement, then compared as a constant. This is the fix Supabase's own
-- database linter prescribes (lint 0003, `auth_rls_initplan`).
--
-- The comparison itself is unchanged, so the same rows stay visible to the same
-- people — this is a planning change, not an access-control change. Every
-- statement below uses ALTER POLICY rather than DROP/CREATE precisely so the
-- policy's name, command, and role list cannot drift. UPDATE policies that had
-- no explicit WITH CHECK keep that shape (Postgres reuses USING for the check),
-- so only USING is touched there.

-- ─── profiles ────────────────────────────────────────────────────────────────

alter policy "Users can view own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = id);

-- ─── requests ────────────────────────────────────────────────────────────────

alter policy "Applicants can view own requests" on public.requests
  using ((select auth.uid()) = applicant_id);

alter policy "Applicants can create requests" on public.requests
  with check ((select auth.uid()) = applicant_id);

-- ─── requirements_attachments ────────────────────────────────────────────────

alter policy "Applicants can view own attachments" on public.requirements_attachments
  using (
    exists (
      select 1
      from public.requests r
      where r.id = requirements_attachments.request_id
        and r.applicant_id = (select auth.uid())
    )
  );

alter policy "Applicants can upload attachments" on public.requirements_attachments
  with check (
    exists (
      select 1
      from public.requests r
      where r.id = requirements_attachments.request_id
        and r.applicant_id = (select auth.uid())
    )
  );

-- ─── application_logs ────────────────────────────────────────────────────────

alter policy "Applicants can view own request logs" on public.application_logs
  using (
    exists (
      select 1
      from public.requests r
      where r.id = application_logs.request_id
        and r.applicant_id = (select auth.uid())
    )
  );

alter policy "Authenticated users can insert logs" on public.application_logs
  with check ((select auth.uid()) is not null);

-- ─── appointments ────────────────────────────────────────────────────────────

alter policy "Applicants can view own appointments" on public.appointments
  using ((select auth.uid()) = applicant_id);

alter policy "Applicants can create appointments" on public.appointments
  with check ((select auth.uid()) = applicant_id);

alter policy "Applicants can update own appointments" on public.appointments
  using ((select auth.uid()) = applicant_id);

-- ─── feedback_and_complaints ─────────────────────────────────────────────────

alter policy "Applicants can view own feedback" on public.feedback_and_complaints
  using ((select auth.uid()) = applicant_id);

alter policy "Applicants can create feedback" on public.feedback_and_complaints
  with check ((select auth.uid()) = applicant_id);

-- ─── notifications ───────────────────────────────────────────────────────────

alter policy "Applicants can view own notifications" on public.notifications
  using (
    exists (
      select 1
      from public.requests r
      where r.id = notifications.request_id
        and r.applicant_id = (select auth.uid())
    )
  );

-- ─── departments ─────────────────────────────────────────────────────────────

alter policy "Admins can manage departments" on public.departments
  using (
    (select role from public.profiles where id = (select auth.uid()))::text = 'admin'
  )
  with check (
    (select role from public.profiles where id = (select auth.uid()))::text = 'admin'
  );

-- ─── system_audit_events ─────────────────────────────────────────────────────

alter policy "System administrators can read system audit events" on public.system_audit_events
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role::text = 'system_admin'
        and p.access_status = 'active'
    )
  );

-- ─── queue_tickets ───────────────────────────────────────────────────────────

-- `get_user_role()` reads the caller's profile, so it carries the same per-row
-- cost as a bare `auth.uid()` and gets the same treatment.
alter policy "queue_tickets_select_own_or_staff" on public.queue_tickets
  using (
    applicant_id = (select auth.uid())
    or (select public.get_user_role()) = any (
      array['frontdesk', 'staff', 'supervisor', 'cashier', 'admin']
    )
  );
