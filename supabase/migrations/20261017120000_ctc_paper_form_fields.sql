-- CTC issuance: collect the fields on the CCRO's Verification Form (the paper
-- "Application for Certified True Xerox Copy", birth).
--
-- Added (all optional, because applicants asking for an older relative's record
-- often do not know them):
--   * Mother's maiden name, Name of father, "Registered late?" and "If yes,
--     when?" -- birth records only, on the case step beside the record type
--   * Requester's address and Purpose -- on the details step
--
-- "Purpose" uses its own key (`purpose_of_request`), not the legacy `purpose`
-- select, so it never picks up the old "Local Use" default; asks_purpose stays
-- false so no phantom purpose is echoed in the summary or reports.
--
-- Relationship to the owner follows the form's remark: an authorization letter
-- is needed only if the requester is NOT the owner, a parent, the spouse, a
-- son/daughter or the institution-in-charge. The `representative` value is kept
-- so existing answers still resolve; the old `kin` value is replaced by the
-- specific relationships.
--
-- The "Verification Form" upload requirement is deliberately left unchanged
-- until the CCRO confirms a system-generated form can replace it.
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
  birth_only constant jsonb := jsonb_build_object(
    'field', 'record_type', 'operator', 'equals', 'value', 'birth'
  );
  birth_fields jsonb;
  relationship_field jsonb;
  requester_fields jsonb;
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

  if exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'mother_maiden_name'
  ) then
    return;
  end if;

  birth_fields := jsonb_build_array(
    jsonb_build_object(
      'key', 'mother_maiden_name',
      'type', 'text',
      'label', 'Mother''s maiden name',
      'required', false,
      'helpText', 'Leave blank if you don''t know it.',
      'visibleWhen', birth_only
    ),
    jsonb_build_object(
      'key', 'father_name',
      'type', 'text',
      'label', 'Name of father',
      'required', false,
      'helpText', 'Leave blank if you don''t know it.',
      'visibleWhen', birth_only
    ),
    jsonb_build_object(
      'key', 'registered_late',
      'type', 'select',
      'label', 'Was the birth registered late?',
      'required', false,
      'options', jsonb_build_array(
        jsonb_build_object('value', 'no', 'label', 'No'),
        jsonb_build_object('value', 'yes', 'label', 'Yes')
      ),
      'visibleWhen', birth_only
    ),
    jsonb_build_object(
      'key', 'registered_late_when',
      'type', 'date',
      'label', 'If yes, when was it registered?',
      'required', false,
      'dateDirection', 'past',
      'visibleWhen', jsonb_build_object(
        'field', 'registered_late', 'operator', 'equals', 'value', 'yes'
      )
    )
  );

  relationship_field := jsonb_build_object(
    'key', 'requester_relationship',
    'type', 'select',
    'label', 'Your relationship to the document owner',
    'required', true,
    'helpText', 'If you are not the owner, a parent, the spouse, a son/daughter or the institution-in-charge, you must upload an Authorization Letter with an ID bearing the owner''s signature.',
    'options', jsonb_build_array(
      jsonb_build_object('value', 'owner', 'label', 'I am the document owner'),
      jsonb_build_object('value', 'parent', 'label', 'Parent of the owner'),
      jsonb_build_object('value', 'spouse', 'label', 'Spouse of the owner'),
      jsonb_build_object('value', 'child', 'label', 'Son/Daughter of the owner'),
      jsonb_build_object('value', 'institution', 'label', 'Institution-in-charge'),
      jsonb_build_object('value', 'representative', 'label', 'Authorized representative (other)')
    )
  );

  requester_fields := jsonb_build_array(
    jsonb_build_object(
      'key', 'requester_address',
      'type', 'text',
      'label', 'Your address',
      'required', false
    ),
    jsonb_build_object(
      'key', 'purpose_of_request',
      'type', 'text',
      'label', 'Purpose',
      'required', false,
      'placeholder', 'e.g. school, employment, passport'
    )
  );

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' = 'requester_relationship' then
          new_fields := new_fields || birth_fields || jsonb_build_array(relationship_field);
        else
          new_fields := new_fields || jsonb_build_array(field);
        end if;
      end loop;
      section := jsonb_set(section, '{fields}', new_fields, true);
    elsif section->>'step' = 'details' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        new_fields := new_fields || jsonb_build_array(field);
        if field->>'key' = 'contact_number' then
          new_fields := new_fields || requester_fields;
        end if;
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

-- The Authorization Letter is needed only for an authorized representative.
update public.service_requirements_metadata
set is_mandatory = true,
    requirement_name = 'Authorization Letter of the document owner — required if the requester is not the owner, a parent, the spouse, a son/daughter or the institution-in-charge',
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'requester_relationship',
        'operator', 'equals',
        'value', 'representative'
      ))
    )
where requirement_group = 'ctc_issuance'
  and requirement_name ilike 'Authorization%';
