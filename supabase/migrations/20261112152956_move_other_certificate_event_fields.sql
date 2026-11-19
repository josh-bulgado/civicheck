-- Put record dates and places in the details step, before contact number.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  event_fields jsonb;
  sections jsonb;
  fields jsonb;
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
    event_fields := '[]'::jsonb;
    for field in
      select f from jsonb_array_elements(template_row.definition->'sections') s,
        jsonb_array_elements(s->'fields') f
      where f->>'key' in ('event_date', 'event_place')
      order by case f->>'key' when 'event_date' then 0 else 1 end
    loop
      field := field || jsonb_build_object('labelByAnswer', jsonb_build_object(
        'field', 'record_type',
        'labels', case field->>'key'
          when 'event_date' then '{"birth":"Date of Birth","death":"Date of Death","marriage":"Date of Marriage"}'::jsonb
          else '{"birth":"Place of Birth","death":"Place of Death","marriage":"Place of Marriage"}'::jsonb end
      ));
      event_fields := event_fields || jsonb_build_array(field);
    end loop;

    sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
      fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('event_date', 'event_place') then
          continue;
        end if;
        if section->>'step' = 'details' and field->>'key' = 'contact_number' then
          fields := fields || event_fields;
        end if;
        fields := fields || jsonb_build_array(field);
      end loop;
      sections := sections || jsonb_build_array(jsonb_set(section, '{fields}', fields));
    end loop;
    definition := jsonb_set(template_row.definition, '{sections}', sections);
    if definition = template_row.definition then continue; end if;

    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = template_row.id;
    insert into public.form_template_versions (template_id, version, status, definition, published_at)
    values (template_row.id, next_version, 'published', definition, now()) returning id into published_id;
    update public.form_templates set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end loop;
end
$$;
