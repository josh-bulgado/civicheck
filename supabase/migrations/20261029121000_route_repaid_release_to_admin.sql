-- A request returned to validation keeps its verified payment. When staff mark
-- it ready for release again, the cashier was alerted to verify a payment they
-- had already taken (and verifyPaymentFn then refused it), while the admin, who
-- releases, heard nothing. A paid request now goes to the admin as "ready to
-- release", the same alert the cashier's verification sends.
--
-- Otherwise the same as the live function (20261010121000, as amended).

create or replace function public.trg_notify_request_status_changed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_label text;
  v_free boolean := coalesce(old.fees_due, 0) <= 0;
begin
  begin
    v_label := public.notification_service_label(new.request_type);

    if not public.notification_actor_is(array['staff', 'supervisor', 'admin']) then
      return null;
    end if;

    if new.status = 'ready_for_release' then
      if old.status is distinct from 'processing' then
        return null;
      end if;
      if new.payment_status = 'verified' then
        perform public.notify_internal_recipients(
          new.id,
          'ready_to_release',
          format('Request %s: ready for release', new.tracking_number),
          format('%s is ready to be released. Payment was verified earlier.', v_label),
          array['admin'],
          false
        );
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
          else format('%s — fee due ₱%s.', v_label, to_char(old.fees_due, 'FM999,999,990.00'))
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
$function$;
