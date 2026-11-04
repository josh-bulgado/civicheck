-- Keep cancelled requests and their documents as part of the record.
alter table public.requests drop constraint requests_status_check;
alter table public.requests add constraint requests_status_check check (
  status in ('submitted', 'under_validation', 'incomplete', 'rejected',
    'processing', 'ready_for_release', 'released', 'cancelled')
);

-- Apply cancellation rules even to server writes. Keep the existing staff rules.
do $$
declare definition text;
begin
  select replace(pg_get_functiondef('public.guard_request_workflow()'::regprocedure), E'\r\n', E'\n') into definition;
  definition := replace(definition, E'\nbegin\n', E'\nbegin\n' || $guard$
  if tg_op = 'INSERT' and new.status = 'cancelled' then
    raise exception 'A new request cannot start cancelled';
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'cancelled' and new.status is distinct from old.status then
      raise exception 'A cancelled request cannot be reopened';
    end if;
    if new.status = 'cancelled' and new.status is distinct from old.status then
      if current_user in ('anon', 'authenticated') then
        raise exception 'Use the cancel request action';
      end if;
      if old.status is distinct from 'submitted'
        or old.request_type not in ('CTC-LOCAL', 'CTC-ABROAD', 'CTC_ISSUANCE')
        or (old.form_data->>'record_type') is distinct from 'birth' then
        raise exception 'Only a submitted CTC birth request can be cancelled';
      end if;
    end if;
  end if;
$guard$);
  execute definition;

  select pg_get_functiondef('public.guard_attachment_review_fields()'::regprocedure) into definition;
  definition := replace(definition, 'r.status in (''released'', ''rejected'')',
    'r.status in (''released'', ''rejected'', ''cancelled'')');
  execute definition;
end $$;

-- The server supplies the applicant ID from the checked session, never the browser.
-- Update and history entry succeed together. The status filter handles staff races.
create function public.cancel_own_ctc_birth_request(p_request_id uuid, p_applicant_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare cancelled_id uuid;
begin
  update public.requests set status = 'cancelled'
  where id = p_request_id and applicant_id = p_applicant_id
    and status = 'submitted'
    and request_type in ('CTC-LOCAL', 'CTC-ABROAD', 'CTC_ISSUANCE')
    and form_data->>'record_type' = 'birth'
  returning id into cancelled_id;

  if cancelled_id is null then return false; end if;
  insert into public.application_logs(request_id, performed_by_profile_id, action_status, remarks)
  values (cancelled_id, p_applicant_id, 'cancelled', 'Applicant cancelled this request before staff started checking.');
  return true;
end;
$$;
revoke all on function public.cancel_own_ctc_birth_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_own_ctc_birth_request(uuid, uuid) to service_role;

-- A cancelled request is no longer pending in staff reports.
do $$
declare definition text;
begin
  if to_regprocedure('public.ccro_service_report(timestamptz,timestamptz,text)') is not null then
    select pg_get_functiondef('public.ccro_service_report(timestamptz,timestamptz,text)'::regprocedure) into definition;
    definition := replace(definition, 'status not in (''released'', ''rejected'')',
      'status not in (''released'', ''rejected'', ''cancelled'')');
    execute definition;
  end if;
end $$;
