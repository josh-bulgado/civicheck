-- One primary petition determines the online checklist. Other corrections
-- are recorded separately for staff review, not accepted as a combined filing.
do $$
declare
  current_template record;
  section jsonb;
  sections jsonb := '[]';
  fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into current_template
  from public.form_templates t join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='ra9048_10172';
  if not found then raise exception 'Petition template not found'; end if;
  if exists (select 1 from jsonb_array_elements(current_template.definition->'sections') s,
    jsonb_array_elements(s->'fields') f where f->>'key'='primary_petition') then return; end if;

  for section in select value from jsonb_array_elements(current_template.definition->'sections') loop
    fields := section->'fields';
    if section->>'step'='case' then
      fields := fields || $json$[
        {"key":"primary_petition","type":"select","label":"Primary petition","required":true,
          "options":[
            {"value":"change_first_name","label":"Change of first name"},
            {"value":"correct_other","label":"Clerical or typographical error"},
            {"value":"correct_sex","label":"Sex recorded on the birth certificate"},
            {"value":"correct_birth_day_month","label":"Birth day or month"}
          ]},
        {"key":"has_additional_corrections","type":"select","label":"Additional corrections reported for staff review","required":false,
          "options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]},
        {"key":"additional_corrections_for_review","type":"text","label":"Additional corrections for staff review","required":false,
          "helpText":"Staff will determine whether these corrections can be processed together or require separate petitions.",
          "visibleWhen":{"field":"has_additional_corrections","operator":"equals","value":"yes"}}
      ]$json$::jsonb;
    end if;
    select jsonb_agg(f.value order by coalesce((f.value->>'required')::boolean,false) desc, f.ordinality)
    into fields from jsonb_array_elements(fields) with ordinality f(value,ordinality);
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  next_definition := jsonb_set(current_template.definition,'{sections}',sections);
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=current_template.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
    values(current_template.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=current_template.id;
end $$;
