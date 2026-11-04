-- Citizen's Charter 2025, printed pages 3-5.
-- Keep the existing service codes and submitted request fees.
update public.services_registry
set fee = 500, fee_components = '[]'::jsonb,
    steps_description[2] = 'Pay the P500.00 service fee at the cashier and receive the Official Receipt and claim stub.'
where service_code = 'DCOLB-80UP-NORMAL-NONMARITAL';

update public.service_requirements_metadata set is_mandatory = true
where requirement_group = 'birth_delayed' and case_tag = 'foreigner_only';

-- The general affidavit already covers BRAP. Extra identity proof is conditional.
update public.service_requirements_metadata
set requirement_name = 'Any additional proof of identity, such as Barangay certification or Driver''s License — 1 photocopy (BRAP, if applicable)',
    applies_when = '{"match":"all","conditions":[{"field":"program","operator":"equals","value":"brap"},{"field":"additional_identity","operator":"equals","value":"yes"}]}'::jsonb
where requirement_group = 'birth_delayed' and sort_order = 15;

update public.service_requirements_metadata
set requirement_name = 'Acknowledgement / Admission of Paternity + Affidavit to Use Surname of Father — with 1 photocopy of IDs of parents and child (for Non-Marital Child)'
where requirement_group = 'birth_delayed' and case_tag = 'non_marital_only';

insert into public.service_requirements_metadata
(requirement_group, requirement_name, is_mandatory, requires_upload, upload_scope, sort_order, where_to_secure, applies_when)
select 'birth_delayed', 'Sworn Attestation of mother/guardian — for a non-marital child aged 7–17',
true, true, 'request', 16, 'Local Civil Registrar',
'{"match":"all","conditions":[{"field":"marital","operator":"equals","value":"non-marital"},{"field":"attestation_age","operator":"equals","value":"7-17"}]}'::jsonb
where not exists (select 1 from public.service_requirements_metadata
where requirement_group='birth_delayed' and requirement_name like 'Sworn Attestation of mother/guardian%');

do $$
declare
  t record;
  d jsonb;
  next_id uuid;
begin
  select f.id, v.definition into t from public.form_templates f
  join public.form_template_versions v on v.id=f.active_version_id
  where f.template_key='birth_delayed';
  d := t.definition;
  select jsonb_set(d, '{caseSelector,questions}',
    jsonb_agg(case when q->>'key'='marital' then q - 'visibleWhen' else q end order by n))
    into d from jsonb_array_elements(d#>'{caseSelector,questions}') with ordinality x(q,n);
  -- Keep out-of-town as a case answer: the receiving LCR still registers the birth.
  select jsonb_set(d, '{sections}', jsonb_agg(
    case when s->>'step'='case' then jsonb_set(s,'{fields}',(s->'fields') || '[
      {"key":"out_of_town","type":"select","label":"Was the person born outside Legazpi City?","required":true,
       "helpText":"For an out-of-town birth, CCRO sends the documents through PSA Regional Office to the civil registrar at the place of birth after PSA confirmation.",
       "options":[{"value":"yes","label":"Yes — out-of-town registration"},{"value":"no","label":"No — born in Legazpi City"}]},
      {"key":"additional_identity","type":"select","label":"Is additional proof of identity applicable to your BRAP application?","required":true,
       "helpText":"Select Yes if additional identity proof is available or requested by CCRO.",
       "visibleWhen":{"field":"program","operator":"equals","value":"brap"},
       "options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]}
    ]'::jsonb) else s end order by n))
    into d from jsonb_array_elements(d->'sections') with ordinality x(s,n);
  d := jsonb_set(d,'{derivedAnswers}',(d->'derivedAnswers') || '[
    {"key":"attestation_age","kind":"age_band","dateField":"event_date","label":"Age for sworn attestation","required":true,
     "bands":[{"value":"under7","label":"Under 7","minAge":0,"maxAge":6},{"value":"7-17","label":"7–17","minAge":7,"maxAge":17},{"value":"18plus","label":"18 and above","minAge":18}]}
  ]'::jsonb);
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  select t.id,coalesce(max(version),0)+1,'published',d,now()
  from public.form_template_versions where template_id=t.id returning id into next_id;
  update public.form_templates set active_version_id=next_id,updated_at=now() where id=t.id;
end $$;

update public.services_registry
set steps_description = array[
  case when service_code like 'DCOLB-80UP-%'
    then 'Submit the requirements for final office validation. CCRO forwards documents to PSA by email for evaluation.'
    else 'Submit the requirements for final office validation. CCRO checks the entries and prepares the notice of posting.' end,
  case when fee=0 then 'Free under BRAP. Receive the claim stub and release schedule.'
    when fee=800 then 'Pay P500.00 service fee + P100.00 Admission of Paternity + P200.00 AUSF. Receive the Official Receipt and claim stub.'
    else 'Pay the P500.00 service fee. Receive the Official Receipt and claim stub.' end,
  case when service_code like 'DCOLB-80UP-%'
    then 'Claim after PSA confirmation and completion of the 10-calendar-day notice of posting.'
    else 'Claim after completion of the 10-calendar-day notice of posting.' end,
  'For out-of-town registration: upon PSA confirmation, CCRO transmits documents through PSA Regional Office to the civil registrar at the place of birth for registration.'
] where display_group='birth_delayed';

alter table public.requests
  add column office_validated boolean not null default false,
  add column psa_confirmation_date date,
  add column psa_reference text,
  add column transmission_date date,
  add column transmission_reference text;

-- Extend the existing payment rule only for delayed birth registration.
do $$
declare d text;
begin
  select pg_get_functiondef('public.guard_request_workflow()'::regprocedure) into d;
  d := replace(d, 'or old.status is distinct from ''ready_for_release'' then',
    'or not (old.status = ''ready_for_release'' or (old.status = ''processing'' and (old.request_type like ''DCOLB-%'' or old.request_type = ''BIRTH_DELAYED''))) then');
  d := replace(d, 'Only the cashier verifies payment, once, on a request ready for release',
    'Only the cashier verifies payment, once, when the request is ready for payment');
  execute d;
end $$;

create or replace function public.guard_delayed_birth_progress()
returns trigger language plpgsql set search_path=public as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  out_of_town boolean;
  needs_psa boolean;
  changed boolean;
begin
  if not (new.request_type like 'DCOLB-%' or new.request_type='BIRTH_DELAYED') then return new; end if;
  changed := tg_op='INSERT';
  if tg_op='UPDATE' then
    changed := row(new.office_validated,new.psa_confirmation_date,new.psa_reference,new.posting_start_date,new.posting_end_date,new.transmission_date,new.transmission_reference)
      is distinct from row(old.office_validated,old.psa_confirmation_date,old.psa_reference,old.posting_start_date,old.posting_end_date,old.transmission_date,old.transmission_reference);
  end if;
  if changed and current_user in ('anon','authenticated') then
    if public.get_user_role() not in ('staff','supervisor','admin') or public.get_user_role() is null then
      if new.office_validated or new.psa_confirmation_date is not null or new.psa_reference is not null
        or new.posting_start_date is not null or new.posting_end_date is not null
        or new.transmission_date is not null or new.transmission_reference is not null then
        raise exception 'Only CCRO staff can record registration progress';
      end if;
      if tg_op='UPDATE' then raise exception 'Only CCRO staff can record registration progress'; end if;
    end if;
  end if;
  if changed and tg_op='UPDATE' then
    if old.status in ('released','rejected') then raise exception 'This request is closed'; end if;
    if new.status not in ('processing','ready_for_release') then raise exception 'Mark requirements complete before recording registration progress'; end if;
  end if;
  out_of_town := coalesce(new.form_data->>'out_of_town','no')='yes';
  if tg_op='UPDATE' and new.payment_status is distinct from old.payment_status and not old.office_validated then
    raise exception 'Complete final office validation before collecting payment';
  end if;
  needs_psa := new.request_type like 'DCOLB-80UP-%' or out_of_town;
  if changed then
    if new.psa_confirmation_date > today or new.transmission_date > today or new.posting_start_date > today then
      raise exception 'Registration progress dates cannot be in the future';
    end if;
    if (new.psa_confirmation_date is null) <> (nullif(trim(new.psa_reference),'') is null) then
      raise exception 'Record both the PSA confirmation date and reference';
    end if;
    if (new.transmission_date is null) <> (nullif(trim(new.transmission_reference),'') is null) then
      raise exception 'Record both the transmission date and reference';
    end if;
    if (new.posting_start_date is not null or new.transmission_date is not null) and not new.office_validated then
      raise exception 'Complete final office validation first';
    end if;
    if needs_psa and (new.posting_start_date is not null or new.transmission_date is not null) then
      if new.psa_confirmation_date is null then raise exception 'Record PSA confirmation first'; end if;
      if coalesce(new.posting_start_date,new.transmission_date) < new.psa_confirmation_date then
        raise exception 'Posting or transmission cannot precede PSA confirmation';
      end if;
    end if;
    if new.transmission_date is not null and not out_of_town then raise exception 'Transmission applies to out-of-town births only'; end if;
    if out_of_town and new.posting_start_date is not null then raise exception 'The receiving civil registrar handles out-of-town registration and posting'; end if;
    new.posting_end_date := new.posting_start_date + 10;
  end if;
  if new.status in ('ready_for_release','released') then
    if not new.office_validated then raise exception 'Complete final office validation first'; end if;
    if new.payment_status is distinct from 'verified' and
      (tg_op='INSERT' or new.status='released' or old.status is distinct from new.status) then
      raise exception 'Verify payment or the BRAP fee exemption before completing registration';
    end if;
    if needs_psa and (new.psa_confirmation_date is null or nullif(trim(new.psa_reference),'') is null) then
      raise exception 'Record PSA confirmation first';
    end if;
    if out_of_town then
      if new.transmission_date is null or nullif(trim(new.transmission_reference),'') is null then
        raise exception 'Record transmission through PSA Regional Office to the concerned civil registrar first';
      end if;
    elsif new.posting_start_date is null or new.posting_end_date is null or today < new.posting_end_date then
      raise exception 'Complete the 10-calendar-day notice of posting first';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_delayed_birth_progress() from public;
create trigger guard_delayed_birth_progress before insert or update on public.requests
for each row execute function public.guard_delayed_birth_progress();
