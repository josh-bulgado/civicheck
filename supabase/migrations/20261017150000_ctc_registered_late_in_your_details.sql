-- CTC issuance: ask "registered late?" in "Your details", with the owner's
-- information.
--
-- On the CCRO's Verification Form "Registered late? ... If yes, when?" sits in
-- the owner's personal information, right after the parents. Both fields move
-- from the case step to the details step, directly after the father's name. A
-- field can only depend on another field in the same step, so the birth-only
-- rule is dropped (the fields are optional and show for every record type); the
-- "when" field still appears only when the answer is Yes.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep the answers they gave under the version they were submitted
-- against. Idempotent.

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
  late_fields constant jsonb := jsonb_build_array(
    jsonb_build_object(
      'key', 'registered_late',
      'type', 'select',
      'label', 'Was the birth registered late?',
      'required', false,
      'options', jsonb_build_array(
        jsonb_build_object('value', 'no', 'label', 'No'),
        jsonb_build_object('value', 'yes', 'label', 'Yes')
      )
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
    where s->>'step' = 'details' and f->>'key' = 'registered_late'
  ) then
    return;
  end if;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' not in ('registered_late', 'registered_late_when') then
          new_fields := new_fields || jsonb_build_array(field);
        end if;
      end loop;
      section := jsonb_set(section, '{fields}', new_fields, true);
    elsif section->>'step' = 'details' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        new_fields := new_fields || jsonb_build_array(field);
        if field->>'key' = 'father_name' then
          new_fields := new_fields || late_fields;
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
