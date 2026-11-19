-- Publish the requested labels without changing existing request versions.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  sections jsonb;
  fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  is_legitimation boolean;
begin
  for template_row in
    select t.id, v.definition
    from public.form_templates t
    join public.form_template_versions v on v.id = t.active_version_id
    where exists (select 1 from public.service_form_templates b where b.template_id = t.id)
  loop
    select exists (
      select 1 from public.service_form_templates
      where template_id = template_row.id and service_code = 'LEGITIMATION'
    ) into is_legitimation;
    sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
      fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if lower(field->>'label') = 'place where the child was born or registered' then
          field := field || jsonb_build_object('label', 'Child''s Place of Birth');
        elsif lower(field->>'label') = 'date of the parents'' marriage' then
          field := field || jsonb_build_object('label', 'Parent''s Date of Marriage');
        elsif lower(field->>'label') = 'place of the parents'' marriage' then
          field := field || jsonb_build_object('label', 'Parent''s Place of Marriage');
        end if;
        if field->>'label' ~* 'registry.*\(if known\)' then
          field := field || jsonb_build_object('label',
            regexp_replace(field->>'label', '\s*\(if known\)', '', 'gi'));
        end if;
        if is_legitimation and field->>'key' in ('marriage_date', 'father_on_record') then
          field := field - 'helpText';
        end if;
        if is_legitimation and field->>'key' = 'father_on_record' then
          field := jsonb_set(field, '{options}', (
            select jsonb_agg(option order by ord)
            from jsonb_array_elements(field->'options') with ordinality as options(option, ord)
            where option->>'value' <> 'not_sure'
          ));
        end if;
        fields := fields || jsonb_build_array(field);
      end loop;
      sections := sections || jsonb_build_array(jsonb_set(section, '{fields}', fields));
    end loop;
    next_definition := jsonb_set(template_row.definition, '{sections}', sections);
    if next_definition = template_row.definition then continue; end if;
    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = template_row.id;
    insert into public.form_template_versions (template_id, version, status, definition, published_at)
    values (template_row.id, next_version, 'published', next_definition, now())
    returning id into published_id;
    update public.form_templates set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end loop;
end $$;

update public.services_registry
set event_place_label = 'Child''s Place of Birth'
where lower(event_place_label) = 'place where the child was born or registered';

update public.services_registry
set reference_number_label = regexp_replace(reference_number_label, '\s*\(if known\)', '', 'gi')
where reference_number_label ~* 'registry.*\(if known\)';

update public.service_requirements_metadata
set requirement_name = regexp_replace(requirement_name, '^\[Father''s name is blank\]\s*', '', 'i')
where service_code = 'LEGITIMATION'
  and requirement_name ilike '[Father''s name is blank]%Admission of Paternity%';
