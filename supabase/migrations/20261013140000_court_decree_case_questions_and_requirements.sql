-- Registration of Court Decrees/Orders (COURT-ANNULMENT / COURT-FOREIGN-ADOPTION):
-- ask the question the checklist depends on, name both spouses for an
-- annulment, and gate the Certificate of Registration and Authenticity.
--
-- The group ran on the generic "copy of a record" case form, which does not
-- fit:
--   * "Purpose of request" is meaningless (the purpose is registering the
--     decree). Marriage, CTC, Legitimation and RA 9255 already dropped it
--     (20261011140000, 20261012140000, 20261012180000, 20261013130000).
--   * The Certificate of Registration and Authenticity is only needed when the
--     decision was not issued by the RTC of Legazpi City, yet nothing asked, so
--     it was an optional row for everyone and applicants had to guess.
--   * An annulment or declaration of nullity names two spouses, but the details
--     step named a single "Subject".
--
-- Charter reference: CCRO Citizen's Charter, item 13 (Registration of Court
-- Decrees/Order: Adoption, Nullity of Marriage, Legal Separation Court
-- Issuances). Requirement 3, the Certificate of Registration and Authenticity,
-- is an "additional requirement if DECISION was not issued by RTC, Legazpi
-- City". Legal Separation appears in the charter title with no fee line and no
-- service in the registry, so it is deliberately not modelled here.
--
-- Case step after this migration:
--   Date of the court decision, court that issued it, case/docket number (opt),
--   was it issued by the RTC of Legazpi City, additional notes.
--
-- "Not sure" does not trigger the Certificate; CCRO staff decide at the window,
-- same as RA 9255 and Legitimation.
--
-- Parties: annulment/nullity names both spouses; foreign decree/adoption keeps
-- the single "Subject" (the adoptee), since a foreign divorce is not yet a
-- modelled case.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- The shared "additional_notes" field block is left alone.
-- Idempotent: skips when the active version already has issued_by_rtc_legazpi.

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
      "key": "issued_by_rtc_legazpi",
      "type": "select",
      "label": "Was the decision issued by the RTC of Legazpi City?",
      "required": true,
      "helpText": "If another court issued it, you also need a Certificate of Registration and Authenticity from the Local Civil Registrar where that court is located.",
      "options": [
        { "value": "yes", "label": "Yes, the RTC of Legazpi City issued it" },
        { "value": "no", "label": "No, another court issued it" },
        { "value": "not_sure", "label": "Not sure" }
      ]
    }
  ]
  $json$::jsonb;
begin
  -- Both variants share the one court_decree template.
  select template.id, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'court_decree';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'issued_by_rtc_legazpi'
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

          -- The new question goes just before the free-text notes.
          if field->>'key' = 'additional_notes' and not inserted then
            new_fields := new_fields || added_fields;
            inserted := true;
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

-- Stop surfacing a purpose that is no longer asked.
update public.services_registry
set asks_purpose = false
where service_code in ('COURT-ANNULMENT', 'COURT-FOREIGN-ADOPTION');

-- An annulment or declaration of nullity names both spouses. Foreign
-- decree/adoption keeps the single "Subject".
update public.services_registry
set party_roles = array['Husband', 'Wife']
where service_code = 'COURT-ANNULMENT';

-- Certificate of Registration and Authenticity: required only when the
-- decision was not issued by the RTC of Legazpi City. The bracketed prefix
-- renders as a case chip and carries the condition, so the trailing clause is
-- dropped from the document name. The row belongs to the group, so it applies
-- to both variants.
update public.service_requirements_metadata
set requirement_name = case
      when requirement_name like '[%' then requirement_name
      else '[Decision not issued by the RTC of Legazpi City] '
        || 'Certificate of Registration and Authenticity of the Court Decision, '
        || 'issued by the Local Civil Registrar where the court is located'
    end,
    is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'issued_by_rtc_legazpi',
        'operator', 'equals',
        'value', 'no'
      ))
    )
where requirement_group = 'court_decree'
  and (
    requirement_name ilike 'Certificate of Registration and Authenticity%'
    or requirement_name ilike '[Decision not issued by the RTC%'
  );
