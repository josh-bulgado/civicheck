-- Supplemental Report (SUPPLEMENTAL_REPORT): ask what a supplemental report is
-- actually about, drop the meaningless purpose, and record where each
-- requirement is secured.
--
-- The service ran on the generic "copy of a record" case form, which does not
-- fit:
--   * It never asked which entry is being supplemented or what should be
--     added, so staff could not see the request without opening the affidavit.
--   * "Date / Place on the requested record" does not say which record. The
--     chart's first requirement covers a birth, death, or marriage certificate.
--   * "Purpose of request" is meaningless (the purpose is the supplemental
--     report). Marriage, CTC, Legitimation, RA 9255 and Court Decrees already
--     dropped it (20261011140000, 20261012140000, 20261012180000,
--     20261013130000, 20261013140000).
--   * The three checklist rows had no "where to secure", though the charter
--     gives one for each.
--
-- Charter reference: CCRO Citizen's Charter, item 14 (Supplemental Report).
-- All three requirements apply to every applicant, so no row is gated on an
-- answer; fee (P200) and processing time (2 hours) already match.
--
-- Case step after this migration:
--   Which record has the omitted entry, date + place of the event on the record,
--   registry number (opt), which entry to add, what should be added, additional
--   notes.
--
-- The reason the entry was omitted is not asked: the sworn Affidavit of
-- Supplemental Report states it. The applicant's relationship is not asked
-- either: the charter lets the general public file and it changes nothing.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- The shared "additional_notes" field block is left alone.
-- Idempotent: skips when the active version already has entry_to_supplement.

do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  record_inserted boolean;
  added_inserted boolean;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  record_type_field constant jsonb := $json$
  {
    "key": "record_type",
    "type": "select",
    "label": "Which record has the omitted entry?",
    "required": true,
    "options": [
      { "value": "birth", "label": "Birth certificate" },
      { "value": "death", "label": "Death certificate" },
      { "value": "marriage", "label": "Marriage certificate" }
    ]
  }
  $json$::jsonb;
  added_fields constant jsonb := $json$
  [
    {
      "key": "entry_to_supplement",
      "type": "text",
      "label": "Which entry needs to be added?",
      "required": true,
      "placeholder": "e.g. Father's name, time of birth, citizenship",
      "helpText": "The item that was left blank when the record was first registered."
    },
    {
      "key": "information_to_add",
      "type": "text",
      "label": "What should be added?",
      "required": true,
      "helpText": "Write it exactly as it should appear on the record. A document showing the correct information is also needed."
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
  where binding.service_code = 'SUPPLEMENTAL_REPORT';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'entry_to_supplement'
  ) then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      if section->>'step' = 'case' then
        new_fields := '[]'::jsonb;
        record_inserted := false;
        added_inserted := false;
        for field in select value from jsonb_array_elements(section->'fields') loop
          if field->>'key' in ('purpose', 'purpose_other') then
            continue;
          end if;

          -- Which record comes first, because the date and place describe it.
          if field->>'key' = 'event_date' and not record_inserted then
            new_fields := new_fields || jsonb_build_array(record_type_field);
            record_inserted := true;
          end if;

          -- The entry questions go just before the free-text notes.
          if field->>'key' = 'additional_notes' and not added_inserted then
            new_fields := new_fields || added_fields;
            added_inserted := true;
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
          elsif field->>'key' = 'reference_number' then
            field := field || jsonb_build_object(
              'label', 'Registry number (if known)',
              'helpText', 'Printed on your PSA or local civil registry copy.'
            );
          end if;

          new_fields := new_fields || jsonb_build_array(field);
        end loop;

        if not record_inserted then
          new_fields := jsonb_build_array(record_type_field) || new_fields;
        end if;
        if not added_inserted then
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

-- Keep the legacy label columns in step with the template, and stop surfacing
-- a purpose that is no longer asked. Party roles stay as the single "Subject".
update public.services_registry
set asks_purpose = false,
    event_date_label = 'Date of the event on the record',
    event_place_label = 'Place of the event on the record',
    reference_number_label = 'Registry number (if known)'
where service_code = 'SUPPLEMENTAL_REPORT';

-- Where each requirement is secured, from the charter. Only fills blanks, so a
-- value an admin has since edited is left alone.
update public.service_requirements_metadata requirement
set where_to_secure = rule.where_to_secure
from (values
  ('Certified copy of the LCRO and PSA%',               'CRO and PSA'),
  ('Subscribed Affidavit of Supplemental Report%',      'LCRO or Notary Public'),
  ('Any document bearing the correct information%',     'Issuing office/agency')
) as rule(name_pattern, where_to_secure)
where (requirement.service_code = 'SUPPLEMENTAL_REPORT'
       or requirement.requirement_group = 'SUPPLEMENTAL_REPORT')
  and requirement.where_to_secure is null
  and requirement.requirement_name like rule.name_pattern;
