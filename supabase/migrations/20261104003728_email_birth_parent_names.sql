-- Optional parent names help staff find birth records for email inquiries.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  next_sections jsonb := '[]'::jsonb;
  next_fields jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  join public.service_form_templates b on b.template_id = t.id
  where b.service_code = 'EMAIL_INQUIRY'
  for update of t;
  if not found then raise exception 'Email inquiry template not found'; end if;

  if exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'mother_maiden_name'
  ) then return; end if;

  if not exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where s->>'step' = 'details' and f->>'type' = 'person_group'
  ) then raise exception 'Email owner section not found'; end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    next_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      next_fields := next_fields || jsonb_build_array(field);
      if section->>'step' = 'details' and field->>'type' = 'person_group' then
        next_fields := next_fields || '[
          {"key":"mother_maiden_name","type":"text","label":"Mother''s full maiden name","required":false,
           "visibleWhen":{"field":"record_type","operator":"equals","value":"birth"}},
          {"key":"father_name","type":"text","label":"Father''s full name","required":false,
           "visibleWhen":{"field":"record_type","operator":"equals","value":"birth"}}
        ]'::jsonb;
      end if;
    end loop;
    next_sections := next_sections || jsonb_build_array(jsonb_set(section, '{fields}', next_fields));
  end loop;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published',
    jsonb_set(target.definition, '{sections}', next_sections), now())
  returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now()
  where id = target.id;
end
$$;
