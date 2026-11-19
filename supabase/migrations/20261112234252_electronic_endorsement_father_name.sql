-- Use the same optional birth-record field as Other Certificates.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  new_fields jsonb;
  new_sections jsonb := '[]'::jsonb;
  inserted boolean := false;
  next_version integer;
  published_id uuid;
  father_field constant jsonb := '{"key":"father_name","type":"text","label":"Father''s Full Name","required":false,"visibleWhen":{"field":"record_type","value":"birth","operator":"equals"}}'::jsonb;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'elec_endorsement'
  for update of t;
  if not found then raise exception 'Electronic endorsement template not found'; end if;

  if exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f where f->>'key' = 'father_name'
  ) then return; end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    if section->>'key' = 'details' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        new_fields := new_fields || jsonb_build_array(field);
        if field->>'key' = 'mother_last_name' then
          new_fields := new_fields || jsonb_build_array(father_field);
          inserted := true;
        end if;
      end loop;
      section := jsonb_set(section, '{fields}', new_fields);
    end if;
    new_sections := new_sections || jsonb_build_array(section);
  end loop;
  if not inserted then raise exception 'Mother name fields not found'; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', jsonb_set(target.definition, '{sections}', new_sections), now())
  returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end;
$$;
