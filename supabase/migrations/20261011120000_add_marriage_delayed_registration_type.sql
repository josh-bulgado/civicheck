-- Delayed registration vs. reconstruction of a marriage certificate.
--
-- The CCRO charter (item 8 / 8.1) treats both as one service with one fee, but
-- the checklists differ. Rather than splitting MARRIAGE_DELAYED into two
-- service codes, ask one question on the case step and branch the
-- requirements from the answer — the same approach as the death-disposal and
-- marriage-license conditions. The engine stays in code; only the question and
-- the applicability rules change here.
--
-- Charter mapping:
--   Delayed registration  : Marriage Certificate / Affidavit of Delayed
--                           Registration, Negative Result of Marriage
--   Reconstruction        : CENOMAR, Negative Result of Marriage, Certificate
--                           of Marriage/Matrimony, birth certificates of
--                           children, Affidavit of 2 Disinterested Persons

-- 1. Ask the question first on the case step. A new immutable version is
--    published; existing published versions are never edited.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  prepended_field jsonb;
begin
  prepended_field := $json$
  {
    "key": "registration_type",
    "type": "select",
    "label": "What do you need to register?",
    "required": true,
    "helpText": "This changes which documents you need.",
    "options": [
      { "value": "delayed", "label": "Delayed registration — the marriage was never registered" },
      { "value": "reconstruction", "label": "Reconstruction of a Marriage Certificate" }
    ]
  }
  $json$::jsonb;

  select template.id, version.definition
  into target
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'marriage_delayed';

  -- Idempotent: skip when the template is missing or already asks the question.
  if found and not exists (
    select 1
    from jsonb_array_elements(target.definition->'sections') section,
      jsonb_array_elements(section->'fields') field
    where field->>'key' = 'registration_type'
  ) then
    select jsonb_set(
      target.definition,
      '{sections}',
      jsonb_agg(
        case when section->>'step' = 'case' then
          jsonb_set(
            section,
            '{fields}',
            jsonb_build_array(prepended_field) || (section->'fields'),
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
  end if;
end
$$;

-- 2. Delayed-only document. Mandatory + rule: the documents step lists
--    mandatory and applicable requirements only. The bracketed prefix renders
--    as a case chip in the checklist instead of "Depends on case answers".
update public.service_requirements_metadata
set requirement_name = case
      when requirement_name like '[%' then requirement_name
      else '[Delayed registration] ' || requirement_name
    end,
    is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'registration_type', 'operator', 'equals', 'value', 'delayed'
      ))
    )
where service_code = 'MARRIAGE_DELAYED'
  and requirement_name ilike '%Duly Accomplished Marriage Certificate / Affidavit of Delayed Registration%';

-- 3. Reconstruction-only documents. The two "For reconstruction:" rows swap
--    that text prefix for the chip label; the other two gain it.
update public.service_requirements_metadata
set requirement_name = case
      when requirement_name like '[%' then requirement_name
      when requirement_name ilike 'For reconstruction:%'
        then regexp_replace(requirement_name, '^For reconstruction:\s*', '[Reconstruction] ', 'i')
      else '[Reconstruction] ' || requirement_name
    end,
    is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'registration_type', 'operator', 'equals', 'value', 'reconstruction'
      ))
    )
where service_code = 'MARRIAGE_DELAYED'
  and (
    requirement_name ilike '%CENOMAR%'
    or requirement_name ilike '%Certificate of Marriage/Matrimony%'
    or requirement_name ilike '%Birth certificates of children%'
    or requirement_name ilike '%Affidavit of 2 Disinterested Persons%'
  );

-- "Negative Result of Marriage" is required for both and stays unchanged.
