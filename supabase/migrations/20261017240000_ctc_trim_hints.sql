-- CTC issuance: drop hints that repeat what the form already says.
--
-- "(optional)" already tells the applicant a box can be left blank, the notes box
-- shows an "approximate year" example, and the parents sit under "Owner's
-- information" so it is clear whose they are. Kept: the authorization-letter hint
-- (it asks for an upload) and the spouse-name hint (it explains why staff ask).
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep the answers they gave under the version they were submitted
-- against. Idempotent.

do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  trimmed constant text[] := array[
    'record_date', 'event_date', 'mother_maiden_name', 'father_name'
  ];
begin
  select template.id, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'ctc_issuance';

  if not found then
    return;
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = any (trimmed) and f ? 'helpText'
  ) then
    return;
  end if;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    new_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' = any (trimmed) then
        field := field - 'helpText';
      end if;
      new_fields := new_fields || jsonb_build_array(field);
    end loop;
    section := jsonb_set(section, '{fields}', new_fields, true);
    new_sections := new_sections || jsonb_build_array(section);
  end loop;

  next_definition := jsonb_set(
    template_row.definition, '{sections}', new_sections, true
  );

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions
  where template_id = template_row.id;

  insert into public.form_template_versions (
    template_id, version, status, definition, published_at
  ) values (
    template_row.id, next_version, 'published', next_definition, now()
  ) returning id into published_id;

  update public.form_templates
  set active_version_id = published_id, updated_at = now()
  where id = template_row.id;
end
$$;
