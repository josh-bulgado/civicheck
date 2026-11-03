-- Marriage on-time / delayed registration: name both spouses, and ask the two
-- case questions that actually change the checklist.
--
-- 1. A marriage certificate is about two people. Only MARRIAGE_LICENSE had
--    Bride/Groom party roles; on-time and delayed registration asked for a
--    single "Subject". Their requirements are all upload_scope = 'request', so
--    adding a second party does not duplicate any upload slot.
--
-- 2. On-time registration: was a license issued? A marriage without one
--    (Article 34, five years of cohabitation) needs an Affidavit of
--    Cohabitation. That row was optional for everyone; it is now required
--    exactly when the applicant answers "no license".
--
-- 3. Reconstruction: do the couple have children? The "birth certificates of
--    children" row was mandatory for every reconstruction. It now applies only
--    when the couple have children.
--
-- Published template versions are immutable, so each template gets a new
-- published version. Idempotent: skips a template that already has the field.

-- 1. Bride / Groom for the two registration services.
update public.services_registry
set party_roles = array['Bride', 'Groom']
where service_code in ('MARRIAGE_ONTIME', 'MARRIAGE_DELAYED')
  and party_roles is distinct from array['Bride', 'Groom'];

-- 2 & 3. Append the case question to each template's case step.
do $$
declare
  addition jsonb;
  additions jsonb := $json$
  [
    {
      "template_key": "marriage_ontime",
      "field": {
        "key": "marriage_license_basis",
        "type": "select",
        "label": "Was a marriage license issued for this marriage?",
        "required": true,
        "helpText": "A marriage without a license under Article 34 (the couple lived together as husband and wife for at least 5 years) also needs an Affidavit of Cohabitation.",
        "options": [
          { "value": "with_license", "label": "Yes, a marriage license was issued" },
          { "value": "article_34", "label": "No, exempt under Article 34 (lived together for at least 5 years)" }
        ]
      }
    },
    {
      "template_key": "marriage_delayed",
      "field": {
        "key": "has_children",
        "type": "select",
        "label": "Do the couple have children?",
        "required": true,
        "helpText": "If they do, the children's birth certificates are needed to show the correct date of marriage.",
        "options": [
          { "value": "yes", "label": "Yes" },
          { "value": "no", "label": "No" }
        ],
        "visibleWhen": {
          "field": "registration_type",
          "value": "reconstruction",
          "operator": "equals"
        }
      }
    }
  ]
  $json$::jsonb;
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for addition in select * from jsonb_array_elements(additions)
  loop
    select template.id, version.definition
    into target
    from public.form_templates template
    join public.form_template_versions version
      on version.id = template.active_version_id
    where template.template_key = addition->>'template_key';

    if found and not exists (
      select 1
      from jsonb_array_elements(target.definition->'sections') section,
        jsonb_array_elements(section->'fields') field
      where field->>'key' = addition->'field'->>'key'
    ) then
      select jsonb_set(
        target.definition,
        '{sections}',
        jsonb_agg(
          case when section->>'step' = 'case' then
            jsonb_set(
              section,
              '{fields}',
              (section->'fields') || jsonb_build_array(addition->'field'),
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
  end loop;
end
$$;

-- Affidavit of Cohabitation: required only for marriages without a license.
-- The bracketed prefix renders as a case chip in the checklist.
update public.service_requirements_metadata
set requirement_name = case
      when requirement_name like '[%' then requirement_name
      else '[Without a license] ' || requirement_name
    end,
    is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'marriage_license_basis',
        'operator', 'equals',
        'value', 'article_34'
      ))
    )
where service_code = 'MARRIAGE_ONTIME'
  and requirement_name ilike '%Affidavit of Cohabitation%';

-- Birth certificates of children: reconstruction AND the couple have children.
update public.service_requirements_metadata
set applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(
        jsonb_build_object(
          'field', 'registration_type',
          'operator', 'equals',
          'value', 'reconstruction'
        ),
        jsonb_build_object(
          'field', 'has_children',
          'operator', 'equals',
          'value', 'yes'
        )
      )
    )
where service_code = 'MARRIAGE_DELAYED'
  and requirement_name ilike '%Birth certificates of children%';
