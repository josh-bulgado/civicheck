-- Hard caps on the request message thread, enforced where they cannot be raced
-- or bypassed by spreading messages across requests.
--
-- Review findings this addresses:
--   * The flood limit lived in postRequestMessageFn: it counted recent messages
--     and then inserted, as two separate steps, so parallel requests could all
--     read "9 so far" and all insert. The check also only counted per request.
--   * Nothing limited one sender across requests, and every applicant message
--     fanned a notification out to every staff member of the department, so an
--     applicant with many Email Inquiry requests could generate an unbounded
--     number of staff notifications.
--
-- The caps now live in a BEFORE INSERT trigger. One advisory lock per sender
-- serializes that sender's inserts until commit, so the count and the insert
-- cannot be split. A rejected insert raises SQLSTATE 54000, which the server
-- function maps to the existing "please wait" message.
--
--   per request, per sender, per hour : 10  (unchanged from the app's limit)
--   per sender across all requests    : 30  per hour
--
-- Staff notifications for a new message now collapse while one is still
-- unread, like new_request and document_resubmitted: the unread row is
-- refreshed instead of a new one being added, so a department member sees one
-- alert per request until they read it.

create or replace function public.enforce_request_message_caps()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_per_request constant integer := 10;
  v_per_sender constant integer := 30;
  v_window constant interval := interval '60 minutes';
  v_recent_request integer;
  v_recent_sender integer;
begin
  -- A sender whose account is gone has nothing to rate-limit.
  if new.sender_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('request_messages:' || new.sender_id::text, 0)
  );

  select
    count(*) filter (where m.request_id = new.request_id),
    count(*)
  into v_recent_request, v_recent_sender
  from public.request_messages m
  where m.sender_id = new.sender_id
    and m.created_at > now() - v_window;

  if v_recent_request >= v_per_request then
    raise exception 'message_rate_limit_request'
      using errcode = '54000',
            hint = 'Too many messages on this request in the last hour.';
  end if;
  if v_recent_sender >= v_per_sender then
    raise exception 'message_rate_limit_sender'
      using errcode = '54000',
            hint = 'Too many messages across requests in the last hour.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_request_message_caps()
  from public, anon, authenticated;

create trigger enforce_request_message_caps
  before insert on public.request_messages
  for each row
  execute function public.enforce_request_message_caps();

-- Collapse unread repeats for new_message. This is the live definition of the
-- helper (including the advisory lock a later migration added) with
-- 'new_message' added to both type lists.
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
  if v_tracking !~ '^CCRO-[0-9]{4}-[0-9]{6}$' then
    return;
  end if;
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

  if p_type in ('new_request', 'document_resubmitted', 'new_message') then
    perform pg_advisory_xact_lock(
      hashtextextended('staff_notifications:' || p_request_id::text || ':' || p_type, 0)
    );

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
    p_type in ('new_request', 'document_resubmitted', 'new_message')
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
