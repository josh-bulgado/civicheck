-- Keep the child's birth fields with their personal information on the details step.
do $$
declare
  template_row record;
  section jsonb;
  birth_fields jsonb;
  sections jsonb := '[]'::jsonb;
  fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into strict template_row
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  join public.service_form_templates b on b.template_id=t.id
  where b.service_code='LEGITIMATION';

  select jsonb_agg(f order by s_ord, f_ord) into birth_fields
  from jsonb_array_elements(template_row.definition->'sections') with ordinality s(item,s_ord),
       jsonb_array_elements(s.item->'fields') with ordinality entries(f,f_ord)
  where s.item->>'step'='case' and f->>'key' in ('event_date','event_place');
  if birth_fields is null then return; end if;

  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    select coalesce(jsonb_agg(f order by ord), '[]'::jsonb) into fields
    from jsonb_array_elements(section->'fields') with ordinality entries(f,ord)
    where not (section->>'step'='case' and f->>'key' in ('event_date','event_place'));
    if section->>'step'='details' and exists (
      select 1 from jsonb_array_elements(fields) f where f->>'type'='person_group'
    ) then
      fields := fields || birth_fields;
    end if;
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  next_definition := jsonb_set(template_row.definition,'{sections}',sections);
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=template_row.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(template_row.id,next_version,'published',next_definition,now())
  returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now()
  where id=template_row.id;
end $$;
