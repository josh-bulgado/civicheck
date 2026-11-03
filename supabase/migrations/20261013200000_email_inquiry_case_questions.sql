-- Email Assisted-Online Inquiry/Verification (EMAIL_INQUIRY): ask what the
-- inquiry is about, gate the Authorization Letter, and record where each
-- requirement is secured.
--
-- The service ran on the generic "copy of a record" case form: "Date of event",
-- "Place of event" and a purpose. It never asked which record is being
-- verified or what CCRO is asked to verify, and the Authorization Letter was an
-- optional row for everyone although the charter requires it only when the
-- requester is not the owner of the document. No row had a "where to secure".
--
-- Charter reference: CCRO Citizen's Charter, item 16. Four requirements: Email
-- Request Letter (from the individual/owner), Verification Form (Local Civil
-- Registrar), Authorization Letter if the requester is not the owner (the
-- individual/owner), Valid ID (Government/Private Sector). Fee none; 2 hours.
--
-- Purpose of request is removed: the charter does not ask for it and the
-- service is itself the verification.
--
-- Case step after this migration:
--   Which record, date + place of the event on the record, registry number
--   (opt), what to verify, are you the person named on the record, notes.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- The shared "additional_notes" field block is left alone.
-- Idempotent: skips the template when the active version already has
-- what_to_verify; the requirement updates only fill blanks / re-apply the same
-- values.

do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  leading_inserted boolean;
  tail_inserted boolean;
  reference_seen boolean;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  record_type_field constant jsonb := $json$
  {
    "key": "record_type",
    "type": "select",
    "label": "Which record do you want to verify?",
    "required": true,
    "options": [
      { "value": "birth", "label": "Birth certificate" },
      { "value": "death", "label": "Death certificate" },
      { "value": "marriage", "label": "Marriage certificate" }
    ]
  }
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
  tail_fields constant jsonb := $json$
  [
    {
      "key": "what_to_verify",
      "type": "textarea",
      "label": "What would you like CCRO to verify?",
      "required": true,
      "placeholder": "e.g. That the birth record exists and the mother's name is correct"
    },
    {
      "key": "is_record_owner",
      "type": "select",
      "label": "Are you the person named on the record?",
      "required": true,
      "helpText": "If you are asking on someone else's behalf, an Authorization Letter from them is also needed.",
      "options": [
        { "value": "yes", "label": "Yes, it is my record" },
        { "value": "no", "label": "No, I am asking on someone else's behalf" }
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
  where binding.service_code = 'EMAIL_INQUIRY';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'what_to_verify'
  ) then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      if section->>'step' = 'case' then
        new_fields := '[]'::jsonb;
        leading_inserted := false;
        tail_inserted := false;
        reference_seen := false;
        for field in select value from jsonb_array_elements(section->'fields') loop
          if field->>'key' in ('purpose', 'purpose_other') then
            continue;
          end if;

          -- Which record comes first, because the date and place describe it.
          if field->>'key' = 'event_date' and not leading_inserted then
            new_fields := new_fields || jsonb_build_array(record_type_field);
            leading_inserted := true;
          end if;

          if field->>'key' = 'reference_number' then
            reference_seen := true;
          end if;

          -- The registry number and the two inquiry questions go just before
          -- the free-text notes.
          if field->>'key' = 'additional_notes' and not tail_inserted then
            if not reference_seen then
              new_fields := new_fields || jsonb_build_array(reference_field);
              reference_seen := true;
            end if;
            new_fields := new_fields || tail_fields;
            tail_inserted := true;
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
          new_fields := jsonb_build_array(record_type_field) || new_fields;
        end if;
        if not tail_inserted then
          if not reference_seen then
            new_fields := new_fields || jsonb_build_array(reference_field);
          end if;
          new_fields := new_fields || tail_fields;
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
where service_code = 'EMAIL_INQUIRY';

-- Authorization Letter: required only when the requester is not the person
-- named on the record. The bracketed prefix renders as a case chip and carries
-- the condition, so the trailing clause is dropped from the document name.
update public.service_requirements_metadata
set requirement_name = case
      when requirement_name like '[%' then requirement_name
      else '[Not the person named on the record] Authorization Letter'
    end,
    is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'is_record_owner',
        'operator', 'equals',
        'value', 'no'
      ))
    )
where (service_code = 'EMAIL_INQUIRY' or requirement_group = 'EMAIL_INQUIRY')
  and requirement_name ilike '%Authorization Letter%';

-- Where each requirement is secured, from the charter. Only fills blanks, so a
-- value an admin has since edited is left alone.
update public.service_requirements_metadata
set where_to_secure = case
      when requirement_name ilike '%Authorization Letter%'
        then 'Individual/Owner of the document'
      when requirement_name ilike 'Email Request Letter%'
        then 'Individual/owner'
      when requirement_name ilike 'Verification Form%'
        then 'Local Civil Registrar'
      when requirement_name ilike 'Valid ID%'
        then 'Government/Private Sector'
    end
where (service_code = 'EMAIL_INQUIRY' or requirement_group = 'EMAIL_INQUIRY')
  and where_to_secure is null
  and (
    requirement_name ilike '%Authorization Letter%'
    or requirement_name ilike 'Email Request Letter%'
    or requirement_name ilike 'Verification Form%'
    or requirement_name ilike 'Valid ID%'
  );
