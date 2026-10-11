-- Processing of Petitions under R.A. 9048 and R.A. 10172 (RA9048-CFN / RA9048-CCE).
--
-- 1. The case step was the generic "copy of a record" form (date/place on the
--    requested record, registry number, purpose). It never asked what the
--    petition is about, so the two variants could not be told apart and staff
--    could not see what was being changed. Ask what the petition covers, route
--    to the matching service, and collect the facts the petition needs.
-- 2. The 20 checklist rows were tagged with the variant codes
--    (RA9048-CFN / RA9048-CCE) instead of the group key the apply wizard reads
--    (ra9048_10172), so the wizard saw no checklist at all, and every row was
--    optional. Link them to the group like ctc_issuance / birth_delayed, and
--    gate each row on the petition type it belongs to.
--
-- Charter reference: CCRO Citizen's Charter 2025, item 11 (Processing of
-- Petitions for R.A. 9048 and R.A. 10172). A petition can combine a change of
-- first name with a correction of sex or day/month of birth, so the case
-- questions are independent yes/no answers rather than one "type" choice.
--
-- Idempotent: safe to re-run.

-- 1. Requirement rows belong to the group, not to a single variant -----------

update public.service_requirements_metadata
set service_code = null,
    requirement_group = 'ra9048_10172'
where service_code in ('RA9048-CFN', 'RA9048-CCE')
  and requirement_group = service_code;

-- 2. Gate each row on the petition it belongs to -----------------------------
--
-- Mandatory + requires_upload  -> upload slot the applicant fills in the wizard.
-- Mandatory + not upload       -> listed as an in-person "bring" item; the
--                                 document only exists after filing/publication.
-- Rows left untouched: "Additional supporting documents ..." (optional, at the
-- registrar's discretion).

do $$
declare
  fn_yes constant jsonb := '{"match":"all","conditions":[
    {"field":"change_first_name","operator":"equals","value":"yes"}]}';
  fn_employed constant jsonb := '{"match":"all","conditions":[
    {"field":"change_first_name","operator":"equals","value":"yes"},
    {"field":"employment_status","operator":"equals","value":"employed"}]}';
  fn_not_employed constant jsonb := '{"match":"all","conditions":[
    {"field":"change_first_name","operator":"equals","value":"yes"},
    {"field":"employment_status","operator":"equals","value":"not_employed"}]}';
  sex_or_birth constant jsonb := '{"match":"any","conditions":[
    {"field":"correct_sex","operator":"equals","value":"yes"},
    {"field":"correct_birth_day_month","operator":"equals","value":"yes"}]}';
  sex_only constant jsonb := '{"match":"all","conditions":[
    {"field":"correct_sex","operator":"equals","value":"yes"}]}';
  other_yes constant jsonb := '{"match":"all","conditions":[
    {"field":"correct_other","operator":"equals","value":"yes"}]}';
begin
  update public.service_requirements_metadata requirement
  set is_mandatory = rule.is_mandatory,
      requires_upload = rule.requires_upload,
      applies_when = rule.applies_when
  from (values
    -- Change of first name
    ('[Change of First Name] Child%',                          true, true,  fn_yes),
    ('[Change of First Name] NBI%',                            true, true,  fn_yes),
    ('[Change of First Name] Employer%',                       true, true,  fn_employed),
    ('[Change of First Name] Affidavit of Non-Employment%',    true, true,  fn_not_employed),
    ('[Change of First Name] At least 3%',                     true, true,  fn_yes),
    -- Filed after publication, so brought in later rather than uploaded now.
    ('[Change of First Name] Newspaper%',                      true, false, fn_yes),
    -- R.A. 10172: sex / day or month of birth
    ('[RA 10172 Sex/DOB Correction] Certified true copy%',     true, true,  sex_or_birth),
    ('[RA 10172 Sex/DOB Correction] Earliest school%',         true, true,  sex_or_birth),
    ('[RA 10172 Sex/DOB Correction] Medical record%',          true, true,  sex_or_birth),
    ('[RA 10172 Sex/DOB Correction] Baptismal certificate%',   true, true,  sex_or_birth),
    ('[RA 10172 Sex/DOB Correction] Clearance/certification%', true, true,  sex_or_birth),
    ('[RA 10172 Sex/DOB Correction] Affidavit of Publication%', true, false, sex_or_birth),
    ('[RA 10172 Sex/DOB Correction] Notice and Certificate%',  true, false, sex_or_birth),
    -- Only the sex entry needs the Health Officer's certification.
    ('[RA 10172 Sex/DOB Correction] Certification from the City%', true, true, sex_only),
    -- Other clerical or typographical error
    ('[Correction of Clerical Error] Civil registry%',         true, true,  other_yes),
    ('[Correction of Clerical Error] Petitioner%parents%',     true, true,  other_yes),
    ('[Correction of Clerical Error] Personal%',               true, true,  other_yes),
    -- "(if married)": no question asks, so it is listed as a bring-if-applicable item.
    ('[Correction of Clerical Error] Petitioner%Marriage%',    true, false, other_yes)
  ) as rule(name_pattern, is_mandatory, requires_upload, applies_when)
  where requirement.requirement_group = 'ra9048_10172'
    and requirement.requirement_name like rule.name_pattern;
end
$$;

-- 3. Case selector + case-step fields ----------------------------------------

do $$
declare
  template_row record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  selector jsonb;
  new_fields jsonb;
  preserved_fields jsonb;
  section jsonb;
  new_sections jsonb := '[]'::jsonb;
begin
  selector := $json$
  {
    "title": "What does your petition cover?",
    "description": "Answer each question. At least one must be Yes. One petition can combine a change of first name with a correction of sex or birth date.",
    "questions": [
      {
        "key": "change_first_name",
        "label": "Do you want to change the first name?",
        "description": "Change of first name or nickname under R.A. 9048.",
        "options": [
          { "value": "yes", "label": "Yes" },
          { "value": "no", "label": "No" }
        ]
      },
      {
        "key": "correct_sex",
        "label": "Do you want to correct the sex on the record?",
        "description": "Correction of a clerical error in the sex entry under R.A. 10172.",
        "options": [
          { "value": "yes", "label": "Yes" },
          { "value": "no", "label": "No" }
        ]
      },
      {
        "key": "correct_birth_day_month",
        "label": "Do you want to correct the day or month of birth?",
        "description": "Under R.A. 10172. Only the day and month can be corrected this way.",
        "options": [
          { "value": "yes", "label": "Yes" },
          { "value": "no", "label": "No" }
        ]
      },
      {
        "key": "correct_other",
        "label": "Do you want to correct another clerical or typographical error?",
        "description": "For example a misspelled name or place on a birth, marriage, or death record.",
        "options": [
          { "value": "yes", "label": "Yes" },
          { "value": "no", "label": "No" }
        ]
      }
    ],
    "outcomes": [
      { "serviceCode": "RA9048-CFN", "when": { "match": "any", "conditions": [
        { "field": "change_first_name", "operator": "equals", "value": "yes" },
        { "field": "correct_sex", "operator": "equals", "value": "yes" },
        { "field": "correct_birth_day_month", "operator": "equals", "value": "yes" }
      ] } },
      { "serviceCode": "RA9048-CCE", "when": { "match": "all", "conditions": [
        { "field": "change_first_name", "operator": "equals", "value": "no" },
        { "field": "correct_sex", "operator": "equals", "value": "no" },
        { "field": "correct_birth_day_month", "operator": "equals", "value": "no" },
        { "field": "correct_other", "operator": "equals", "value": "yes" }
      ] } }
    ]
  }
  $json$::jsonb;

  new_fields := $json$
  [
    {
      "key": "current_first_name",
      "type": "text",
      "label": "First name as currently recorded",
      "required": true,
      "visibleWhen": { "field": "change_first_name", "operator": "equals", "value": "yes" }
    },
    {
      "key": "new_first_name",
      "type": "text",
      "label": "New first name you want",
      "required": true,
      "visibleWhen": { "field": "change_first_name", "operator": "equals", "value": "yes" }
    },
    {
      "key": "first_name_ground",
      "type": "select",
      "label": "Why do you want to change the first name?",
      "required": true,
      "options": [
        { "value": "unbecoming", "label": "The current first name is ridiculous, dishonorable, or very hard to write or pronounce" },
        { "value": "habitual", "label": "I have habitually and continuously used the new name and am publicly known by it" },
        { "value": "avoid_confusion", "label": "The change will avoid confusion" }
      ],
      "visibleWhen": { "field": "change_first_name", "operator": "equals", "value": "yes" }
    },
    {
      "key": "employment_status",
      "type": "select",
      "label": "Are you currently employed?",
      "required": true,
      "helpText": "Employed petitioners need a certification from their employer. Others need an affidavit of non-employment or self-employment.",
      "options": [
        { "value": "employed", "label": "Yes, I have an employer" },
        { "value": "not_employed", "label": "No, I am self-employed or not employed" }
      ],
      "visibleWhen": { "field": "change_first_name", "operator": "equals", "value": "yes" }
    },
    {
      "key": "corrected_birth_date",
      "type": "date",
      "label": "Correct date of birth",
      "required": true,
      "dateDirection": "past",
      "helpText": "Only the day and month can be corrected. The year must match the record.",
      "visibleWhen": { "field": "correct_birth_day_month", "operator": "equals", "value": "yes" }
    },
    {
      "key": "record_type",
      "type": "select",
      "label": "Type of record with the error",
      "required": true,
      "options": [
        { "value": "birth", "label": "Birth Certificate" },
        { "value": "marriage", "label": "Marriage Certificate" },
        { "value": "death", "label": "Death Certificate" }
      ],
      "visibleWhen": { "field": "correct_other", "operator": "equals", "value": "yes" }
    },
    {
      "key": "other_entry",
      "type": "text",
      "label": "Which entry has the error?",
      "required": true,
      "placeholder": "e.g. Mother's maiden name, place of birth",
      "visibleWhen": { "field": "correct_other", "operator": "equals", "value": "yes" }
    },
    {
      "key": "other_current",
      "type": "text",
      "label": "How it is written now",
      "required": true,
      "visibleWhen": { "field": "correct_other", "operator": "equals", "value": "yes" }
    },
    {
      "key": "other_correct",
      "type": "text",
      "label": "How it should be written",
      "required": true,
      "visibleWhen": { "field": "correct_other", "operator": "equals", "value": "yes" }
    },
    {
      "key": "event_date",
      "type": "date",
      "label": "Date of the event on the record",
      "required": true,
      "dateDirection": "past",
      "helpText": "As currently written on the record. For a birth record, this is the date of birth."
    },
    {
      "key": "event_place",
      "type": "text",
      "label": "Place of the event on the record",
      "required": true,
      "placeholder": "e.g. Legazpi City, Albay"
    },
    {
      "key": "reference_number",
      "type": "text",
      "label": "Registry number (if known)",
      "required": false,
      "helpText": "Printed on your PSA or local civil registry copy."
    },
    {
      "key": "registered_in_legazpi",
      "type": "select",
      "label": "Is the record registered at the Legazpi City CCRO?",
      "required": true,
      "options": [
        { "value": "yes", "label": "Yes, registered in Legazpi City" },
        {
          "value": "no",
          "label": "No, registered in another city or municipality",
          "notice": {
            "variant": "warning",
            "title": "Record registered elsewhere",
            "description": "Petitions for records kept by another local civil registrar are handled differently. CCRO staff will confirm how to proceed when you submit.",
            "blocksProgress": false
          }
        },
        {
          "value": "unsure",
          "label": "I am not sure",
          "notice": {
            "variant": "default",
            "title": "Check your copy",
            "description": "The place of registration is printed on your PSA or local civil registry copy. You can also ask at the CCRO window.",
            "blocksProgress": false
          }
        }
      ]
    },
    {
      "key": "petitioner_relationship",
      "type": "select",
      "label": "Your relationship to the person named on the record",
      "required": true,
      "options": [
        { "value": "owner", "label": "I am the person named on the record" },
        { "value": "spouse", "label": "Spouse" },
        { "value": "child", "label": "Child" },
        { "value": "parent", "label": "Parent" },
        { "value": "sibling", "label": "Brother or sister" },
        { "value": "grandparent", "label": "Grandparent" },
        { "value": "guardian", "label": "Guardian" },
        { "value": "representative", "label": "Authorized representative" }
      ]
    }
  ]
  $json$::jsonb;

  select template.id, template.template_key, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'ra9048_10172';

  if found and template_row.definition->'caseSelector' is null then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      if section->>'step' = 'case' then
        -- Keep the shared "additional notes" block exactly as published.
        select coalesce(jsonb_agg(field), '[]'::jsonb)
        into preserved_fields
        from jsonb_array_elements(section->'fields') field
        where field->>'key' = 'additional_notes';

        section := jsonb_set(
          jsonb_set(section, '{fields}', new_fields || preserved_fields, true),
          '{title}',
          '"Petition details"'::jsonb,
          true
        );
      end if;
      new_sections := new_sections || jsonb_build_array(section);
    end loop;

    next_definition := jsonb_set(
      jsonb_set(template_row.definition, '{sections}', new_sections, true),
      '{caseSelector}',
      selector,
      true
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
