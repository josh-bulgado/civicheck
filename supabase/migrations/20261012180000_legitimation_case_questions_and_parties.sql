-- Legitimation: ask the questions that fit a legitimation, name all three
-- parties, and gate the Admission of Paternity requirement.
--
-- The service ran on the generic case form, which does not fit:
--   * "Date / Place on the requested record" is ambiguous, because a
--     legitimation touches both the child's birth record and the parents'
--     marriage record.
--   * "Purpose of request" is meaningless (the purpose is the legitimation) and
--     defaulted to "Local Use", so the stored answer was unreliable. Marriage
--     and CTC already dropped it (20261011140000, 20261012140000).
--   * The details step asked for a single "Person named on the record", but the
--     Affidavit of Legitimation is executed by both parents on behalf of the
--     child.
--   * "Admission of Paternity" is only needed when the father is blank on the
--     Certificate of Live Birth, yet it was an optional row for everyone.
--
-- Case step after this migration:
--   Child's date of birth, place of birth/registration, registry number (opt),
--   parents' marriage date + place, is the father on the birth certificate,
--   were the parents free to marry (notice only; staff decide), who is filing
--   (informational), additional notes.
--
-- Eligibility ("free to marry") is a warning, never a block: CCRO validates
-- manually on purpose. "Who is filing" does not change the checklist; the
-- existing "personal appearance of the couple" row covers representation.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- The shared "purpose" / "additional_notes" field blocks are left alone.
-- Idempotent: skips when the active version already has marriage_date.

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
      "key": "marriage_date",
      "type": "date",
      "label": "Date of the parents' marriage",
      "required": true,
      "dateDirection": "past",
      "helpText": "Legitimation applies to a child born before the parents married each other, so this should be after the child's date of birth."
    },
    {
      "key": "marriage_place",
      "type": "text",
      "label": "Place of the parents' marriage",
      "required": true,
      "placeholder": "e.g. Legazpi City, Albay"
    },
    {
      "key": "father_on_record",
      "type": "select",
      "label": "Is the father's name on the child's birth certificate?",
      "required": true,
      "helpText": "Check the Certificate of Live Birth. If the father's name is blank, an Admission of Paternity is also needed.",
      "options": [
        { "value": "yes", "label": "Yes, the father's name is on it" },
        { "value": "no", "label": "No, the father's name is blank" },
        { "value": "not_sure", "label": "Not sure" }
      ]
    },
    {
      "key": "free_to_marry",
      "type": "select",
      "label": "Were both parents free to marry each other when the child was conceived?",
      "required": true,
      "helpText": "That means neither parent was married to someone else at the time.",
      "options": [
        { "value": "yes", "label": "Yes" },
        {
          "value": "no",
          "label": "No",
          "notice": {
            "variant": "warning",
            "title": "The child may not qualify for legitimation",
            "description": "Legitimation generally requires that the parents could have married each other when the child was conceived. You can still continue; CCRO staff will review your case.",
            "blocksProgress": false
          }
        },
        { "value": "not_sure", "label": "Not sure" }
      ]
    },
    {
      "key": "filer_relationship",
      "type": "select",
      "label": "Who is filing this request?",
      "required": true,
      "options": [
        { "value": "father", "label": "The father" },
        { "value": "mother", "label": "The mother" },
        { "value": "both_parents", "label": "Both parents" },
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
  where binding.service_code = 'LEGITIMATION';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'marriage_date'
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
              'required', true
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

-- Parties: the child and both parents. Every Legitimation requirement is
-- upload_scope = 'request' with no subject_role, so adding parties does not
-- create per-person upload slots. Keep the legacy label columns in step with
-- the template, and stop surfacing a purpose that is no longer asked.
update public.services_registry
set party_roles = array['Child', 'Mother', 'Father'],
    asks_purpose = false,
    event_date_label = 'Child''s date of birth',
    event_place_label = 'Place where the child was born or registered',
    reference_number_label = 'Registry number of the child''s birth certificate (if known)'
where service_code = 'LEGITIMATION';

-- Admission of Paternity: required only when the father is blank on the
-- birth certificate. The bracketed prefix renders as a case chip.
update public.service_requirements_metadata
set requirement_name = case
      when requirement_name like '[%' then requirement_name
      else '[Father''s name is blank] ' || requirement_name
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
where service_code = 'LEGITIMATION'
  and requirement_name ilike '%Admission of Paternity%';
