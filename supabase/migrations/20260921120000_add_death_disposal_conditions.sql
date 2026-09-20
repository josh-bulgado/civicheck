-- Death registration: branch the burial/cremation documents from a single
-- inline question instead of always listing every certificate.
--
-- Both death services share the same case (how the remains were disposed of),
-- so the question, the sub-question, and the requirement rules are configured
-- identically for DEATH_ONTIME and DEATH_DELAYED. The engine stays in code;
-- only the questions, answer values, and applicability rules change here.

-- 1. Ask the disposal question (and, when buried, the embalmed sub-question)
--    on the case step. A new immutable version is published per template.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  appended_fields jsonb;
begin
  appended_fields := $json$
  [
    {
      "key": "disposal_method",
      "type": "select",
      "label": "How were the remains disposed of?",
      "required": true,
      "helpText": "This changes which certificates you need to upload.",
      "options": [
        { "value": "buried", "label": "Buried" },
        { "value": "cremated", "label": "Cremated" }
      ]
    },
    {
      "key": "embalmed",
      "type": "select",
      "label": "Were the remains embalmed?",
      "required": true,
      "helpText": "If the remains were not embalmed, a Certification of Not Embalmed is also required.",
      "options": [
        { "value": "yes", "label": "Yes" },
        { "value": "no", "label": "No" }
      ],
      "visibleWhen": {
        "field": "disposal_method",
        "operator": "equals",
        "value": "buried"
      }
    }
  ]
  $json$::jsonb;

  for target in
    select template.id, template.template_key, version.definition
    from public.form_templates template
    join public.form_template_versions version
      on version.id = template.active_version_id
    where template.template_key in ('death_ontime', 'death_delayed')
  loop
    -- Idempotent: skip a template that already asks the question.
    if exists (
      select 1
      from jsonb_array_elements(target.definition->'sections') section,
        jsonb_array_elements(section->'fields') field
      where field->>'key' = 'disposal_method'
    ) then
      continue;
    end if;

    select jsonb_set(
      target.definition,
      '{sections}',
      jsonb_agg(
        case when section->>'step' = 'case' then
          jsonb_set(
            section,
            '{fields}',
            (section->'fields') || appended_fields,
            true
          )
        else section end
        order by section_ordinality
      ),
      true
    )
    into next_definition
    from jsonb_array_elements(target.definition->'sections')
      with ordinality as sections(section, section_ordinality);

    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions
    where template_id = target.id;

    insert into public.form_template_versions (
      template_id, version, status, definition, published_at
    ) values (
      target.id, next_version, 'published', next_definition, now()
    ) returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = target.id;
  end loop;
end
$$;

-- 2. Burial Certificate applies only when the remains were buried. DEATH_ONTIME
--    did not previously list one, so insert it; DEATH_DELAYED already has it.
insert into public.service_requirements_metadata (
  service_code, requirement_name, is_mandatory, requirement_group,
  case_tag, applies_when, requires_upload, upload_scope
)
select
  'DEATH_ONTIME',
  'Burial Certificate, 1 original copy — secure from the cemetery or church where the deceased was buried',
  true,
  'DEATH_ONTIME',
  null,
  jsonb_build_object(
    'match', 'all',
    'conditions', jsonb_build_array(jsonb_build_object(
      'field', 'disposal_method', 'operator', 'equals', 'value', 'buried'
    ))
  ),
  true,
  'request'
where not exists (
  select 1
  from public.service_requirements_metadata
  where service_code = 'DEATH_ONTIME'
    and requirement_name ilike 'Burial Certificate%'
);

-- 3. Wire the three conditional documents to the case answers. They must also
--    be mandatory so the documents step renders them as upload slots when the
--    rule matches (the step lists mandatory + applicable requirements only).
update public.service_requirements_metadata
set is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'disposal_method', 'operator', 'equals', 'value', 'buried'
      ))
    )
where service_code in ('DEATH_ONTIME', 'DEATH_DELAYED')
  and requirement_name ilike 'Burial Certificate%';

update public.service_requirements_metadata
set is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'disposal_method', 'operator', 'equals', 'value', 'cremated'
      ))
    )
where service_code in ('DEATH_ONTIME', 'DEATH_DELAYED')
  and requirement_name ilike 'Certificate of Cremation%';

update public.service_requirements_metadata
set is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(
        jsonb_build_object(
          'field', 'disposal_method', 'operator', 'equals', 'value', 'buried'
        ),
        jsonb_build_object(
          'field', 'embalmed', 'operator', 'equals', 'value', 'no'
        )
      )
    )
where service_code in ('DEATH_ONTIME', 'DEATH_DELAYED')
  and requirement_name ilike 'Certification of Not Embalmed%';
