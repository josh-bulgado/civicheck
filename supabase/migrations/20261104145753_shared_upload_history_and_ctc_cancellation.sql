-- Keep the existing function names so older app instances remain compatible.
-- Preserve rejected uploads for every service using the existing history viewers.
create or replace function public.preserve_death_previous_upload()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- History is maintained here, never supplied by a client.
  new.previous_uploads := old.previous_uploads;
  if new.file_url is distinct from old.file_url
    and old.verification_status = 'rejected' then
    new.previous_uploads := old.previous_uploads || jsonb_build_array(
      jsonb_build_object(
        'fileUrl', old.file_url,
        'rejectionReason', old.rejection_reason,
        'uploadedAt', old.uploaded_at,
        'replacedAt', now()
      )
    );
    new.uploaded_at := now();
  end if;
  return new;
end;
$$;


-- Extend the existing cancellation guard without changing staff workflow rules.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.guard_request_workflow()'::regprocedure) into definition;
  if position('(old.form_data->>''record_type'') is distinct from ''birth''' in definition) = 0 then
    raise exception 'Expected CTC cancellation guard was not found';
  end if;
  definition := replace(definition,
    '(old.form_data->>''record_type'') is distinct from ''birth''',
    'coalesce(old.form_data->>''record_type'', '''') not in (''birth'', ''marriage'', ''death'')');
  definition := replace(definition, 'Only a submitted CTC birth request can be cancelled',
    'Only a submitted CTC birth, marriage or death request can be cancelled');
  execute definition;
end $$;

create or replace function public.cancel_own_ctc_birth_request(p_request_id uuid, p_applicant_id uuid)
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
    and form_data->>'record_type' in ('birth', 'marriage', 'death')
  returning id into cancelled_id;

  if cancelled_id is null then return false; end if;
  insert into public.application_logs(request_id, performed_by_profile_id, action_status, remarks)
  values (cancelled_id, p_applicant_id, 'cancelled', 'Applicant cancelled this request before staff started checking.');
  return true;
end;
$$;
revoke all on function public.cancel_own_ctc_birth_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_own_ctc_birth_request(uuid, uuid) to service_role;
