-- Keep document configuration; remove agency-action controls added in this chat.
drop trigger if exists guard_delayed_birth_progress on public.requests;
drop function if exists public.guard_delayed_birth_progress();

do $$
declare d text;
begin
  select pg_get_functiondef('public.guard_request_workflow()'::regprocedure) into d;
  d := replace(d,
    'or not (old.status = ''ready_for_release'' or (old.status = ''processing'' and (old.request_type like ''DCOLB-%'' or old.request_type = ''BIRTH_DELAYED''))) then',
    'or old.status is distinct from ''ready_for_release'' then');
  d := replace(d,'Only the cashier verifies payment, once, when the request is ready for payment',
    'Only the cashier verifies payment, once, on a request ready for release');
  execute d;
  if exists (select 1 from public.requests where psa_confirmation_date is not null) then
    raise exception 'PSA dates contain data; preserve them before removing the unused column';
  end if;
end $$;
alter table public.requests drop column psa_confirmation_date;

-- Restore the prior service descriptions, retaining the corrected P500 fee.
update public.services_registry set steps_description=case
  when service_code='DCOLB-0079-NORMAL-MARITAL' then
    array['Submit documents','Pay service fee','Claim after 10-day posting']
  when service_code='DCOLB-0079-NORMAL-NONMARITAL' then
    array['Submit documents','Pay service fee (500 + 100 Admission + 200 AUSF)','Claim after 10-day posting']
  when service_code='DCOLB-0079-BRAP' then
    array['Submit documents','Free service under BRAP','Claim after 10-day posting']
  when service_code='DCOLB-80UP-BRAP' then
    array['Submit documents','Free service under BRAP','Claim after 10-day posting (upon PSA confirmation)']
  else array[
    'Submit documents; CCRO verifies correctness and completeness, prepares for filing and posting of notice. Documents forwarded to PSA via email for evaluation.',
    'Pay service fee of P500.00 at the cashier and receive Official Receipt.',
    'Claim the registered COLB after compliance of ten (10) days notice of posting, upon PSA confirmation.'
  ] end
where display_group='birth_delayed';

-- Retain the requested question and placement without adding an agency task.
do $$
declare t record; d jsonb; next_id uuid;
begin
  select f.id,v.definition into t from public.form_templates f
  join public.form_template_versions v on v.id=f.active_version_id
  where f.template_key='birth_delayed';
  select jsonb_set(t.definition,'{sections}',jsonb_agg(
    jsonb_set(s,'{fields}',(
      select jsonb_agg(case when f->>'key'='out_of_town'
        then jsonb_set(f,'{helpText}',to_jsonb('Choose whether the person was born in Legazpi City or another city/municipality.'::text))
        else f end order by m)
      from jsonb_array_elements(s->'fields') with ordinality y(f,m)
    )) order by n)) into d
  from jsonb_array_elements(t.definition->'sections') with ordinality x(s,n);
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  select t.id,coalesce(max(version),0)+1,'published',d,now()
  from public.form_template_versions where template_id=t.id returning id into next_id;
  update public.form_templates set active_version_id=next_id,updated_at=now() where id=t.id;
end $$;
