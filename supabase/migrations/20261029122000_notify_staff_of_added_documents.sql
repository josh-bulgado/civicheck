-- Applicants visit once, at release, so a document staff ask for while a
-- request is incomplete is uploaded from My Requests (addMissingAttachmentFn)
-- instead of brought in. Those uploads are new attachment rows, which the
-- resubmission alert (an update from rejected to pending) never sees. This
-- alerts the request's department the same way.
--
-- It reuses the 'document_resubmitted' type: same audience, same "a document
-- needs review" meaning, and its unread alert per request is refreshed rather
-- than repeated when several files arrive. Documents sent with the request
-- itself are left out; the new_request alert covers those.

create or replace function public.trg_notify_document_added()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tracking text;
  v_status text;
begin
  begin
    select r.tracking_number, r.status into v_tracking, v_status
    from public.requests r where r.id = new.request_id;

    if v_status is distinct from 'incomplete' then
      return null;
    end if;

    perform public.notify_internal_recipients(
      new.request_id,
      'document_resubmitted',
      format('Request %s: document uploaded', v_tracking),
      format('"%s" was uploaded for this incomplete request and needs review.', new.requirement_name),
      array['staff', 'supervisor'],
      true
    );
  exception when others then
    raise warning 'staff notification (document added) failed for attachment %: %', new.id, sqlerrm;
  end;
  return null;
end;
$function$;

drop trigger if exists notify_document_added on public.requirements_attachments;
create trigger notify_document_added
  after insert on public.requirements_attachments
  for each row
  execute function public.trg_notify_document_added();

revoke execute on function public.trg_notify_document_added() from public, anon, authenticated;
