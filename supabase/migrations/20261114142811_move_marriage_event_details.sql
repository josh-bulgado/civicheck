-- Keep marriage record details together without changing validation or timing.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  event_fields jsonb;
  next_fields jsonb;
  next_sections jsonb;
  next_version integer;
  published_id uuid;
begin
  for target in
    select t.id, v.definition from public.form_templates t
    join public.form_template_versions v on v.id = t.active_version_id
    where t.template_key in ('marriage_ontime', 'marriage_delayed')
    for update of t
  loop
    if not exists (
      select 1 from jsonb_array_elements(target.definition->'sections') s,
        jsonb_array_elements(s->'fields') f
      where s->>'step' = 'case' and f->>'key' in ('event_date', 'event_place')
    ) then continue; end if;

    select jsonb_agg(f order by case f->>'key' when 'event_date' then 1 else 2 end)
    into event_fields
    from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' in ('event_date', 'event_place');
    if jsonb_array_length(event_fields) <> 2 then
      raise exception 'Expected both marriage event fields';
    end if;
    if not exists (
      select 1 from jsonb_array_elements(target.definition->'sections') s,
        jsonb_array_elements(s->'fields') f
      where s->>'step' = 'details' and f->>'type' = 'person_group'
    ) then raise exception 'Marriage person-details section not found'; end if;

    next_sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(target.definition->'sections') loop
      next_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('event_date', 'event_place') then continue; end if;
        next_fields := next_fields || jsonb_build_array(field);
        if section->>'step' = 'details' and field->>'type' = 'person_group' then
          next_fields := next_fields || event_fields;
        end if;
      end loop;
      next_sections := next_sections || jsonb_build_array(jsonb_set(section, '{fields}', next_fields));
    end loop;

    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = target.id;
    insert into public.form_template_versions(template_id, version, status, definition, published_at)
    values (target.id, next_version, 'published', jsonb_set(target.definition, '{sections}', next_sections), now())
    returning id into published_id;
    update public.form_templates set active_version_id = published_id, updated_at = now()
    where id = target.id;
  end loop;
end $$;
