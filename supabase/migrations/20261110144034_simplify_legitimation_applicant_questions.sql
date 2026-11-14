-- Publish simpler Legitimation questions; existing requests retain their version.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select template.id, version.definition
  into strict template_row
  from public.form_templates template
  join public.form_template_versions version on version.id = template.active_version_id
  join public.service_form_templates binding on binding.template_id = template.id
  where binding.service_code = 'LEGITIMATION';

  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    new_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' in ('filer_relationship', 'free_to_marry') then
        continue;
      end if;
      if field->>'key' = 'marriage_place' then
        field := field || jsonb_build_object('required', false);
      end if;
      new_fields := new_fields || jsonb_build_array(field);
    end loop;
    section := jsonb_set(section, '{fields}', new_fields, true);
    new_sections := new_sections || jsonb_build_array(section);
  end loop;

  next_definition := jsonb_set(template_row.definition, '{sections}', new_sections, true);
  if next_definition = template_row.definition then return; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = template_row.id;

  insert into public.form_template_versions (template_id, version, status, definition, published_at)
  values (template_row.id, next_version, 'published', next_definition, now())
  returning id into published_id;

  update public.form_templates
  set active_version_id = published_id, updated_at = now()
  where id = template_row.id;
end
$$;
