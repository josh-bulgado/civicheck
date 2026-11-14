-- Reuse the late-registration questions for all three endorsement record types.
do $$
declare
  target record;
  section jsonb;
  new_sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  late_fields constant jsonb := '[
    {"key":"registered_late","type":"select","label":"Registered late?","required":true,
      "options":[{"label":"No","value":"no"},{"label":"Yes","value":"yes"}]},
    {"key":"registered_late_when","type":"date","label":"If yes, when was it registered?","required":true,
      "visibleWhen":{"field":"registered_late","operator":"equals","value":"yes"},
      "allowEstimate":true,"dateDirection":"past"}
  ]'::jsonb;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'elec_endorsement'
  for update of t;
  if not found then raise exception 'Electronic endorsement template not found'; end if;

  if exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f where f->>'key' = 'registered_late'
  ) then return; end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    if section->>'key' = 'details' then
      section := jsonb_set(section, '{fields}', (section->'fields') || late_fields);
    end if;
    new_sections := new_sections || jsonb_build_array(section);
  end loop;
  next_definition := jsonb_set(target.definition, '{sections}', new_sections);
  if next_definition = target.definition then raise exception 'Owner details section not found'; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end;
$$;
