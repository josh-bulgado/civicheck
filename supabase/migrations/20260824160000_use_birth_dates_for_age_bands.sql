-- Replace applicant-selected age brackets with date-of-birth fields.
--
-- Age-band boundaries and their source/reference fields remain versioned form
-- data. The application recalculates these derived answers on both client and
-- server, so submitted bracket strings are never trusted.

do $$
declare
  template_row record;
  current_definition jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  next_selector jsonb;
  next_sections jsonb;
  derived_rules jsonb;
begin
  -- Delayed COLB already collects the date of birth as event_date. Remove the
  -- age radio question and derive its 0-79 / 80+ routing value from that date.
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
    ) derived
    where derived->>'key' = 'age'
  ) then
    current_definition := template_row.definition;

    select jsonb_set(
      current_definition->'caseSelector',
      '{questions}',
      coalesce(jsonb_agg(question order by question_ordinality)
        filter (where question->>'key' <> 'age'), '[]'::jsonb),
      true
    )
    into next_selector
    from jsonb_array_elements(current_definition->'caseSelector'->'questions')
      with ordinality as questions(question, question_ordinality);

    select jsonb_agg(
      case when section->>'step' = 'case' then
        jsonb_set(
          section,
          '{fields}',
          (
            select jsonb_agg(
              case when field->>'key' = 'event_date' then
                field || jsonb_build_object(
                  'helpText',
                  'We calculate the correct 0-79 or 80+ registration track from this date.'
                )
              else field end
              order by field_ordinality
            )
            from jsonb_array_elements(section->'fields')
              with ordinality as fields(field, field_ordinality)
          ),
          true
        )
      else section end
      order by section_ordinality
    )
    into next_sections
    from jsonb_array_elements(current_definition->'sections')
      with ordinality as sections(section, section_ordinality);

    derived_rules := coalesce(current_definition->'derivedAnswers', '[]'::jsonb)
      || $json$
      [{
        "key": "age",
        "label": "Age at registration",
        "kind": "age_band",
        "dateField": "event_date",
        "required": true,
        "bands": [
          { "value": "0-79", "label": "0–79 years old", "minAge": 0, "maxAge": 79 },
          { "value": "80+", "label": "80 years old and above", "minAge": 80 }
        ]
      }]
      $json$::jsonb;

    next_definition := jsonb_set(
      jsonb_set(
        jsonb_set(current_definition, '{caseSelector}', next_selector, true),
        '{sections}', next_sections, true
      ),
      '{derivedAnswers}', derived_rules, true
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

  -- Marriage License derives each party's age on the intended marriage date.
  -- The rules continue to use bride_age_bracket/groom_age_bracket, but those
  -- values are now calculated rather than selected by the applicant.
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
    ) derived
    where derived->>'key' = 'bride_age_bracket'
  ) then
    current_definition := template_row.definition;

    select jsonb_agg(
      case when section->>'step' = 'case' then
        jsonb_set(
          section,
          '{fields}',
          (
            select jsonb_agg(
              case field->>'key'
                when 'bride_age_bracket' then jsonb_build_object(
                  'key', 'bride_date_of_birth',
                  'type', 'date',
                  'label', 'Bride''s date of birth',
                  'required', true,
                  'dateDirection', 'past',
                  'helpText', 'Age is calculated on the intended marriage date.'
                )
                when 'groom_age_bracket' then jsonb_build_object(
                  'key', 'groom_date_of_birth',
                  'type', 'date',
                  'label', 'Groom''s date of birth',
                  'required', true,
                  'dateDirection', 'past',
                  'helpText', 'Age is calculated on the intended marriage date.'
                )
                else field
              end
              order by field_ordinality
            )
            from jsonb_array_elements(section->'fields')
              with ordinality as fields(field, field_ordinality)
          ),
          true
        )
      else section end
      order by section_ordinality
    )
    into next_sections
    from jsonb_array_elements(current_definition->'sections')
      with ordinality as sections(section, section_ordinality);

    derived_rules := coalesce(current_definition->'derivedAnswers', '[]'::jsonb)
      || $json$
      [
        {
          "key": "bride_age_bracket",
          "label": "Bride’s age on the intended marriage date",
          "kind": "age_band",
          "dateField": "bride_date_of_birth",
          "referenceDateField": "event_date",
          "required": true,
          "bands": [
            { "value": "18_20", "label": "18–20 years old", "minAge": 18, "maxAge": 20 },
            { "value": "21_24", "label": "21–24 years old", "minAge": 21, "maxAge": 24 },
            { "value": "25_plus", "label": "25 years old or above", "minAge": 25 }
          ]
        },
        {
          "key": "groom_age_bracket",
          "label": "Groom’s age on the intended marriage date",
          "kind": "age_band",
          "dateField": "groom_date_of_birth",
          "referenceDateField": "event_date",
          "required": true,
          "bands": [
            { "value": "18_20", "label": "18–20 years old", "minAge": 18, "maxAge": 20 },
            { "value": "21_24", "label": "21–24 years old", "minAge": 21, "maxAge": 24 },
            { "value": "25_plus", "label": "25 years old or above", "minAge": 25 }
          ]
        }
      ]
      $json$::jsonb;

    next_definition := jsonb_set(
      jsonb_set(current_definition, '{sections}', next_sections, true),
      '{derivedAnswers}', derived_rules, true
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

  -- On-time registration already uses the shared event-date picker. Publish a
  -- clearer database hint without introducing a redundant age question.
  select template.*, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'birth_ontime';

  if found and not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') section,
      jsonb_array_elements(section->'fields') field
    where field->>'key' = 'event_date'
      and field->>'helpText' =
        'We use this date to confirm whether the registration is on time.'
  ) then
    current_definition := template_row.definition;

    select jsonb_agg(
      case when section->>'step' = 'case' then
        jsonb_set(
          section,
          '{fields}',
          (
            select jsonb_agg(
              case when field->>'key' = 'event_date' then
                field || jsonb_build_object(
                  'helpText',
                  'We use this date to confirm whether the registration is on time.'
                )
              else field end
              order by field_ordinality
            )
            from jsonb_array_elements(section->'fields')
              with ordinality as fields(field, field_ordinality)
          ),
          true
        )
      else section end
      order by section_ordinality
    )
    into next_sections
    from jsonb_array_elements(current_definition->'sections')
      with ordinality as sections(section, section_ordinality);

    next_definition := jsonb_set(
      current_definition, '{sections}', next_sections, true
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
