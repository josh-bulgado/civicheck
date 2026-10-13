-- Issuance of Other Certificates Relative to Civil Registration (OTHER_CERT):
-- ask which certification is being requested, and record where each
-- requirement is secured.
--
-- The service ran on a case form that never asked the one thing a catch-all
-- certification service needs: *what* certification the applicant wants. It
-- asked "Date of event" / "Place of event" and a purpose, so staff had to open
-- the letter-request to find out what to prepare. The two checklist rows also
-- had no "where to secure", though the charter gives one for each.
--
-- Charter reference: CCRO Citizen's Charter, item 15 (Issuance of Other
-- Certificates Relative to Civil Registration). Both requirements apply to
-- every applicant, so no row is gated on an answer; fee (P100) and processing
-- time (1 hour) already match.
--
-- Purpose of request is deliberately KEPT, unlike Legitimation, RA 9255, Court
-- Decrees, Supplemental Report and Electronic Endorsement: the charter describes
-- this service as certifications "requested by the client for legal and
-- reference purposes", so the purpose is part of what is being asked.
--
-- Case step after this migration:
--   What certification, which record, date + place of the event on the record,
--   registry number (opt), purpose, additional notes.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- The shared "purpose" / "additional_notes" field blocks are left alone.
-- Idempotent: skips the template when the active version already has
-- certification_requested; the where_to_secure update only fills blanks.

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
      "key": "certification_requested",
      "type": "text",
      "label": "What certification do you need?",
      "required": true,
      "placeholder": "e.g. Certification of no record of marriage",
      "helpText": "Write it the way you would in your letter-request."
    },
    {
      "key": "record_type",
      "type": "select",
      "label": "Which record does it concern?",
      "required": true,
      "options": [
        { "value": "birth", "label": "Birth record" },
        { "value": "death", "label": "Death record" },
        { "value": "marriage", "label": "Marriage record" },
        { "value": "other", "label": "Other" }
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
  where binding.service_code = 'OTHER_CERT';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'certification_requested'
  ) then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      if section->>'step' = 'case' then
        new_fields := '[]'::jsonb;
        leading_inserted := false;
        reference_seen := false;
        for field in select value from jsonb_array_elements(section->'fields') loop
          -- What is wanted, and which record it concerns, come first: the date
          -- and place below describe that record.
          if field->>'key' = 'event_date' and not leading_inserted then
            new_fields := new_fields || leading_fields;
            leading_inserted := true;
          end if;

          -- The registry number goes just before the purpose (or the notes if
          -- the purpose block was removed).
          if field->>'key' in ('purpose', 'additional_notes') and not reference_seen then
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

-- Keep the legacy label columns in step with the template. asks_purpose and the
-- single "Subject" party are left as they are.
update public.services_registry
set event_date_label = 'Date of the event on the record',
    event_place_label = 'Place of the event on the record',
    reference_number_label = 'Registry number (if known)'
where service_code = 'OTHER_CERT';

-- Where each requirement is secured, from the charter. Only fills blanks, so a
-- value an admin has since edited is left alone.
update public.service_requirements_metadata requirement
set where_to_secure = rule.where_to_secure
from (values
  ('Application/Verification Form%', 'LCRO'),
  ('Letter-request%',                'Government/Private agency')
) as rule(name_pattern, where_to_secure)
where (requirement.service_code = 'OTHER_CERT'
       or requirement.requirement_group = 'OTHER_CERT')
  and requirement.where_to_secure is null
  and requirement.requirement_name like rule.name_pattern;
