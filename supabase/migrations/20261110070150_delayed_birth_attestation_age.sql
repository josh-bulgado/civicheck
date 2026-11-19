-- The charter limits the mother/guardian sworn attestation to ages 7-17.
do $$
declare target record; next_definition jsonb; published_id uuid;
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='birth_delayed' for update of t;
  if not found then raise exception 'Delayed birth form not found'; end if;
  next_definition := jsonb_set(target.definition,'{derivedAnswers}',
    (select coalesce(jsonb_agg(a order by n),'[]'::jsonb)
     from jsonb_array_elements(coalesce(target.definition->'derivedAnswers','[]'::jsonb)) with ordinality x(a,n)
     where a->>'key'<>'attestation_age') || '[
      {"key":"attestation_age","kind":"age_band","dateField":"event_date","label":"Age for sworn attestation","required":true,
       "bands":[{"value":"under7","label":"Under 7","minAge":0,"maxAge":6},
                {"value":"7-17","label":"7-17","minAge":7,"maxAge":17},
                {"value":"18plus","label":"18 and above","minAge":18}]}
    ]'::jsonb);
  if next_definition is distinct from target.definition then
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
    select target.id,coalesce(max(version),0)+1,'published',next_definition,now()
    from public.form_template_versions where template_id=target.id returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
  end if;
end $$;

update public.service_requirements_metadata
set requirement_name='Acknowledgement / Admission of Paternity + Affidavit to Use Surname of Father - with IDs of parents and child (for Non-Marital Child)'
where requirement_group='birth_delayed' and case_tag='non_marital_only'
  and requirement_name like 'Acknowledgement / Admission of Paternity%';

do $$
declare attestation_id uuid;
begin
  select id into attestation_id from public.service_requirements_metadata
  where requirement_group='birth_delayed' and requirement_name like 'Sworn Attestation of mother/guardian%' limit 1;
  if attestation_id is null then
    insert into public.service_requirements_metadata(requirement_group,requirement_name)
    values('birth_delayed','Sworn Attestation of mother/guardian (ages 7-17) - with IDs of parents and child')
    returning id into attestation_id;
  end if;
  update public.service_requirements_metadata
  set requirement_name='Sworn Attestation of mother/guardian (ages 7-17) - with IDs of parents and child',
      is_mandatory=true,requires_upload=true,case_tag='non_marital_only',
      where_to_secure='Local Civil Registrar Office / Philippine Statistics Authority',sort_order=11,
      applies_when='{"match":"all","conditions":[
        {"field":"marital","operator":"equals","value":"non-marital"},
        {"field":"attestation_age","operator":"equals","value":"7-17"}]}'::jsonb
  where id=attestation_id;
end $$;
