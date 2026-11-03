-- Publish a new delayed-marriage version; existing submitted forms stay intact.
do $$
declare
  target record;
  next_definition jsonb;
  basis_field jsonb;
  published_id uuid;
  next_version integer;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'marriage_delayed';
  if not found then raise exception 'Delayed marriage template not found'; end if;

  select field || jsonb_build_object(
    'visibleWhen', jsonb_build_object('field','registration_type','operator','equals','value','delayed'),
    'helpText', 'With a marriage license, registration is on time within 15 days. Under Article 34 or P.D. 1083, the period is 30 days.'
  ) into basis_field
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id,
    jsonb_array_elements(v.definition->'sections') section,
    jsonb_array_elements(section->'fields') field
  where t.template_key = 'marriage_ontime' and field->>'key' = 'marriage_license_basis';
  if basis_field is null then raise exception 'Marriage license basis question not found'; end if;

  select jsonb_set(target.definition, '{sections}', jsonb_agg(
    case when section->>'step' = 'case' then jsonb_set(section, '{fields}', (
      select jsonb_agg(item.field order by item.sort_key) from (
        select f.field, f.ord::numeric as sort_key
        from jsonb_array_elements(section->'fields') with ordinality f(field,ord)
        where f.field->>'key' <> 'marriage_license_basis'
        union all
        select basis_field, f.ord::numeric + 0.5
        from jsonb_array_elements(section->'fields') with ordinality f(field,ord)
        where f.field->>'key' = 'registration_type'
      ) item
    )) else section end order by section_ord
  )) into next_definition
  from jsonb_array_elements(target.definition->'sections') with ordinality s(section,section_ord);

  next_definition := jsonb_set(next_definition, '{eventTiming}',
    (next_definition->'eventTiming') || jsonb_build_object(
      'windowDays', 15,
      'windowDaysByAnswer', jsonb_build_object('field','marriage_license_basis','values',
        jsonb_build_object('with_license',15,'article_34',30,'pd_1083',30)),
      'appliesWhen', jsonb_build_object('field','registration_type','operator','equals','value','delayed'),
      'title', 'This marriage is still within the on-time registration period',
      'description', 'With a marriage license, the on-time period is 15 days. Under Article 34 or P.D. 1083, it is 30 days. Use On-Time Registration while the marriage is within its applicable period.'
    ));

  if next_definition = target.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id, updated_at=now() where id=target.id;
end;
$$;
