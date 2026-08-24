-- Publish live feedback for database-derived age bands.
-- Blocking notices are enforced by the same generic validator on the server.

do $$
declare
  template_row record;
  current_definition jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  derived_rules jsonb;
begin
  -- Delayed birth: show the calculated 0-79 / 80+ internal track.
  select template.*, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'birth_delayed';

  if found and not exists (
    select 1
    from jsonb_array_elements(
      coalesce(template_row.definition->'derivedAnswers', '[]'::jsonb)
    ) derived,
      jsonb_array_elements(derived->'bands') band
    where derived->>'key' = 'age' and band ? 'notice'
  ) then
    current_definition := template_row.definition;

    select jsonb_agg(
      case when derived->>'key' = 'age' then
        derived || jsonb_build_object(
          'bands', $json$
          [
            {
              "value": "0-79", "label": "0–79 years old",
              "minAge": 0, "maxAge": 79,
              "notice": {
                "variant": "default",
                "title": "Calculated registration track",
                "description": "The 0–79 delayed-registration process applies.",
                "blocksProgress": false
              }
            },
            {
              "value": "80+", "label": "80 years old and above",
              "minAge": 80,
              "notice": {
                "variant": "default",
                "title": "Calculated registration track",
                "description": "The 80+ delayed-registration process applies.",
                "blocksProgress": false
              }
            }
          ]
          $json$::jsonb
        )
      else derived end
    )
    into derived_rules
    from jsonb_array_elements(current_definition->'derivedAnswers') derived;

    next_definition := jsonb_set(
      current_definition, '{derivedAnswers}', derived_rules, true
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

  -- Marriage: show the exact calculated age for both parties, explain the
  -- consent/advice consequence, and stop this configured workflow under 18.
  select template.*, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'marriage_license';

  if found and not exists (
    select 1
    from jsonb_array_elements(
      coalesce(template_row.definition->'derivedAnswers', '[]'::jsonb)
    ) derived,
      jsonb_array_elements(derived->'bands') band
    where derived->>'key' = 'bride_age_bracket'
      and band->>'value' = 'under_18'
  ) then
    current_definition := template_row.definition;

    select jsonb_agg(
      case when derived->>'key' in (
        'bride_age_bracket', 'groom_age_bracket'
      ) then
        derived || jsonb_build_object(
          'bands', $json$
          [
            {
              "value": "under_18", "label": "Under 18 years old",
              "minAge": 0, "maxAge": 17,
              "notice": {
                "variant": "destructive",
                "title": "Applicant is under 18",
                "description": "This case does not fit the configured Marriage License workflow. Correct the birth date or contact the CCRO for guidance.",
                "blocksProgress": true
              }
            },
            {
              "value": "18_20", "label": "18–20 years old",
              "minAge": 18, "maxAge": 20,
              "notice": {
                "variant": "warning",
                "title": "Parental consent requirements apply",
                "description": "The checklist will include the documents configured for applicants aged 18–20.",
                "blocksProgress": false
              }
            },
            {
              "value": "21_24", "label": "21–24 years old",
              "minAge": 21, "maxAge": 24,
              "notice": {
                "variant": "warning",
                "title": "Parental advice requirements apply",
                "description": "The checklist will include the documents configured for applicants aged 21–24.",
                "blocksProgress": false
              }
            },
            {
              "value": "25_plus", "label": "25 years old or above",
              "minAge": 25
            }
          ]
          $json$::jsonb
        )
      else derived end
    )
    into derived_rules
    from jsonb_array_elements(current_definition->'derivedAnswers') derived;

    next_definition := jsonb_set(
      current_definition, '{derivedAnswers}', derived_rules, true
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
