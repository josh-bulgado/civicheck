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
    and (not p_department_scoped or p.department_id = v_department);
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
    if new.status = 'ready_for_release' then
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
      perform public.notify_internal_recipients(
        new.id,
        'request_incomplete',
        format('Request %s: marked incomplete', new.tracking_number),
        format('%s was marked incomplete and is waiting on the applicant.', v_label),
        array['admin'],
        false
      );
    elsif new.status = 'rejected' then
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
begin
  begin
    select tracking_number into v_tracking from public.requests where id = new.request_id;
    perform public.notify_internal_recipients(
      new.request_id,
      'document_resubmitted',
      format('Request %s: document resubmitted', v_tracking),
      format('"%s" was resubmitted after rejection and needs review.', new.requirement_name),
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
revoke execute on function public.notify_internal_recipients(uuid, text, text, text, text[], boolean)
  from public, anon, authenticated;
revoke execute on function public.trg_notify_request_submitted() from public, anon, authenticated;
revoke execute on function public.trg_notify_request_status_changed() from public, anon, authenticated;
revoke execute on function public.trg_notify_request_payment_verified() from public, anon, authenticated;
revoke execute on function public.trg_notify_document_resubmitted() from public, anon, authenticated;
