-- Keep Supplemental Report record details below the person's main information.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  date_field jsonb;
  place_field jsonb;
  fields jsonb;
  sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  inserted boolean := false;
begin
  select t.id, v.definition into strict template_row
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  join public.service_form_templates b on b.template_id=t.id
  where b.service_code='SUPPLEMENTAL_REPORT';

  select f into strict date_field
  from jsonb_array_elements(template_row.definition->'sections') s,
       jsonb_array_elements(s->'fields') f where f->>'key'='event_date';
  select f into strict place_field
  from jsonb_array_elements(template_row.definition->'sections') s,
       jsonb_array_elements(s->'fields') f where f->>'key'='event_place';
  date_field := (date_field - 'helpText') || jsonb_build_object(
    'label', 'Date of the event',
    'labelByAnswer', jsonb_build_object('field','record_type','labels',jsonb_build_object(
      'birth','Date of birth','death','Date of death','marriage','Date of marriage')));
  place_field := place_field || jsonb_build_object(
    'label', 'Place of the event',
    'labelByAnswer', jsonb_build_object('field','record_type','labels',jsonb_build_object(
      'birth','Place of birth','death','Place of death','marriage','Place of marriage')));

  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' in ('event_date','event_place') then continue; end if;
      if field->>'key'='record_type' then
        field := field || jsonb_build_object('label','Which certificate needs additional information?');
      end if;
      if section->>'step'='details' and field->>'key'='contact_number' and not inserted then
        fields := fields || jsonb_build_array(date_field,place_field);
        inserted := true;
      end if;
      fields := fields || jsonb_build_array(field);
    end loop;
    if section->>'step'='details' and not inserted and exists (
      select 1 from jsonb_array_elements(fields) f where f->>'type'='person_group'
    ) then
      fields := fields || jsonb_build_array(date_field,place_field);
      inserted := true;
    end if;
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  if not inserted then raise exception 'Supplemental Report details section is missing'; end if;
  next_definition := jsonb_set(template_row.definition,'{sections}',sections);
  if next_definition = template_row.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=template_row.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(template_row.id,next_version,'published',next_definition,now())
  returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now()
  where id=template_row.id;
end $$;
