-- The unread de-duplication in notify_internal_recipients is a check-then-write:
-- it looks for an unread row and then refreshes or inserts. Two concurrent
-- applicant-triggered events for the same request could both pass the check
-- and both insert, defeating the amplification guard.
--
-- Serialize them per (request, type) with a transaction-scoped advisory lock
-- rather than a partial unique index: an index would make a recipient's
-- "mark as unread" fail with a constraint error whenever a newer unread row
-- exists, which is a worse failure than the rare duplicate it prevents.
--
-- Everything else in the function is unchanged from 20261010121000.

create or replace function public.notify_internal_recipients(
  p_request_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_roles text[],
  p_department_scoped boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking text;
  v_department text;
  v_recipients uuid[];
begin
  select r.tracking_number, s.department_id
    into v_tracking, v_department
  from public.requests r
  left join public.services_registry s on s.service_code = r.request_type
  where r.id = p_request_id;

  if v_tracking is null then
    return;
  end if;
  -- Applicants can insert request rows straight through the API, so the
  -- tracking number is client-controlled text. Only the format the app itself
  -- mints may reach a staff feed; anything else is a forgery and is dropped
  -- (the request itself is untouched).
  if v_tracking !~ '^CCRO-[0-9]{4}-[0-9]{6}$' then
    return;
  end if;
  -- A service with no department matches nobody, never everybody.
  if p_department_scoped and v_department is null then
    return;
  end if;

  select coalesce(array_agg(p.id), '{}')
    into v_recipients
  from public.profiles p
  where p.role = any (p_roles)
    and p.access_status = 'active'
    and p.id is distinct from auth.uid()
    and (not p_department_scoped or p.department_id = v_department);

  if p_type in ('new_request', 'document_resubmitted') then
    -- Held until the end of the calling transaction. Each following statement
    -- takes a fresh READ COMMITTED snapshot, so a waiter sees the row the
    -- holder just wrote and refreshes it instead of inserting a second one.
    perform pg_advisory_xact_lock(
      hashtextextended('staff_notifications:' || p_request_id::text || ':' || p_type, 0)
    );

    -- Collapse means *refresh*, not drop: the unread row moves to the top with
    -- the latest title and body (and emits a Realtime UPDATE), so a staff member
    -- who works from the queue and never opens the feed still sees each event.
    update public.staff_notifications n
    set created_at = clock_timestamp(),
        title = p_title,
        body = p_body
    where n.recipient_id = any (v_recipients)
      and n.request_id = p_request_id
      and n.type = p_type
      and not n.is_read
      and n.archived_at is null;
  end if;

  insert into public.staff_notifications
    (recipient_id, request_id, tracking_number, type, title, body)
  select r, p_request_id, v_tracking, p_type, p_title, p_body
  from unnest(v_recipients) as r
  where not (
    p_type in ('new_request', 'document_resubmitted')
    and exists (
      select 1 from public.staff_notifications n
      where n.recipient_id = r
        and n.request_id = p_request_id
        and n.type = p_type
        and not n.is_read
        and n.archived_at is null
    )
  );
end;
$$;

revoke execute on function public.notify_internal_recipients(uuid, text, text, text, text[], boolean)
  from public, anon, authenticated;
