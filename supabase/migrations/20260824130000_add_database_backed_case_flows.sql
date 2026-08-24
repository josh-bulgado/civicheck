-- Database-backed service routing and requirement applicability.
--
-- The generic evaluator remains application code, while the questions,
-- answer values, branching, service outcomes, and requirement rules are
-- versioned data. Existing service codes remain stable for requests, fees,
-- party roles, and reporting.

alter table public.service_requirements_metadata
  add column applies_when jsonb;

alter table public.service_requirements_metadata
  add constraint service_requirements_applies_when_object
  check (applies_when is null or jsonb_typeof(applies_when) = 'object');

comment on column public.service_requirements_metadata.applies_when is
  'Condition rule evaluated against case-selector and published form answers. Shape: {match: all|any, conditions: [{field, operator, value}]}. Null means always applies or legacy case_tag fallback.';

-- Convert the existing birth tags to explicit answer rules. The foreign-parent
-- field is added to the delayed-birth form below.
update public.service_requirements_metadata
set applies_when = jsonb_build_object(
  'match', 'all',
  'conditions', jsonb_build_array(jsonb_build_object(
    'field', case case_tag
      when 'marital_only' then 'marital'
      when 'non_marital_only' then 'marital'
      when 'brap_only' then 'program'
      when 'foreigner_only' then 'has_foreign_parent'
    end,
    'operator', 'equals',
    'value', case case_tag
      when 'marital_only' then 'marital'
      when 'non_marital_only' then 'non-marital'
      when 'brap_only' then 'brap'
      when 'foreigner_only' then 'yes'
    end
  ))
)
where requirement_group in ('birth_delayed', 'birth_ontime')
  and case_tag in (
    'marital_only', 'non_marital_only', 'brap_only', 'foreigner_only'
  );

-- Standardize the misspelled live tag while applies_when becomes authoritative.
update public.service_requirements_metadata
set case_tag = 'foreign_national_spouse'
where service_code = 'MARRIAGE_LICENSE'
  and case_tag = 'foriegn_national_spouse';

-- Marriage-license rules can match either applicant without multiplying the
-- service into every age/nationality combination.
update public.service_requirements_metadata
set applies_when = jsonb_build_object(
  'match', 'any',
  'conditions', jsonb_build_array(
    jsonb_build_object(
      'field', 'bride_age_bracket', 'operator', 'equals', 'value', '18_20'
    ),
    jsonb_build_object(
      'field', 'groom_age_bracket', 'operator', 'equals', 'value', '18_20'
    )
  )
)
where service_code = 'MARRIAGE_LICENSE'
  and case_tag = 'parental_consent_required';

update public.service_requirements_metadata
set applies_when = jsonb_build_object(
  'match', 'any',
  'conditions', jsonb_build_array(
    jsonb_build_object(
      'field', 'bride_age_bracket', 'operator', 'equals', 'value', '21_24'
    ),
    jsonb_build_object(
      'field', 'groom_age_bracket', 'operator', 'equals', 'value', '21_24'
    )
  )
)
where service_code = 'MARRIAGE_LICENSE'
  and case_tag = 'parental_advice_required';

update public.service_requirements_metadata
set applies_when = jsonb_build_object(
  'match', 'any',
  'conditions', jsonb_build_array(
    jsonb_build_object(
      'field', 'bride_nationality', 'operator', 'equals', 'value', 'foreign'
    ),
    jsonb_build_object(
      'field', 'groom_nationality', 'operator', 'equals', 'value', 'foreign'
    )
  )
)
where service_code = 'MARRIAGE_LICENSE'
  and case_tag = 'foreign_national_spouse';

update public.service_requirements_metadata
set applies_when = jsonb_build_object(
  'match', 'any',
  'conditions', jsonb_build_array(
    jsonb_build_object(
      'field', 'bride_civil_status', 'operator', 'equals', 'value', 'widowed'
    ),
    jsonb_build_object(
      'field', 'groom_civil_status', 'operator', 'equals', 'value', 'widowed'
    )
  )
)
where service_code = 'MARRIAGE_LICENSE'
  and requirement_name ilike 'Death Certificate of spouse%';

update public.service_requirements_metadata
set applies_when = jsonb_build_object(
  'match', 'any',
  'conditions', jsonb_build_array(
    jsonb_build_object(
      'field', 'bride_civil_status', 'operator', 'equals', 'value', 'annulled_divorced'
    ),
    jsonb_build_object(
      'field', 'groom_civil_status', 'operator', 'equals', 'value', 'annulled_divorced'
    )
  )
)
where service_code = 'MARRIAGE_LICENSE'
  and requirement_name ilike 'Original/Certified True Copy of Judicial Decree%';

-- A license application is not a request for a copy of an existing record.
update public.services_registry
set asks_purpose = false
where service_code = 'MARRIAGE_LICENSE';

do $$
declare
  template_row record;
  current_definition jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  selector jsonb;
  appended_fields jsonb;
begin
  -- Delayed COLB: age x program x marital status -> six internal variants.
  selector := $json$
  {
    "title": "Find the right delayed-registration service",
    "description": "Answer these questions so we can apply the correct fee, parties, process, and requirements.",
    "questions": [
      {
        "key": "age",
        "label": "Age of the person to be registered",
        "options": [
          { "value": "0-79", "label": "0–79 years old" },
          { "value": "80+", "label": "80 years old and above" }
        ]
      },
      {
        "key": "program",
        "label": "Registration program",
        "options": [
          { "value": "brap", "label": "BRAP-assisted registration" },
          { "value": "normal", "label": "Standard registration" }
        ],
        "visibleWhen": {
          "match": "any",
          "conditions": [
            { "field": "age", "operator": "equals", "value": "0-79" },
            { "field": "age", "operator": "equals", "value": "80+" }
          ]
        }
      },
      {
        "key": "marital",
        "label": "Are the child’s parents legally married?",
        "options": [
          { "value": "marital", "label": "Yes" },
          { "value": "non-marital", "label": "No" }
        ],
        "visibleWhen": {
          "match": "all",
          "conditions": [
            { "field": "program", "operator": "equals", "value": "normal" }
          ]
        }
      }
    ],
    "outcomes": [
      { "serviceCode": "DCOLB-0079-BRAP", "when": { "match": "all", "conditions": [
        { "field": "age", "operator": "equals", "value": "0-79" },
        { "field": "program", "operator": "equals", "value": "brap" }
      ] } },
      { "serviceCode": "DCOLB-0079-NORMAL-MARITAL", "when": { "match": "all", "conditions": [
        { "field": "age", "operator": "equals", "value": "0-79" },
        { "field": "program", "operator": "equals", "value": "normal" },
        { "field": "marital", "operator": "equals", "value": "marital" }
      ] } },
      { "serviceCode": "DCOLB-0079-NORMAL-NONMARITAL", "when": { "match": "all", "conditions": [
        { "field": "age", "operator": "equals", "value": "0-79" },
        { "field": "program", "operator": "equals", "value": "normal" },
        { "field": "marital", "operator": "equals", "value": "non-marital" }
      ] } },
      { "serviceCode": "DCOLB-80UP-BRAP", "when": { "match": "all", "conditions": [
        { "field": "age", "operator": "equals", "value": "80+" },
        { "field": "program", "operator": "equals", "value": "brap" }
      ] } },
      { "serviceCode": "DCOLB-80UP-NORMAL-MARITAL", "when": { "match": "all", "conditions": [
        { "field": "age", "operator": "equals", "value": "80+" },
        { "field": "program", "operator": "equals", "value": "normal" },
        { "field": "marital", "operator": "equals", "value": "marital" }
      ] } },
      { "serviceCode": "DCOLB-80UP-NORMAL-NONMARITAL", "when": { "match": "all", "conditions": [
        { "field": "age", "operator": "equals", "value": "80+" },
        { "field": "program", "operator": "equals", "value": "normal" },
        { "field": "marital", "operator": "equals", "value": "non-marital" }
      ] } }
    ]
  }
  $json$::jsonb;

  select template.*, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'birth_delayed';

  if found and template_row.definition->'caseSelector' is null then
    current_definition := template_row.definition;
    appended_fields := $json$
      [{
        "key": "has_foreign_parent",
        "type": "select",
        "label": "Is either parent a foreign national?",
        "required": true,
        "options": [
          { "value": "yes", "label": "Yes" },
          { "value": "no", "label": "No" }
        ]
      }]
    $json$::jsonb;

    select jsonb_set(
      jsonb_set(current_definition, '{caseSelector}', selector, true),
      '{sections}',
      jsonb_agg(
        case when section->>'step' = 'case' then
          jsonb_set(section, '{fields}', (section->'fields') || appended_fields, true)
        else section end
        order by section_ordinality
      ),
      true
    )
    into next_definition
    from jsonb_array_elements(current_definition->'sections')
      with ordinality as sections(section, section_ordinality);

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

  -- On-time COLB: marital status -> two internal variants.
  selector := $json$
  {
    "title": "Find the right on-time registration service",
    "description": "Select the child’s case so we can apply the correct fee, parties, and requirements.",
    "questions": [{
      "key": "marital",
      "label": "Are the child’s parents legally married?",
      "options": [
        { "value": "marital", "label": "Yes" },
        { "value": "non-marital", "label": "No" }
      ]
    }],
    "outcomes": [
      { "serviceCode": "OTCOLB-MARITAL", "when": { "match": "all", "conditions": [
        { "field": "marital", "operator": "equals", "value": "marital" }
      ] } },
      { "serviceCode": "OTCOLB-NONMARITAL", "when": { "match": "all", "conditions": [
        { "field": "marital", "operator": "equals", "value": "non-marital" }
      ] } }
    ]
  }
  $json$::jsonb;

  select template.*, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'birth_ontime';

  if found and template_row.definition->'caseSelector' is null then
    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions
    where template_id = template_row.id;

    insert into public.form_template_versions (
      template_id, version, status, definition, published_at
    ) values (
      template_row.id,
      next_version,
      'published',
      jsonb_set(template_row.definition, '{caseSelector}', selector, true),
      now()
    ) returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end if;

  -- Marriage License stays one service. Its requirements branch from each
  -- applicant's age, nationality, and civil status.
  appended_fields := $json$
  [
    {
      "key": "bride_age_bracket", "type": "select",
      "label": "Bride’s age bracket on the intended marriage date", "required": true,
      "options": [
        { "value": "18_20", "label": "18–20 years old" },
        { "value": "21_24", "label": "21–24 years old" },
        { "value": "25_plus", "label": "25 years old or above" }
      ]
    },
    {
      "key": "groom_age_bracket", "type": "select",
      "label": "Groom’s age bracket on the intended marriage date", "required": true,
      "options": [
        { "value": "18_20", "label": "18–20 years old" },
        { "value": "21_24", "label": "21–24 years old" },
        { "value": "25_plus", "label": "25 years old or above" }
      ]
    },
    {
      "key": "bride_nationality", "type": "select",
      "label": "Bride’s nationality", "required": true,
      "options": [
        { "value": "filipino", "label": "Filipino" },
        { "value": "foreign", "label": "Foreign national" }
      ]
    },
    {
      "key": "groom_nationality", "type": "select",
      "label": "Groom’s nationality", "required": true,
      "options": [
        { "value": "filipino", "label": "Filipino" },
        { "value": "foreign", "label": "Foreign national" }
      ]
    },
    {
      "key": "bride_civil_status", "type": "select",
      "label": "Bride’s current civil status", "required": true,
      "options": [
        { "value": "single", "label": "Single" },
        { "value": "widowed", "label": "Widowed" },
        { "value": "annulled_divorced", "label": "Annulled or divorced" }
      ]
    },
    {
      "key": "groom_civil_status", "type": "select",
      "label": "Groom’s current civil status", "required": true,
      "options": [
        { "value": "single", "label": "Single" },
        { "value": "widowed", "label": "Widowed" },
        { "value": "annulled_divorced", "label": "Annulled or divorced" }
      ]
    }
  ]
  $json$::jsonb;

  select template.*, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'marriage_license';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') section,
      jsonb_array_elements(section->'fields') field
    where field->>'key' = 'bride_age_bracket'
  ) then
    current_definition := template_row.definition;
    select jsonb_set(
      current_definition,
      '{sections}',
      jsonb_agg(
        case when section->>'step' = 'case' then
          jsonb_set(
            section,
            '{fields}',
            coalesce((
              select jsonb_agg(field order by field_ordinality)
              from jsonb_array_elements(section->'fields')
                with ordinality as fields(field, field_ordinality)
              where field->>'key' not in ('purpose', 'purpose_other')
            ), '[]'::jsonb) || appended_fields,
            true
          )
        else section end
        order by section_ordinality
      ),
      true
    )
    into next_definition
    from jsonb_array_elements(current_definition->'sections')
      with ordinality as sections(section, section_ordinality);

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
