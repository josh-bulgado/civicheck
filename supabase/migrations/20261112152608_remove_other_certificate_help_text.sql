-- Remove the date and registry number guidance from new Other Certificates forms.
do $$
declare
  template_row record;
  sections jsonb;
  definition jsonb;
  published_id uuid;
  next_version integer;
begin
  for template_row in
    select distinct t.id, v.definition
    from public.form_templates t
    join public.form_template_versions v on v.id = t.active_version_id
    join public.service_form_templates b on b.template_id = t.id
    where b.service_code = 'OTHER_CERT'
  loop
    select jsonb_agg(
      jsonb_set(section, '{fields}', (
        select jsonb_agg(
          case when field->>'key' in ('event_date', 'reference_number')
            then field - 'helpText' else field end
          order by field_position
        )
        from jsonb_array_elements(section->'fields') with ordinality as fields(field, field_position)
      )) order by section_position
    ) into sections
    from jsonb_array_elements(template_row.definition->'sections') with ordinality as items(section, section_position);

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
