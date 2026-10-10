-- Fan-out for staff_notifications. Everything here runs as the function owner
-- (security definer) because the events are caused by the applicant or the
-- cashier, who have no INSERT right on staff_notifications by design.
--
-- Every trigger function wraps its work in an exception handler: a failed
-- notification must never roll back the submission, status change or payment
-- confirmation that caused it.

create or replace function public.notification_service_label(p_service_code text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select coalesce(nullif(s.display_name, ''), s.name)
     from public.services_registry s
     where s.service_code = p_service_code),
    p_service_code
  );
$$;

-- Who may announce an event. The role gates (only the cashier verifies payment,
-- only process roles move a request on) are enforced by the server functions,
-- but the RLS UPDATE policies on `requests` and `requirements_attachments`
-- let any department staff write those columns straight through the API. A
-- notification is a trusted statement ("the cashier verified payment"), so the
-- trigger re-checks the actor itself. An end-user JWT must carry a listed
-- role. A caller with no end-user identity (service role, migrations, SQL
-- editor) is trusted, but an `anon` token is not: it also has no sub, and
-- must fail closed.
create or replace function public.notification_actor_is(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is not null then exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.access_status = 'active'
        and p.role = any (p_roles)
    )
    else coalesce(auth.role(), '') <> 'anon'
  end;
$$;

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

  insert into public.staff_notifications
    (recipient_id, request_id, tracking_number, type, title, body)
  select p.id, p_request_id, v_tracking, p_type, p_title, p_body
  from public.profiles p
  where p.role = any (p_roles)
    and p.access_status = 'active'
    and p.id is distinct from auth.uid()
    and (not p_department_scoped or p.department_id = v_department)
    -- Applicant-triggered alerts collapse while one is still unread, so
    -- toggling a document or spamming the API cannot multiply rows.
    and not (
      p_type in ('new_request', 'document_resubmitted')
      and exists (
        select 1 from public.staff_notifications n
        where n.recipient_id = p.id
          and n.request_id = p_request_id
          and n.type = p_type
          and not n.is_read
          and n.archived_at is null
      )
    );
end;
$$;

-- ─── requests: submitted ────────────────────────────────────────────────────

create or replace function public.trg_notify_request_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.notify_internal_recipients(
      new.id,
      'new_request',
      format('Request %s: new request', new.tracking_number),
      format('%s was submitted.', public.notification_service_label(new.request_type)),
      array['staff', 'supervisor'],
      true
    );
  exception when others then
    raise warning 'staff notification (new_request) failed for request %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- ─── requests: status changed ───────────────────────────────────────────────

create or replace function public.trg_notify_request_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := public.notification_service_label(new.request_type);
  v_free boolean := coalesce(new.fees_due, 0) <= 0;
begin
  begin
    -- Only the roles that may move a request on can announce a status change.
    if not public.notification_actor_is(array['staff', 'supervisor', 'admin']) then
      return null;
    end if;

    -- The server function enforces ALLOWED_TRANSITIONS, but RLS lets staff write
    -- `status` directly, so only announce a hop the workflow actually allows
    -- (mirrors request-workflow.ts; keep the two in step).
    if new.status = 'ready_for_release' then
      if old.status is distinct from 'processing' then
        return null;
      end if;
      perform public.notify_internal_recipients(
        new.id,
        'awaiting_cashier',
        case when v_free
          then format('Request %s: ready for fee-free confirmation', new.tracking_number)
          else format('Request %s: ready for payment verification', new.tracking_number)
        end,
        case when v_free
          then format('%s — no fee is due. Confirm it at the counter.', v_label)
          else format('%s — fee due ₱%s.', v_label, to_char(new.fees_due, 'FM999,999,990.00'))
        end,
        array['cashier'],
        false
      );
    elsif new.status = 'incomplete' then
      if old.status is distinct from 'under_validation' then
        return null;
      end if;
      perform public.notify_internal_recipients(
        new.id,
        'request_incomplete',
        format('Request %s: marked incomplete', new.tracking_number),
        format('%s was marked incomplete and is waiting on the applicant.', v_label),
        array['admin'],
        false
      );
    elsif new.status = 'rejected' then
      if old.status not in ('submitted', 'under_validation', 'incomplete', 'processing') then
        return null;
      end if;
      perform public.notify_internal_recipients(
        new.id,
        'request_rejected',
        format('Request %s: rejected', new.tracking_number),
        format('%s was rejected.', v_label),
        array['admin'],
        false
      );
    end if;
  exception when others then
    raise warning 'staff notification (status %) failed for request %: %', new.status, new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- ─── requests: payment verified / fee-free confirmed ────────────────────────

create or replace function public.trg_notify_request_payment_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free boolean := coalesce(new.fees_due, 0) <= 0;
begin
  begin
    -- Only the cashier verifies payment. A staff member (or admin) writing
    -- payment_status directly must not produce a "payment verified" alert.
    if not public.notification_actor_is(array['cashier']) then
      return null;
    end if;
    -- verifyPaymentFn always writes the OR number with a paid verification.
    -- A fee request marked verified without one is not a verified payment.
    if not v_free and nullif(btrim(coalesce(new.or_number, '')), '') is null then
      return null;
    end if;

    perform public.notify_internal_recipients(
      new.id,
      'ready_to_release',
      case when v_free
        then format('Request %s: fee-free request confirmed', new.tracking_number)
        else format('Request %s: payment verified', new.tracking_number)
      end,
      format('%s is ready to be released.', public.notification_service_label(new.request_type)),
      array['admin'],
      false
    );
  exception when others then
    raise warning 'staff notification (payment verified) failed for request %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- ─── attachments: rejected document resubmitted ─────────────────────────────

create or replace function public.trg_notify_document_resubmitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking text;
  v_service text;
  v_name text;
begin
  begin
    select r.tracking_number, r.request_type into v_tracking, v_service
    from public.requests r where r.id = new.request_id;

    -- "Resubmitted" is a statement about the applicant. Staff reverting a
    -- verification (rejected -> pending) is not a resubmission.
    if auth.uid() is not null
       and not exists (
         select 1 from public.requests r
         where r.id = new.request_id and r.applicant_id = auth.uid()
       ) then
      return null;
    end if;

    -- Applicants may edit requirement_name on their own rows through the API,
    -- so it is shown verbatim only when it names a real requirement of the
    -- request's service; otherwise the alert stays generic.
    select m.requirement_name into v_name
    from public.service_requirements_metadata m
    where m.service_code = v_service
      and m.requirement_name = new.requirement_name
    limit 1;

    perform public.notify_internal_recipients(
      new.request_id,
      'document_resubmitted',
      format('Request %s: document resubmitted', v_tracking),
      case when v_name is not null
        then format('"%s" was resubmitted after rejection and needs review.', v_name)
        else 'A rejected document was resubmitted and needs review.'
      end,
      array['staff', 'supervisor'],
      true
    );
  exception when others then
    raise warning 'staff notification (document resubmitted) failed for attachment %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- ─── triggers ───────────────────────────────────────────────────────────────

drop trigger if exists notify_request_submitted on public.requests;
create trigger notify_request_submitted
  after insert on public.requests
  for each row
  when (new.status = 'submitted')
  execute function public.trg_notify_request_submitted();

drop trigger if exists notify_request_status_changed on public.requests;
create trigger notify_request_status_changed
  after update of status on public.requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.trg_notify_request_status_changed();

-- Only while the request is awaiting release: the legacy path that set
-- status = 'released' and payment_status = 'verified' together must not alert
-- the admin about a document that has already left the counter.
drop trigger if exists notify_request_payment_verified on public.requests;
create trigger notify_request_payment_verified
  after update of payment_status on public.requests
  for each row
  when (
    old.payment_status is distinct from new.payment_status
    and new.payment_status = 'verified'
    and new.status = 'ready_for_release'
  )
  execute function public.trg_notify_request_payment_verified();

drop trigger if exists notify_document_resubmitted on public.requirements_attachments;
create trigger notify_document_resubmitted
  after update of verification_status on public.requirements_attachments
  for each row
  when (old.verification_status = 'rejected' and new.verification_status = 'pending')
  execute function public.trg_notify_document_resubmitted();

-- ─── lock the functions down ────────────────────────────────────────────────
-- Triggers fire regardless of EXECUTE rights; nobody should call these directly.

revoke execute on function public.notification_service_label(text) from public, anon, authenticated;
revoke execute on function public.notification_actor_is(text[]) from public, anon, authenticated;
revoke execute on function public.notify_internal_recipients(uuid, text, text, text, text[], boolean)
  from public, anon, authenticated;
revoke execute on function public.trg_notify_request_submitted() from public, anon, authenticated;
revoke execute on function public.trg_notify_request_status_changed() from public, anon, authenticated;
revoke execute on function public.trg_notify_request_payment_verified() from public, anon, authenticated;
revoke execute on function public.trg_notify_document_resubmitted() from public, anon, authenticated;
