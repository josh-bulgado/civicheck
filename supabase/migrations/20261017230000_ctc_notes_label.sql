-- CTC issuance: say what the notes box is for.
--
-- "Additional notes" was rarely used; its real job is to carry an approximate
-- year or another spelling of the name when the applicant leaves the date blank.
-- Rename it to say so, give an example, and point the date hints at it.
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
    where f->>'key' = 'additional_notes'
      and f->>'label' <> 'Anything that helps staff find the record'
  ) then
    return;
  end if;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    new_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' = 'additional_notes' then
        field := field || jsonb_build_object(
          'label', 'Anything that helps staff find the record',
          'placeholder', 'e.g. approximate year, other spelling of the name'
        );
      elsif field->>'key' = 'record_date' then
        field := field || jsonb_build_object(
          'helpText', 'Not sure? Leave it blank and give an approximate year in the box below.'
        );
      elsif field->>'key' = 'event_date' then
        field := field || jsonb_build_object(
          'helpText', 'Not sure? Leave it blank. You can give an approximate year in the notes on the previous page.'
        );
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
