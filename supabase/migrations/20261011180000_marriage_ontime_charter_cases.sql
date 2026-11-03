-- Align on-time marriage registration with Citizen's Charter item 7:
--
--   "registering a Certificate of Marriage solemnized in Legazpi City within
--    fifteen (15) days with Marriage License and thirty (30) days with
--    Affidavit of Cohabitation / P.D. 1083"
--
-- 1. Three cases, not two: with a license (15 days), Article 34 (30 days, plus
--    the Affidavit of Cohabitation), and P.D. 1083 (30 days, no extra document
--    listed in the charter).
-- 2. The on-time window follows the case. windowDays stays 30 as the fallback
--    until the license question is answered.
-- 3. Only marriages solemnized in Legazpi City are registered here, so ask, and
--    stop the application when the answer is "no".
-- 4. The delayed track's back-to-on-time check can't see the license answer, so
--    it uses 15 days, the one window that is on-time in every case.
--
-- Published versions are immutable, so each template gets a new version.
-- Idempotent: each template is skipped once it carries its change.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  legazpi_field jsonb := $json$
  {
    "key": "solemnized_in_legazpi",
    "type": "select",
    "label": "Was the marriage solemnized in Legazpi City?",
    "required": true,
    "options": [
      { "value": "yes", "label": "Yes" },
      {
        "value": "no",
        "label": "No",
        "notice": {
          "variant": "destructive",
          "title": "We can only register marriages solemnized in Legazpi City",
          "description": "On-time registration here covers marriages solemnized in Legazpi City. Register at the Local Civil Registrar of the city or municipality where the marriage took place.",
          "blocksProgress": true
        }
      }
    ]
  }
  $json$::jsonb;
  pd_option jsonb := $json$
  {
    "value": "pd_1083",
    "label": "No, a marriage under P.D. 1083 (Code of Muslim Personal Laws)"
  }
  $json$::jsonb;
begin
  -- On-time registration.
  select template.id, version.definition
  into target
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'marriage_ontime';

  if found and not exists (
    select 1
    from jsonb_array_elements(target.definition->'sections') section,
      jsonb_array_elements(section->'fields') field
    where field->>'key' = 'solemnized_in_legazpi'
  ) then
    next_definition := jsonb_set(
      target.definition,
      '{eventTiming}',
      (target.definition->'eventTiming') || jsonb_build_object(
        'windowDays', 30,
        'windowDaysByAnswer', jsonb_build_object(
          'field', 'marriage_license_basis',
          'values', jsonb_build_object(
            'with_license', 15,
            'article_34', 30,
            'pd_1083', 30
          )
        ),
        'title', 'This date is outside the on-time window',
        'description', 'A marriage with a license is registered on time within 15 days; one without a license (Article 34 or P.D. 1083) within 30 days. Use the registration track that matches the marriage date.'
      ),
      true
    );

    select jsonb_set(
      next_definition,
      '{sections}',
      jsonb_agg(
        case when section->>'step' = 'case' then
          jsonb_set(
            section,
            '{fields}',
            (
              select jsonb_agg(item.field order by item.sort_key)
              from (
                select
                  case when f.field->>'key' = 'marriage_license_basis' then
                    f.field || jsonb_build_object(
                      'helpText', 'With a license, a marriage is registered on time within 15 days. Without one (Article 34 or P.D. 1083) the window is 30 days, and Article 34 also needs an Affidavit of Cohabitation.',
                      'options', (f.field->'options') || jsonb_build_array(pd_option)
                    )
                  else f.field end as field,
                  f.ord::numeric as sort_key
                from jsonb_array_elements(section->'fields')
                  with ordinality as f(field, ord)
                union all
                select
                  legazpi_field,
                  (
                    select o.ord::numeric + 0.5
                    from jsonb_array_elements(section->'fields')
                      with ordinality as o(fld, ord)
                    where o.fld->>'key' = 'marriage_license_basis'
                  )
              ) item
            ),
            true
          )
        else section end
        order by section_ordinality
      ),
      true
    )
    into next_definition
    from jsonb_array_elements(next_definition->'sections')
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

  -- Delayed registration: the "you are actually on time" check.
  select template.id, version.definition
  into target
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'marriage_delayed';

  if found
    and target.definition->'eventTiming' is not null
    and (target.definition->'eventTiming'->>'windowDays')::integer <> 15
  then
    next_definition := jsonb_set(
      target.definition,
      '{eventTiming}',
      (target.definition->'eventTiming') || jsonb_build_object(
        'windowDays', 15,
        'title', 'This date is within the 15-day on-time window',
        'description', 'A marriage registered within 15 days of the ceremony is on-time registration. Use the registration track that matches the marriage date.'
      ),
      true
    );

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
