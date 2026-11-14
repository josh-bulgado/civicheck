-- Reuse CTC's wife maiden name and late-registration fields for Other Certificates.
do $$
declare
  template_row record;
  source_fields jsonb;
  wife jsonb;
  late jsonb;
  late_when jsonb;
  section jsonb;
  field jsonb;
  fields jsonb;
  sections jsonb;
  definition jsonb;
  published_id uuid;
  next_version integer;
begin
  select v.definition into source_fields
  from public.service_form_templates b
  join public.form_templates t on t.id=b.template_id
  join public.form_template_versions v on v.id=t.active_version_id
  where b.service_code='CTC-LOCAL';
  select f into wife from jsonb_array_elements(source_fields->'sections') s,
    jsonb_array_elements(s->'fields') f where f->>'key'='wife_maiden_name';
  select f - 'visibleWhen' into late from jsonb_array_elements(source_fields->'sections') s,
    jsonb_array_elements(s->'fields') f where f->>'key'='registered_late';
  select f into late_when from jsonb_array_elements(source_fields->'sections') s,
    jsonb_array_elements(s->'fields') f where f->>'key'='registered_late_when';
  if wife is null or late is null or late_when is null then
    raise exception 'Missing CTC reference fields';
  end if;

  for template_row in
    select distinct t.id,v.definition from public.service_form_templates b
    join public.form_templates t on t.id=b.template_id
    join public.form_template_versions v on v.id=t.active_version_id
    where b.service_code='OTHER_CERT'
  loop
    sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
      fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('wife_maiden_name','registered_late','registered_late_when') then continue; end if;
        if section->>'step'='details' and field->>'key'='subjects' then
          field := field || '{"labelByAnswer":{"field":"record_type","labels":{"marriage":"Name of husband"}}}'::jsonb;
          fields := fields || jsonb_build_array(field,wife);
        else
          if section->>'step'='details' and field->>'key'='contact_number' then
            fields := fields || jsonb_build_array(late,late_when);
          end if;
          fields := fields || jsonb_build_array(field);
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
