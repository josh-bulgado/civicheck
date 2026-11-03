-- Certified True/Xerox Copies (CTC-LOCAL / CTC-ABROAD): stop blocking applicants
-- on details they may not know, and drop the purpose question.
--
-- 1. "Date on the requested record" and "Place on the requested record" only
--    help staff locate the record faster; the person's name (details step) is
--    what identifies it. Applicants asking for an older relative's record often
--    do not know either, so neither may block the application. Registry/OCT
--    number was already optional.
-- 2. "Purpose of request" drives no fee, requirement or validation, is not on
--    the CCRO checklist for this service, and defaulted to "Local Use" so the
--    stored answer was unreliable. Marriage already dropped it
--    (20261011140000). Additional notes stays so an applicant can give an
--    approximate year or a maiden name.
--
-- The shared "purpose" field block is left alone: other services still use it.
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- Idempotent.

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
  lookup_help constant text :=
    'Leave blank if you don''t know it. An approximate year in Additional notes helps staff find the record.';
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

  -- Nothing to do when the active version already has the final shape.
  if not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' in ('purpose', 'purpose_other')
       or (f->>'key' in ('event_date', 'event_place')
           and coalesce((f->>'required')::boolean, false))
  ) then
    return;
  end if;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('purpose', 'purpose_other') then
          continue;
        end if;
        if field->>'key' in ('event_date', 'event_place') then
          field := field || jsonb_build_object(
            'required', false,
            'helpText', lookup_help
          );
        end if;
        new_fields := new_fields || jsonb_build_array(field);
      end loop;
      section := jsonb_set(section, '{fields}', new_fields, true);
    end if;
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

-- The apply wizard's documents sidebar echoes the purpose whenever the service
-- flag is on, and the draft defaults it to "Local Use". Turn it off with the
-- field so nothing phantom is displayed.
update public.services_registry
set asks_purpose = false
where service_code in ('CTC-LOCAL', 'CTC-ABROAD');
