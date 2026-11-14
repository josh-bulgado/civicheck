-- Limit new certificate requests to birth, death and marriage records.
-- Publish new versions so existing requests keep their original forms.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  sections jsonb;
  fields jsonb;
  options jsonb;
  definition jsonb;
  published_id uuid;
  next_version integer;
begin
  for template_row in
    select distinct t.id, v.definition
    from public.form_templates t
    join public.form_template_versions v on v.id = t.active_version_id
    join public.service_form_templates b on b.template_id = t.id
    where b.service_code in ('CTC_ISSUANCE', 'CTC-LOCAL', 'CTC-ABROAD', 'OTHER_CERT')
  loop
    sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
      fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' = 'certification_requested'
          or field->>'key' in ('record_type_other', 'record_date', 'record_place') then
          continue;
        end if;

        if field->>'key' = 'record_type' then
          select coalesce(jsonb_agg(option order by position), '[]'::jsonb)
          into options
          from jsonb_array_elements(field->'options') with ordinality as choices(option, position)
          where option->>'value' <> 'other';
          field := jsonb_set(field, '{options}', options);
        end if;

        fields := fields || jsonb_build_array(field);
      end loop;
      sections := sections || jsonb_build_array(jsonb_set(section, '{fields}', fields));
    end loop;

    definition := jsonb_set(template_row.definition, '{sections}', sections);
    if definition = template_row.definition then
      continue;
    end if;

    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = template_row.id;

    insert into public.form_template_versions (template_id, version, status, definition, published_at)
    values (template_row.id, next_version, 'published', definition, now())
    returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end loop;
end
$$;
