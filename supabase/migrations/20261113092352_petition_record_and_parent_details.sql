-- Reuse the existing parent controls for birth-specific petitions.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  mother_fields jsonb;
  fields jsonb;
  sections jsonb := '[]';
  definition jsonb;
  published_id uuid;
  next_version integer;
  birth_condition jsonb := '{"field":"primary_petition","operator":"not_equals","value":"correct_other"}';
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='ra9048_10172';
  if not found then raise exception 'Petition template not found'; end if;

  select jsonb_agg(jsonb_set(f,'{visibleWhen}',birth_condition) order by
    case f->>'key' when 'mother_first_name' then 1 when 'mother_middle_name' then 2 else 3 end)
  into mother_fields from public.service_form_templates b
  join public.form_templates t on t.id=b.template_id
  join public.form_template_versions v on v.id=t.active_version_id,
    jsonb_array_elements(v.definition->'sections') s, jsonb_array_elements(s->'fields') f
  where b.service_code='CTC-LOCAL'
    and f->>'key' in ('mother_first_name','mother_middle_name','mother_last_name');
  if jsonb_array_length(mother_fields) is distinct from 3 then
    raise exception 'Missing CTC mother maiden-name fields';
  end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    if section->>'step'='details' then
      fields := '[]';
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('mother_first_name','mother_middle_name','mother_last_name','father_name') then continue; end if;
        if field->>'key' in ('event_date','event_place') then
          field := jsonb_set(field,'{labelByAnswer}',jsonb_build_object(
            'field','primary_petition','labels',jsonb_build_object(
              'change_first_name',case when field->>'key'='event_date' then 'Date of Birth' else 'Place of Birth' end,
              'correct_sex',case when field->>'key'='event_date' then 'Date of Birth' else 'Place of Birth' end,
              'correct_birth_day_month',case when field->>'key'='event_date' then 'Date of Birth' else 'Place of Birth' end)));
        end if;
        fields := fields || jsonb_build_array(field);
        if field->>'key'='event_place' then
          fields := fields || mother_fields || jsonb_build_array(jsonb_build_object(
            'key','father_name','type','text','label','Father''s Full Name','required',false,'visibleWhen',birth_condition));
        end if;
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
