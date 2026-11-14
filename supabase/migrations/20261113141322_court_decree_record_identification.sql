-- Supporting archive-search details, not new documentary requirements.
-- Existing requests keep their original published form version.
do $$
declare
  template_row record;
  section jsonb;
  fields jsonb;
  sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  selector jsonb;
  next_version integer;
  published_id uuid;
  record_fields constant jsonb := $fields$
  [
    {"key":"birth_date","type":"date","label":"Date of birth","required":true,"dateDirection":"past"},
    {"key":"birth_place","type":"text","label":"Place of birth","required":true,"placeholder":"Enter the place shown on the birth record"},
    {"key":"marriage_date","type":"date","label":"Date of marriage","required":true,"dateDirection":"past"},
    {"key":"marriage_place","type":"text","label":"Place of marriage","required":true,"placeholder":"Enter the place shown on the marriage record"},
    {"key":"reference_number","type":"text","label":"Registry number","required":false,"helpText":"Use the birth or marriage registry number, if known."}
  ]
  $fields$::jsonb;
begin
  select t.id,v.definition into strict template_row
  from public.form_templates t join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='court_decree';
  if exists (
    select 1 from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f where f->>'key'='birth_date'
  ) then return; end if;

  selector := template_row.definition->'caseSelector';
  selector := jsonb_set(selector,'{questions}',(selector->'questions') || $question$
  [{"key":"record_type","label":"Which record is affected?",
    "visibleWhen":{"match":"all","conditions":[{"field":"court_decree_type","operator":"equals","value":"foreign_decree"}]},
    "options":[{"value":"birth","label":"Birth record"},{"value":"marriage","label":"Marriage record"}]}]
  $question$::jsonb);

  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    if section->>'step'='details' then
      fields := '[]'::jsonb;
      for next_definition in select value from jsonb_array_elements(section->'fields') loop
        fields := fields || jsonb_build_array(next_definition);
        if next_definition->>'type'='person_group' then fields := fields || record_fields; end if;
      end loop;
      section := jsonb_set(section,'{fields}',fields);
    end if;
    sections := sections || jsonb_build_array(section);
  end loop;
  next_definition := jsonb_set(jsonb_set(template_row.definition,'{sections}',sections),'{caseSelector}',selector);
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=template_row.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(template_row.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=template_row.id;
end $$;
