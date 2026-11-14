-- Place birth date and place after the owner's name, before parent details.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  birth_fields jsonb;
  new_fields jsonb;
  new_sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'elec_endorsement'
  for update of t;
  if not found then raise exception 'Electronic endorsement template not found'; end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    if section->>'key' = 'details' then
      select jsonb_agg(f order by case f->>'key' when 'event_date' then 1 else 2 end)
      into birth_fields
      from jsonb_array_elements(section->'fields') f
      where f->>'key' in ('event_date', 'event_place');
      if jsonb_array_length(birth_fields) is distinct from 2 then
        raise exception 'Birth date and place fields not found';
      end if;
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('event_date', 'event_place') then continue; end if;
        new_fields := new_fields || jsonb_build_array(field);
        if field->>'key' = 'subjects' then new_fields := new_fields || birth_fields; end if;
      end loop;
      section := jsonb_set(section, '{fields}', new_fields);
    end if;
    new_sections := new_sections || jsonb_build_array(section);
  end loop;
  next_definition := jsonb_set(target.definition, '{sections}', new_sections);
  if next_definition = target.definition then return; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end;
$$;
