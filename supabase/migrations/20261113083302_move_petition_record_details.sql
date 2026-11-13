-- Keep petition questions on the first page and record identification beside
-- the person's name on the next page. Reuse the same saved answer keys.
do $$
declare
  current_template record;
  section jsonb;
  fields jsonb;
  record_fields jsonb;
  sections jsonb := '[]';
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into current_template from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='ra9048_10172';
  if not found then raise exception 'Petition template not found'; end if;
  if not exists (select 1 from jsonb_array_elements(current_template.definition->'sections') s where s->>'step'='details') then
    raise exception 'Petition details step not found';
  end if;
  select jsonb_agg(f.value - 'helpText' order by f.ordinality) into record_fields
  from jsonb_array_elements(current_template.definition->'sections') s
  cross join lateral jsonb_array_elements(s->'fields') with ordinality f(value,ordinality)
  where s->>'step'='case' and f.value->>'key' in ('event_date','event_place');
  if record_fields is null then return; end if;

  for section in select value from jsonb_array_elements(current_template.definition->'sections') loop
    fields := section->'fields';
    if section->>'step' in ('case','details') then
      select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into fields
      from jsonb_array_elements(fields) with ordinality
      where value->>'key' not in ('event_date','event_place');
    end if;
    if section->>'step'='details' then
      fields := fields || record_fields;
      select jsonb_agg(value order by coalesce((value->>'required')::boolean,false) desc,ordinality)
      into fields from jsonb_array_elements(fields) with ordinality;
      section := jsonb_set(section,'{title}','"Person and record details"'::jsonb);
    end if;
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  next_definition := jsonb_set(current_template.definition,'{sections}',sections);
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=current_template.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
    values(current_template.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=current_template.id;
end $$;
