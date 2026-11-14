-- Move Marriage License birth dates to the person-details step.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  birth_fields jsonb;
  next_fields jsonb;
  next_sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into template_row
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'marriage_license'
  for update of t;
  if not found then raise exception 'Active Marriage License form not found'; end if;

  if not exists (
    select 1 from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where s->>'step' = 'case' and f->>'key' in ('bride_date_of_birth', 'groom_date_of_birth')
  ) then return; end if;

  select jsonb_agg(f order by section_order, field_order) into birth_fields
  from jsonb_array_elements(template_row.definition->'sections') with ordinality as sections(s, section_order),
    jsonb_array_elements(s->'fields') with ordinality as fields(f, field_order)
  where f->>'key' in ('bride_date_of_birth', 'groom_date_of_birth');
  if jsonb_array_length(birth_fields) <> 2 then raise exception 'Expected both birth-date fields'; end if;
  if not exists (
    select 1 from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where s->>'step' = 'details' and f->>'type' = 'person_group'
  ) then raise exception 'Person-details section not found'; end if;

  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    next_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' in ('bride_date_of_birth', 'groom_date_of_birth') then continue; end if;
      next_fields := next_fields || jsonb_build_array(field);
      if section->>'step' = 'details' and field->>'type' = 'person_group' then
        next_fields := next_fields || birth_fields;
      end if;
    end loop;
    next_sections := next_sections || jsonb_build_array(jsonb_set(section, '{fields}', next_fields));
  end loop;

  next_definition := jsonb_set(template_row.definition, '{sections}', next_sections);
  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = template_row.id;
  insert into public.form_template_versions (template_id, version, status, definition, published_at)
  values (template_row.id, next_version, 'published', next_definition, now())
  returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now()
  where id = template_row.id;
end
$$;
