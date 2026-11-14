-- Optional record identification for Supplemental Report birth certificates.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  fields jsonb;
  sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  father_field constant jsonb := '{"key":"father_name","type":"text","label":"Father''s Full Name","required":false,"visibleWhen":{"field":"record_type","operator":"equals","value":"birth"}}';
begin
  select t.id, v.definition into strict template_row
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  join public.service_form_templates b on b.template_id=t.id
  where b.service_code='SUPPLEMENTAL_REPORT';
  if exists (
    select 1 from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f where f->>'key'='father_name'
  ) then return; end if;
  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      fields := fields || jsonb_build_array(field);
      if section->>'step'='details' and field->>'key'='mother_last_name' then
        fields := fields || jsonb_build_array(father_field);
      end if;
    end loop;
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  next_definition := jsonb_set(template_row.definition,'{sections}',sections);
  if next_definition = template_row.definition then raise exception 'Mother information was not found'; end if;
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=template_row.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(template_row.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now()
  where id=template_row.id;
end $$;
