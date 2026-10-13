-- Notification plumbing for the request message thread.
--
--   * A staff message notifies the applicant: new type 'message' on
--     notifications (written by the server function through the existing
--     dispatch helper, which also sends the email).
--   * An applicant message notifies the owning department's staff and
--     supervisors: new type 'new_message' on staff_notifications, written by an
--     AFTER INSERT trigger through notify_internal_recipients, exactly like
--     'new_request'.
--
-- The trigger swallows its own errors by design (a failed notification must
-- never lose the message). That makes the CHECK constraint on
-- staff_notifications.type load-bearing: if 'new_message' were missing, the
-- insert would fail inside the guard and staff would silently get nothing. The
-- constraint change and the trigger therefore ship together.
--
-- The staff body is deliberately generic; the message text stays in
-- request_messages.

alter table public.notifications
  drop constraint notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'status_change',
    'pre_validation_complete',
    'document_rejected',
    'message'
  ));

alter table public.staff_notifications
  drop constraint staff_notifications_type_check;
alter table public.staff_notifications
  add constraint staff_notifications_type_check
  check (type in (
    'new_request',
    'document_resubmitted',
    'awaiting_cashier',
    'ready_to_release',
    'request_incomplete',
    'request_rejected',
    'new_message'
  ));

create or replace function public.trg_notify_request_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking text;
begin
  begin
    select r.tracking_number into v_tracking
    from public.requests r
    where r.id = new.request_id;

    perform public.notify_internal_recipients(
      new.request_id,
      'new_message',
      format('Request %s: new message', v_tracking),
      'The applicant sent a message about this request.',
      array['staff', 'supervisor'],
      true
    );
  exception when others then
    raise warning 'staff notification (new_message) failed for message %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.trg_notify_request_message() from public, anon, authenticated;

create trigger notify_request_message
  after insert on public.request_messages
  for each row
  when (new.sender_role = 'applicant')
  execute function public.trg_notify_request_message();
