-- Reuse the marriage-record wife's maiden-name fields for Supplemental Report.
do $$
declare
  template_row record;
  wife_fields jsonb;
  section jsonb;
  field jsonb;
  fields jsonb;
  sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into strict template_row
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  join public.service_form_templates b on b.template_id=t.id
  where b.service_code='SUPPLEMENTAL_REPORT';
  select jsonb_agg(f order by case f->>'key' when 'wife_first_name' then 1 when 'wife_middle_name' then 2 else 3 end)
  into wife_fields
  from public.service_form_templates b
  join public.form_templates t on t.id=b.template_id
  join public.form_template_versions v on v.id=t.active_version_id,
       jsonb_array_elements(v.definition->'sections') s,
       jsonb_array_elements(s->'fields') f
  where b.service_code='RA9048-CCE' and f->>'key' in ('wife_first_name','wife_middle_name','wife_last_name');
  if jsonb_array_length(wife_fields) is distinct from 3 then raise exception 'Marriage name fields are missing'; end if;
  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' in ('wife_first_name','wife_middle_name','wife_last_name') then continue; end if;
      fields := fields || jsonb_build_array(field);
      if section->>'step'='details' and field->>'type'='person_group' then
        fields := fields || wife_fields;
      end if;
    end loop;
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  next_definition := jsonb_set(template_row.definition,'{sections}',sections);
  if next_definition = template_row.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=template_row.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(template_row.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now()
  where id=template_row.id;
end $$;
