-- In-system notifications for CCRO personnel (staff, supervisor, cashier,
-- admin). One row per recipient, written only by the fan-out triggers in
-- 20261010121000. The applicant `notifications` table is untouched: it is also
-- the email outbox and its policies hang off request ownership.

create table public.staff_notifications (
  id              uuid primary key default gen_random_uuid(),
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  request_id      uuid not null references public.requests(id) on delete cascade,
  -- Denormalized so the feed label and the cashier deep link never depend on
  -- the reader still having RLS access to the request row.
  tracking_number text not null,
  type            text not null,
  title           text not null,
  body            text not null,
  is_read         boolean not null default false,
  read_at         timestamptz,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint staff_notifications_type_check check (type in (
    'new_request',
    'document_resubmitted',
    'awaiting_cashier',
    'ready_to_release',
    'request_incomplete',
    'request_rejected'
  ))
);

create index staff_notifications_recipient_idx
  on public.staff_notifications (recipient_id, created_at desc);
create index staff_notifications_unread_idx
  on public.staff_notifications (recipient_id) where not is_read;
create index staff_notifications_request_idx
  on public.staff_notifications (request_id);

alter table public.staff_notifications enable row level security;

-- Nothing but the security-definer fan-out writes rows. Recipients may read
-- their own rows and flip the three state columns, nothing else.
revoke all on public.staff_notifications from anon, authenticated;
grant select on public.staff_notifications to authenticated;
grant update (is_read, read_at, archived_at) on public.staff_notifications to authenticated;
grant all on public.staff_notifications to service_role;

create policy "Recipients can view own staff notifications"
  on public.staff_notifications for select to authenticated
  using (
    recipient_id = (select auth.uid())
    and (select public.is_active_user())
  );

create policy "Recipients can update own staff notifications"
  on public.staff_notifications for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and (select public.is_active_user())
  )
  with check (recipient_id = (select auth.uid()));

comment on table public.staff_notifications is
  'In-system notification feed for CCRO personnel; one row per recipient, written by triggers.';

-- Realtime delivers each event only to subscribers whose own RLS allows the row.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'staff_notifications'
  ) then
    alter publication supabase_realtime add table public.staff_notifications;
  end if;
end
$$;
