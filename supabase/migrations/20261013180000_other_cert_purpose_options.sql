-- Issuance of Other Certificates (OTHER_CERT): purpose options written for this
-- service instead of the generic list.
--
-- The shared "purpose" field block lists uses for a copy of a record. Other
-- Certificates is "requested by the client for legal and reference purposes"
-- (charter item 15), and the block misses common uses: supporting a petition or
-- correction, settling an estate or property, and plain personal reference.
--
-- The shared block is deliberately NOT edited, because every service that uses
-- it would change. Instead this template's purpose fields are detached from the
-- block (blockKey removed) and carry their own options, so a later save of the
-- shared block no longer overwrites them.
--
-- Stored values:
--   * The six existing options keep their exact stored value, so old requests
--     and the admin purposes report stay consistent.
--   * Three new values are added; ADDITIONAL_PURPOSES in
--     src/features/forms/form-template.utils.ts lists them so the report counts
--     them instead of folding them into "Other".
--   * "Other" keeps its value: the form flattening treats it specially and
--     stores the applicant's free text in its place.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- Idempotent: skips when the purpose field already offers the new options.

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
  purpose_options constant jsonb := $json$
  [
    { "value": "Legal / Court proceedings", "label": "Legal / Court proceedings" },
    { "value": "Supporting document for a petition or correction", "label": "Supporting document for a petition or correction" },
    { "value": "Settlement of estate or property", "label": "Settlement of estate or property" },
    { "value": "Social Security (SSS/GSIS/etc.)", "label": "Social Security (SSS/GSIS/etc.)" },
    { "value": "Passport / Travel", "label": "Passport / Travel" },
    { "value": "Employment", "label": "Employment" },
    { "value": "School Records / Admission", "label": "School Records / Admission" },
    { "value": "Local Use (ID, Barangay, etc.)", "label": "Local Use (ID, Barangay, etc.)" },
    { "value": "Personal reference or records", "label": "Personal reference or records" },
    { "value": "Other", "label": "Other" }
  ]
  $json$::jsonb;
begin
  select template.id, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  join public.service_form_templates binding
    on binding.template_id = template.id
  where binding.service_code = 'OTHER_CERT';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f,
      jsonb_array_elements(coalesce(f->'options', '[]'::jsonb)) o
    where f->>'key' = 'purpose'
      and o->>'value' = 'Settlement of estate or property'
  ) then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      if section->>'step' = 'case' then
        new_fields := '[]'::jsonb;
        for field in select value from jsonb_array_elements(section->'fields') loop
          if field->>'key' = 'purpose' then
            field := (field - 'blockKey') || jsonb_build_object(
              'label', 'What will the certification be used for?',
              'required', true,
              'options', purpose_options
            );
          elsif field->>'key' = 'purpose_other' then
            field := (field - 'blockKey') || jsonb_build_object(
              'placeholder', 'e.g. Annulment case, visa application'
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
  end if;
end
$$;
