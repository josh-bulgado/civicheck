-- Applicants may withdraw any online request before staff starts checking.
do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.guard_request_workflow()'::regprocedure) into definition;
  if position('Only a submitted CTC birth, marriage or death request can be cancelled' in definition) = 0 then
    raise exception 'Expected cancellation guard was not found';
  end if;
  definition := replace(definition,
    'or old.request_type not in (''CTC-LOCAL'', ''CTC-ABROAD'', ''CTC_ISSUANCE'')',
    'or old.applicant_id is null or coalesce(old.form_data->>''intake_channel'', '''') = ''walk_in''');
  definition := replace(definition,
    'or coalesce(old.form_data->>''record_type'', '''') not in (''birth'', ''marriage'', ''death'')', '');
  definition := replace(definition,
    'Only a submitted CTC birth, marriage or death request can be cancelled',
    'Only a submitted online request can be cancelled');
  if position('old.request_type not in (''CTC-LOCAL''' in definition) > 0
    or position('coalesce(old.form_data->>''record_type'', '''') not in (''birth'', ''marriage'', ''death'')' in definition) > 0 then
    raise exception 'Cancellation guard could not be updated';
  end if;
  execute definition;
end
$$;

create or replace function public.cancel_own_request(p_request_id uuid, p_applicant_id uuid)
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
    and coalesce(form_data->>'intake_channel', '') <> 'walk_in'
  returning id into cancelled_id;
  if cancelled_id is null then return false; end if;
  insert into public.application_logs(request_id, performed_by_profile_id, action_status, remarks)
  values (cancelled_id, p_applicant_id, 'cancelled', 'Applicant cancelled this request before staff started checking.');
  return true;
end;
$$;
revoke all on function public.cancel_own_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_own_request(uuid, uuid) to service_role;

-- Keep older open pages using the same guarded action.
create or replace function public.cancel_own_ctc_birth_request(p_request_id uuid, p_applicant_id uuid)
returns boolean language sql security invoker set search_path = public
as $$ select public.cancel_own_request(p_request_id, p_applicant_id); $$;
revoke all on function public.cancel_own_ctc_birth_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_own_ctc_birth_request(uuid, uuid) to service_role;
