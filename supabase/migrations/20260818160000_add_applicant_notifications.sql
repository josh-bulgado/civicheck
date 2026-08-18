-- Builds out the "notifications" feature spec'd in CLAUDE.md §5 (item 6):
-- the table already existed (recipient_email/subject/body/status/sent_at,
-- an email-outbox shape) but had zero application code reading or writing
-- it, and its staff-facing policies still referenced the 'frontdesk' role
-- removed in 20260818063306_remove_frontdesk_and_appointments, so a
-- cashier or supervisor advancing a request could never actually insert a
-- notification row.

-- ─── bring role lists in line with the current role model ───────────────────

alter policy "Staff can view all notifications" on public.notifications
  using (get_user_role() = ANY (ARRAY['admin', 'staff', 'supervisor', 'cashier']));

alter policy "Staff can insert notifications" on public.notifications
  with check (get_user_role() = ANY (ARRAY['admin', 'staff', 'supervisor', 'cashier']));

-- ─── in-system read state ────────────────────────────────────────────────────

alter table public.notifications
  add column if not exists is_read boolean not null default false,
  add column if not exists read_at timestamptz;

create index if not exists notifications_request_id_idx
  on public.notifications (request_id);

-- Applicants may only flip their own notifications to read — everything
-- else on the row (subject/body/recipient/status) stays staff-authored.
create policy "Applicants can mark own notifications read" on public.notifications
  for update
  using (
    exists (
      select 1 from public.requests r
      where r.id = notifications.request_id
        and r.applicant_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.requests r
      where r.id = notifications.request_id
        and r.applicant_id = (select auth.uid())
    )
  );

-- Lets the dispatching mutation flip a row from 'pending' to 'sent'/'failed'
-- once it knows whether the Resend call succeeded.
create policy "Staff can update notification delivery status" on public.notifications
  for update
  using (get_user_role() = ANY (ARRAY['admin', 'staff', 'supervisor', 'cashier']))
  with check (get_user_role() = ANY (ARRAY['admin', 'staff', 'supervisor', 'cashier']));

-- ─── applicant email lookup for the dispatching mutation ────────────────────

-- The mutations that trigger notifications (advanceRequestStatusFn,
-- setAttachmentVerificationFn) run as the acting staff member, not the
-- applicant, and `profiles`/`requests` don't carry an email column — only
-- auth.users does. Security definer, restricted to the same operational
-- roles as the notification-insert policy above.
create or replace function public.get_applicant_email(p_request_id uuid)
returns text
language sql
security definer
set search_path = public, auth
stable
as $$
  select au.email::text
  from auth.users au
  join public.requests r on r.applicant_id = au.id
  where r.id = p_request_id
    and public.get_user_role() = ANY (ARRAY['admin', 'staff', 'supervisor', 'cashier']);
$$;

revoke all on function public.get_applicant_email(uuid) from public;
grant execute on function public.get_applicant_email(uuid) to authenticated;
