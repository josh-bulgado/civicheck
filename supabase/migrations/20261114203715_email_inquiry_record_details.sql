-- Move Email Inquiry record date and place to the details page.
do $$
declare
  target record;
  record_fields jsonb;
  next_sections jsonb := '[]'::jsonb;
  section jsonb;
  remaining jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  inserted boolean := false;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'email_inquiry'
  for update of t;
  if not found then raise exception 'Email Inquiry template not found'; end if;

  select jsonb_agg(
    case when f->>'key' = 'event_date' then
      (f - 'helpText') || jsonb_build_object('label', 'DoB', 'labelByAnswer',
        jsonb_build_object('field', 'record_type', 'labels',
          jsonb_build_object('birth', 'DoB', 'death', 'DoD', 'marriage', 'DoM')))
    else f || jsonb_build_object('label', 'PoB', 'labelByAnswer',
        jsonb_build_object('field', 'record_type', 'labels',
          jsonb_build_object('birth', 'PoB', 'death', 'PoD', 'marriage', 'PoM')))
    end order by case when f->>'key' = 'event_date' then 0 else 1 end
  ) into record_fields
  from jsonb_array_elements(target.definition->'sections') s,
    jsonb_array_elements(s->'fields') f
  where f->>'key' in ('event_date', 'event_place');
  if jsonb_array_length(record_fields) is distinct from 2 then
    raise exception 'Expected record date and place fields';
  end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    select coalesce(jsonb_agg(f order by n), '[]'::jsonb) into remaining
    from jsonb_array_elements(section->'fields') with ordinality as fields(f, n)
    where f->>'key' not in ('event_date', 'event_place');
    if section->>'step' = 'details' and not inserted then
      remaining := remaining || record_fields;
      inserted := true;
    end if;
    next_sections := next_sections || jsonb_build_array(jsonb_set(section, '{fields}', remaining));
  end loop;
  if not inserted then raise exception 'Email Inquiry details section not found'; end if;
  next_definition := jsonb_set(target.definition, '{sections}', next_sections);
  if next_definition = target.definition then return; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end
$$;
