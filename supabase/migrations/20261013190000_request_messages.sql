-- Per-request message thread, switched on per service.
--
-- "Email Assisted-Online Inquiry/Verification" is a question-and-answer service,
-- but the applicant had no way to type a reply: staff could mark a request
-- incomplete and the applicant could re-upload files, nothing more. This adds
-- an asynchronous thread between the applicant and the staff handling the
-- request. It is not live chat.
--
--   * Immutable: no UPDATE / DELETE grant, so the thread is a faithful record.
--   * Read-only for clients. Every write goes through postRequestMessageFn, the
--     same server-only pattern request creation uses.
--   * Cashier is excluded from reading: it has no request page and no need for
--     the content.
--   * services_registry.allows_messages is the switch. It is off by default and
--     on for EMAIL_INQUIRY only.
--
-- Spec: docs/superpowers/specs/2026-10-13-request-message-thread-design.md

create table public.request_messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  sender_role text not null check (sender_role in ('applicant', 'staff')),
  body        text not null
              check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index request_messages_request_idx
  on public.request_messages (request_id, created_at);

alter table public.request_messages enable row level security;

revoke all on public.request_messages from anon, authenticated;
grant select on public.request_messages to authenticated;
grant all on public.request_messages to service_role;

-- The subquery on requests runs under the caller's RLS, so it inherits
-- "applicants see own requests" and "staff/supervisor see their department".
-- The role check then keeps the cashier (who can see request rows) out.
create policy "Thread participants can read request messages"
  on public.request_messages for select to authenticated
  using (
    (select public.is_active_user())
    and exists (
      select 1
      from public.requests r
      where r.id = request_messages.request_id
        and (
          r.applicant_id = (select auth.uid())
          or (select public.get_user_role()) in ('staff', 'supervisor', 'admin')
        )
    )
  );

-- Realtime evaluates the subscriber's own RLS, so the policy above also decides
-- who receives each event.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_messages'
  ) then
    alter publication supabase_realtime add table public.request_messages;
  end if;
end
$$;

alter table public.services_registry
  add column if not exists allows_messages boolean not null default false;

comment on column public.services_registry.allows_messages is
  'Whether applicants and staff can exchange messages on requests for this service.';

update public.services_registry
set allows_messages = true
where service_code = 'EMAIL_INQUIRY';
