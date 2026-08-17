-- Drop the Payment lane from the queue desk. The CCRO cashier runs its own
-- independent numbering/calling system, and CiviCheck only ever verifies
-- payment (QR) rather than processing it (see requests.payment_status /
-- verify_payment), so a Payment queue lane here was redundant and disconnected
-- from that logic. Remaining lanes: application, releasing, assistance.

delete from public.queue_tickets where lane = 'payment';
delete from public.queue_counters where lane = 'payment';

alter table public.queue_tickets
  drop constraint queue_tickets_lane_check;

alter table public.queue_tickets
  add constraint queue_tickets_lane_check
  check (lane in ('application', 'releasing', 'assistance'));

create or replace function public.issue_queue_ticket(
  p_lane text,
  p_issue_source text,
  p_request_id uuid default null,
  p_appointment_id uuid default null,
  p_applicant_id uuid default null,
  p_walk_in_name text default null
) returns public.queue_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_staff boolean := public.get_user_role()
    in ('frontdesk', 'staff', 'supervisor', 'cashier', 'admin');
  v_date date := current_date;
  v_seq integer;
  v_prefix text;
  v_ticket public.queue_tickets;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not v_is_staff then
    -- An applicant may only check themselves in, against a real appointment today.
    if p_issue_source <> 'self_checkin' then
      raise exception 'Not permitted to issue queue tickets';
    end if;
    if p_applicant_id is distinct from auth.uid() then
      raise exception 'Not permitted to issue a ticket for another applicant';
    end if;
    if not exists (
      select 1 from public.appointments a
      where a.id = p_appointment_id
        and a.applicant_id = auth.uid()
        and a.appointment_date = v_date
        and a.appointment_status = 'scheduled'
    ) then
      raise exception 'You need a scheduled appointment today to check in';
    end if;
  end if;

  v_prefix := case p_lane
    when 'application' then 'A'
    when 'releasing' then 'B'
    when 'assistance' then 'C'
    else 'X'
  end;

  -- Serialize numbering per (date, lane) so simultaneous check-ins can't collide.
  perform pg_advisory_xact_lock(hashtext(v_date::text || ':' || p_lane));

  select coalesce(max(daily_sequence), 0) + 1 into v_seq
  from public.queue_tickets
  where queue_date = v_date and lane = p_lane;

  insert into public.queue_tickets (
    ticket_number, lane, queue_date, daily_sequence,
    request_id, appointment_id, applicant_id, walk_in_name,
    issue_source, issued_by
  ) values (
    v_prefix || '-' || lpad(v_seq::text, 3, '0'), p_lane, v_date, v_seq,
    p_request_id, p_appointment_id, p_applicant_id, p_walk_in_name,
    p_issue_source, case when v_is_staff then auth.uid() else null end
  ) returning * into v_ticket;

  return v_ticket;
end;
$$;
