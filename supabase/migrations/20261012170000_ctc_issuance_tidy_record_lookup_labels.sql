-- CTC issuance: tidy the record-lookup labels and help text.
--
-- The three optional lookup inputs (date, place, registry/OCT number) now sit
-- in one row on a wide screen, and the form appends "(optional)" to optional
-- labels, so long labels wrap and push their input out of line with its
-- neighbours. "Registry/OCT number (if known) (optional)" also hedged twice.
-- Shorten them, and say the "approximate year" tip once, under the date,
-- instead of repeating the same sentence under both date and place.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep the version they were submitted against. Idempotent.

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
    where (f->>'key' = 'event_date' and f->>'label' <> 'Date on the record')
       or (f->>'key' = 'event_place' and f->>'label' <> 'Place on the record')
       or (f->>'key' = 'reference_number' and f->>'label' <> 'Registry/OCT number')
  ) then
    return;
  end if;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' = 'event_date' then
          field := field || jsonb_build_object(
            'label', 'Date on the record',
            'helpText', 'Not sure? Leave it blank and add an approximate year in Additional notes.'
          );
        elsif field->>'key' = 'event_place' then
          field := (field - 'helpText') || jsonb_build_object('label', 'Place on the record');
        elsif field->>'key' = 'reference_number' then
          field := field || jsonb_build_object('label', 'Registry/OCT number');
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

-- Keep the service-level labels (read by the legacy form and some detail
-- views) in step with the form so a request is not labelled two ways.
update public.services_registry
set event_date_label = 'Date on the record',
    event_place_label = 'Place on the record',
    reference_number_label = 'Registry/OCT number'
where service_code in ('CTC-LOCAL', 'CTC-ABROAD');
