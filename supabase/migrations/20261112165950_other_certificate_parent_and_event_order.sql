-- Keep the record owner's date and place before parent names.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  mother_fields jsonb;
  father_field jsonb := '{"key":"father_name","type":"text","label":"Father''s Full Name","required":false,"visibleWhen":{"field":"record_type","operator":"equals","value":"birth"}}'::jsonb;
  fields jsonb;
  sections jsonb;
  definition jsonb;
  published_id uuid;
  next_version integer;
begin
  for template_row in
    select distinct t.id,v.definition from public.service_form_templates b
    join public.form_templates t on t.id=b.template_id
    join public.form_template_versions v on v.id=t.active_version_id
    where b.service_code='OTHER_CERT'
  loop
    select jsonb_agg(f order by case f->>'key' when 'mother_first_name' then 1 when 'mother_middle_name' then 2 else 3 end)
    into mother_fields from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' in ('mother_first_name','mother_middle_name','mother_last_name');
    if jsonb_array_length(mother_fields) is distinct from 3 then raise exception 'Missing mother name fields'; end if;
    sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
      fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('mother_first_name','mother_middle_name','mother_last_name','father_name') then continue; end if;
        fields := fields || jsonb_build_array(field);
        if section->>'step'='details' and field->>'key'='event_place' then
          fields := fields || mother_fields || jsonb_build_array(father_field);
        end if;
      end loop;
      sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
    end loop;
    definition := jsonb_set(template_row.definition,'{sections}',sections);
    if definition=template_row.definition then continue; end if;
    select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=template_row.id;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
    values(template_row.id,next_version,'published',definition,now()) returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=template_row.id;
  end loop;
end
$$;
