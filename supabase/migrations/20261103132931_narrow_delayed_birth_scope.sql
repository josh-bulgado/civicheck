-- Remove additions beyond the eight delayed-birth fixes requested.
-- Historical published forms remain unchanged; new applications use this version.
do $$
declare t record; d jsonb; next_id uuid;
begin
  select f.id,v.definition into t from public.form_templates f
  join public.form_template_versions v on v.id=f.active_version_id
  where f.template_key='birth_delayed';
  if not found then raise exception 'Delayed birth form not found'; end if;
  select coalesce(jsonb_agg(a order by n),'[]'::jsonb) into d
  from jsonb_array_elements(t.definition->'derivedAnswers') with ordinality x(a,n)
  where a->>'key'<>'attestation_age';
  d := jsonb_set(t.definition,'{derivedAnswers}',d);
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  select t.id,coalesce(max(version),0)+1,'published',d,now()
  from public.form_template_versions where template_id=t.id returning id into next_id;
  update public.form_templates set active_version_id=next_id,updated_at=now() where id=t.id;
end $$;

update public.service_requirements_metadata
set requirement_name='Acknowledgement / Admission of Paternity + Affidavit to Use Surname of Father + Sworn Attestation of mother/guardian for ages 7-17 - with IDs of parents and child (for Non-Marital Child)'
where requirement_group='birth_delayed' and case_tag='non_marital_only';

-- Preserve any uploaded copies instead of removing their requirement link.
update public.service_requirements_metadata
set is_mandatory=false,requires_upload=false,
    applies_when='{"match":"all","conditions":[{"field":"program","operator":"equals","value":"normal"},{"field":"program","operator":"equals","value":"brap"}]}'::jsonb
where requirement_group='birth_delayed' and requirement_name like 'Sworn Attestation of mother/guardian%';

delete from public.service_requirements_metadata r
where r.requirement_group='birth_delayed' and r.requirement_name like 'Sworn Attestation of mother/guardian%'
  and not exists (select 1 from public.requirements_attachments a where a.requirement_id=r.id);

create or replace function public.guard_delayed_birth_progress()
returns trigger language plpgsql set search_path=public as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  out_of_town boolean := coalesce(new.form_data->>'out_of_town','no')='yes';
  needs_psa boolean;
  changed boolean;
begin
  if not (new.request_type like 'DCOLB-%' or new.request_type='BIRTH_DELAYED') then return new; end if;
  changed := tg_op='INSERT';
  if tg_op='UPDATE' then
    changed := row(new.psa_confirmation_date,new.posting_start_date,new.posting_end_date)
      is distinct from row(old.psa_confirmation_date,old.posting_start_date,old.posting_end_date);
  end if;
  if changed and current_user in ('anon','authenticated') then
    if public.get_user_role() not in ('staff','supervisor','admin') or public.get_user_role() is null then
      if tg_op='UPDATE' or new.psa_confirmation_date is not null or new.posting_start_date is not null or new.posting_end_date is not null then
        raise exception 'Only CCRO staff can record PSA and posting dates';
      end if;
    end if;
  end if;
  needs_psa := new.request_type like 'DCOLB-80UP-%' or out_of_town;
  if changed then
    if tg_op='UPDATE' then
      if old.status in ('released','rejected') then raise exception 'This request is closed'; end if;
      if new.status not in ('processing','ready_for_release') then raise exception 'Mark requirements complete before recording registration dates'; end if;
    end if;
    if new.psa_confirmation_date>today or new.posting_start_date>today then
      raise exception 'Registration dates cannot be in the future';
    end if;
    if needs_psa and new.posting_start_date is not null then
      if new.psa_confirmation_date is null then raise exception 'Record PSA confirmation first'; end if;
      if new.posting_start_date<new.psa_confirmation_date then raise exception 'Posting cannot precede PSA confirmation'; end if;
    end if;
    if out_of_town and new.posting_start_date is not null then
      raise exception 'The receiving civil registrar handles out-of-town posting';
    end if;
    new.posting_end_date := new.posting_start_date+10;
  end if;
  if new.status in ('ready_for_release','released') then
    if new.payment_status is distinct from 'verified' and
      (tg_op='INSERT' or new.status='released' or old.status is distinct from new.status) then
      raise exception 'Verify payment or the BRAP fee exemption before completing registration';
    end if;
    if needs_psa and new.psa_confirmation_date is null then raise exception 'Record PSA confirmation first'; end if;
    if not out_of_town and
      (new.posting_start_date is null or new.posting_end_date is null or today<new.posting_end_date) then
      raise exception 'Complete the 10-calendar-day notice of posting first';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_delayed_birth_progress() from public;

-- These controls were never used. Refuse removal if that changes before applying.
do $$
begin
  if exists (select 1 from public.requests where office_validated or psa_reference is not null
    or transmission_date is not null or transmission_reference is not null) then
    raise exception 'Unused feature fields contain data; preserve them before removing';
  end if;
end $$;
alter table public.requests
  drop column office_validated,
  drop column psa_reference,
  drop column transmission_date,
  drop column transmission_reference;
