-- Electronic Endorsement (ELEC_ENDORSEMENT): ask which endorsement the
-- applicant needs, fix the record questions, and gate the checklist by track.
--
-- The service ran on a case form that did not fit:
--   * It asked "Date of death" / "Place of death", but an endorsement covers a
--     birth, death, or marriage record.
--   * "Purpose of Request" was a required free-text box. Marriage, CTC,
--     Legitimation, RA 9255, Court Decrees and Supplemental Report already
--     dropped it (20261011140000, 20261012140000, 20261012180000,
--     20261013130000, 20261013140000, 20261013150000).
--   * Nothing asked which of the three endorsement types applies, so all 19
--     checklist rows (5 + 7 + 7) were shown together, and only the Advance rows
--     were mandatory; the Negative and Blurred tracks had no required document.
--   * No row had a "where to secure", though the charter gives one for each.
--
-- Charter reference: CCRO Citizen's Charter, item 10 (Electronic Endorsement).
-- Track A, Advance Endorsement (5 documents), track B, Negative to PSA CRS
-- (7), track C, Blurred/Illegible Entries (7). Every document listed under a
-- track is required for that track. Fee (P100 + P5/page) and processing time
-- (1 hour; PSA copy after about a month) already match.
--
-- Case step after this migration:
--   What do you need, which record, date + place of the event on the record,
--   registry number (opt), additional notes.
--
-- The applicant's relationship is not asked: the charter lets the general
-- public file and it changes nothing. Row names keep their bracketed track
-- prefix, which renders as the case chip.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- The shared "additional_notes" field block is left alone.
-- Idempotent: skips the template when the active version already has
-- endorsement_type; the requirement update is a no-op on re-run.

do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  leading_inserted boolean;
  reference_seen boolean;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  leading_fields constant jsonb := $json$
  [
    {
      "key": "endorsement_type",
      "type": "select",
      "label": "What do you need?",
      "required": true,
      "helpText": "This decides which documents you need to bring.",
      "options": [
        { "value": "advance", "label": "Advance endorsement: send a newly registered record to PSA for an immediate SECPA copy" },
        { "value": "negative", "label": "Negative to PSA: PSA issued a negative certification, but the record is on file here" },
        { "value": "blurred", "label": "Blurred or illegible entries: my PSA copy has unreadable entries" }
      ]
    },
    {
      "key": "record_type",
      "type": "select",
      "label": "Which record is it for?",
      "required": true,
      "options": [
        { "value": "birth", "label": "Birth certificate" },
        { "value": "death", "label": "Death certificate" },
        { "value": "marriage", "label": "Marriage certificate" }
      ]
    }
  ]
  $json$::jsonb;
  reference_field constant jsonb := $json$
  {
    "key": "reference_number",
    "type": "text",
    "label": "Registry number (if known)",
    "required": false,
    "helpText": "Printed on your PSA or local civil registry copy."
  }
  $json$::jsonb;
begin
  select template.id, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  join public.service_form_templates binding
    on binding.template_id = template.id
  where binding.service_code = 'ELEC_ENDORSEMENT';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'endorsement_type'
  ) then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      if section->>'step' = 'case' then
        new_fields := '[]'::jsonb;
        leading_inserted := false;
        reference_seen := false;
        for field in select value from jsonb_array_elements(section->'fields') loop
          if field->>'key' = 'purpose' then
            continue;
          end if;

          -- The two choices come first: they decide what the rest describes.
          if field->>'key' = 'event_date' and not leading_inserted then
            new_fields := new_fields || leading_fields;
            leading_inserted := true;
          end if;

          -- The registry number goes just before the free-text notes.
          if field->>'key' = 'additional_notes' and not reference_seen then
            new_fields := new_fields || jsonb_build_array(reference_field);
            reference_seen := true;
          end if;

          if field->>'key' = 'reference_number' then
            reference_seen := true;
          end if;

          if field->>'key' = 'event_date' then
            field := field || jsonb_build_object(
              'label', 'Date of the event on the record',
              'required', true,
              'helpText', 'Date of birth, death, or marriage as written on the record.'
            );
          elsif field->>'key' = 'event_place' then
            field := field || jsonb_build_object(
              'label', 'Place of the event on the record',
              'required', true
            );
          end if;

          new_fields := new_fields || jsonb_build_array(field);
        end loop;

        if not leading_inserted then
          new_fields := leading_fields || new_fields;
        end if;
        if not reference_seen then
          new_fields := new_fields || jsonb_build_array(reference_field);
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

-- Keep the legacy label columns in step with the template, and stop surfacing
-- a purpose that is no longer asked. Party roles stay as the single "Subject".
update public.services_registry
set asks_purpose = false,
    event_date_label = 'Date of the event on the record',
    event_place_label = 'Place of the event on the record',
    reference_number_label = 'Registry number (if known)'
where service_code = 'ELEC_ENDORSEMENT';

-- Gate each row on the track it belongs to and make it required for that
-- track, since the charter lists every document as part of the checklist.
-- Where to secure comes from the charter; only blanks are filled, so a value
-- an admin has since edited is left alone.
update public.service_requirements_metadata requirement
set is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'endorsement_type',
        'operator', 'equals',
        'value', track.track_value
      ))
    ),
    where_to_secure = coalesce(
      requirement.where_to_secure,
      case
        when requirement.requirement_name ilike '%Proof of Urgency%'
          or requirement.requirement_name ilike '%Valid ID%'
          then 'Government/Private Sector'
        when requirement.requirement_name ilike '%PSA Negative Certification%'
          or requirement.requirement_name ilike '%Blurred PSA-SECPA%'
          then 'PSA'
        else 'Local Civil Registrar'
      end
    )
from (values
  ('[Advance Endorsement]%',          'advance'),
  ('[Negative to PSA CRS]%',          'negative'),
  ('[Blurred/Illegible Entries]%',    'blurred')
) as track(track_pattern, track_value)
where (requirement.service_code = 'ELEC_ENDORSEMENT'
       or requirement.requirement_group = 'ELEC_ENDORSEMENT')
  and requirement.requirement_name like track.track_pattern;
