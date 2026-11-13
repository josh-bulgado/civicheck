-- The name group on page 2 already records the current first name.
-- Use the primary petition for its heading so a stale record type cannot
-- label a first-name petition as a deceased person's record.
do $$
declare
  current_template record;
  section jsonb;
  field jsonb;
  fields jsonb;
  sections jsonb := '[]';
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into current_template from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='ra9048_10172';
  if not found then raise exception 'Petition template not found'; end if;
  for section in select value from jsonb_array_elements(current_template.definition->'sections') loop
    fields := '[]';
    for field in select value from jsonb_array_elements(section->'fields') loop
      if section->>'step'='case' and field->>'key'='current_first_name' then continue; end if;
      if field->>'key'='subjects' then
        field := jsonb_set(field,'{labelByAnswer}', $json${
          "field":"primary_petition",
          "labels":{
            "change_first_name":"Person named on the birth certificate",
            "correct_sex":"Person named on the birth certificate",
            "correct_birth_day_month":"Person named on the birth certificate",
            "correct_other":"Person named on the record"
          }
        }$json$::jsonb);
      end if;
      fields := fields || jsonb_build_array(field);
    end loop;
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  next_definition := jsonb_set(current_template.definition,'{sections}',sections);
  if next_definition is distinct from current_template.definition then
    select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=current_template.id;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
      values(current_template.id,next_version,'published',next_definition,now()) returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=current_template.id;
  end if;
end $$;
