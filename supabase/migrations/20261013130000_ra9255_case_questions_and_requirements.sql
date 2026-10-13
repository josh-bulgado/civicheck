-- Processing of Application for Change of Surname under R.A. 9255
-- (RA9255_SURNAME): ask the questions that fit, name all three parties, and
-- gate the Admission of Paternity requirement.
--
-- The service ran on the generic "copy of a record" case form, which does not
-- fit:
--   * "Date / Place on the requested record" is ambiguous. The record here is
--     the child's birth certificate, and the child's age decides who must
--     personally sign the Affidavit to Use the Surname of the Father.
--   * "Purpose of request" is meaningless (the purpose is the surname change).
--     Marriage, CTC and Legitimation already dropped it (20261011140000,
--     20261012140000, 20261012180000).
--   * The details step named a single "Subject", but the father, whose surname
--     the child will use, is the other half of the request.
--   * "Admission of Paternity" is only needed for a child the father did not
--     recognize on the Certificate of Live Birth, yet it was an optional row
--     for everyone.
--
-- Charter reference: CCRO Citizen's Charter, item 12 (Processing of the
-- Application for Change of Surname per R.A. 9255). Requirement 3, the
-- Notarized Father's Admission of Paternity, applies to a "child unrecognized
-- by the natural father in the child's COLB".
--
-- Case step after this migration:
--   Child's date of birth, place of birth/registration, registry number (opt),
--   did the father acknowledge the child on the birth certificate, who is
--   filing (informational), additional notes.
--
-- "Not sure" does not trigger the Admission of Paternity; CCRO staff decide at
-- the window, same as Legitimation. "Who is filing" does not change the
-- checklist; the personal-appearance wording on the affidavit row covers it.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- The shared "additional_notes" field block is left alone.
-- Idempotent: skips when the active version already has father_on_record.

do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  inserted boolean;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  added_fields constant jsonb := $json$
  [
    {
      "key": "father_on_record",
      "type": "select",
      "label": "Did the father acknowledge the child on the birth certificate?",
      "required": true,
      "helpText": "That means his name is on it and he signed it. If it is blank or unsigned, a notarized Admission of Paternity is also needed.",
      "options": [
        { "value": "yes", "label": "Yes, the father acknowledged the child" },
        { "value": "no", "label": "No, the father's name is blank or he did not sign" },
        { "value": "not_sure", "label": "Not sure" }
      ]
    },
    {
      "key": "filer_relationship",
      "type": "select",
      "label": "Your relationship to the child",
      "required": true,
      "helpText": "Children aged 7 to 17 sign with a notarized attestation from the mother or legal guardian. Children aged 18 and above sign for themselves.",
      "options": [
        { "value": "self", "label": "I am the child (18 years old or above)" },
        { "value": "mother", "label": "The child's mother" },
        { "value": "guardian", "label": "The child's legal guardian" },
        { "value": "other_relative", "label": "Another relative" }
      ]
    }
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
  where binding.service_code = 'RA9255_SURNAME';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'father_on_record'
  ) then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      if section->>'step' = 'case' then
        new_fields := '[]'::jsonb;
        inserted := false;
        for field in select value from jsonb_array_elements(section->'fields') loop
          if field->>'key' in ('purpose', 'purpose_other') then
            continue;
          end if;

          -- New questions go just before the free-text notes.
          if field->>'key' = 'additional_notes' and not inserted then
            new_fields := new_fields || added_fields;
            inserted := true;
          end if;

          if field->>'key' = 'event_date' then
            field := field || jsonb_build_object(
              'label', 'Child''s date of birth',
              'required', true,
              'helpText', 'The child''s age decides who signs the Affidavit to Use the Surname of the Father.'
            );
          elsif field->>'key' = 'event_place' then
            field := field || jsonb_build_object(
              'label', 'Place where the child was born or registered',
              'required', true
            );
          elsif field->>'key' = 'reference_number' then
            field := field || jsonb_build_object(
              'label', 'Registry number of the child''s birth certificate (if known)'
            );
          end if;

          new_fields := new_fields || jsonb_build_array(field);
        end loop;

        if not inserted then
          new_fields := new_fields || added_fields;
        end if;
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

-- Parties: the child and both parents. Every RA 9255 requirement is
-- upload_scope = 'request' with no subject_role, so adding parties does not
-- create per-person upload slots. Keep the legacy label columns in step with
-- the template, and stop surfacing a purpose that is no longer asked.
update public.services_registry
set party_roles = array['Child', 'Mother', 'Father'],
    asks_purpose = false,
    event_date_label = 'Child''s date of birth',
    event_place_label = 'Place where the child was born or registered',
    reference_number_label = 'Registry number of the child''s birth certificate (if known)'
where service_code = 'RA9255_SURNAME';

-- Admission of Paternity: required only when the father did not acknowledge
-- the child on the birth certificate. The bracketed prefix renders as a case
-- chip and carries the condition, so the trailing clause is dropped from the
-- document name.
update public.service_requirements_metadata
set requirement_name = case
      when requirement_name like '[%' then requirement_name
      else '[Father did not acknowledge the child] ' || replace(
        requirement_name,
        ', for a child not recognized by the father on the birth certificate',
        ''
      )
    end,
    is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'father_on_record',
        'operator', 'equals',
        'value', 'no'
      ))
    )
where service_code = 'RA9255_SURNAME'
  and requirement_name ilike '%Admission of Paternity%';
