-- Reuse the late-registration controls for birth-specific petitions.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  fields jsonb;
  sections jsonb := '[]';
  definition jsonb;
  next_version integer;
  published_id uuid;
  late_fields constant jsonb := '[
    {"key":"registered_late","type":"select","label":"Registered late?","required":true,
      "options":[{"label":"No","value":"no"},{"label":"Yes","value":"yes"}],
      "visibleWhen":{"field":"primary_petition","operator":"not_equals","value":"correct_other"}},
    {"key":"registered_late_when","type":"date","label":"If yes, when was it registered?","required":true,
      "visibleWhen":{"field":"registered_late","operator":"equals","value":"yes"},
      "allowEstimate":true,"dateDirection":"past"}
  ]';
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='ra9048_10172' for update of t;
  if not found then raise exception 'Petition template not found'; end if;
  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    if section->>'step'='details' then
      fields := '[]';
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('registered_late','registered_late_when') then continue; end if;
        fields := fields || jsonb_build_array(field);
        if field->>'key'='event_place' then fields := fields || late_fields; end if;
      end loop;
      section := jsonb_set(section,'{fields}',fields);
    end if;
    sections := sections || jsonb_build_array(section);
  end loop;
  definition := jsonb_set(target.definition,'{sections}',sections);
  if definition=target.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end $$;
