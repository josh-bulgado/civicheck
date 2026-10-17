-- CTC issuance: follow the CCRO's marriage and death application forms for the
-- owner's information, the same way birth follows the birth form.
--
--   Birth     full name, date/place of birth, mother, father, registered late
--   Death     full name of the deceased, date/place of death, registered late
--   Marriage  name of husband, maiden name of wife, date/place of marriage,
--             registered late
--   Other     full name, and the generic date/place on the record (optional)
--
-- The requester's block is the same on all three paper forms, so it is unchanged.
-- The owner's name boxes get a heading that names whose name it is, and the
-- parents show for Birth only. The spouse's full name (marriage) is replaced by
-- the husband/wife fields. "Registered late?" is on all three forms, so it shows
-- for every record type except "Other", with wording that does not say "birth".
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep the answers they gave under the version they were submitted
-- against. Idempotent.

do $$
declare
  template_row record;
  section jsonb;
  new_sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  all_fields jsonb;
  when_type constant text := 'record_type';
  f_record_type jsonb;
  f_record_type_other jsonb;
  f_notes jsonb;
  f_event_date jsonb;
  f_event_place jsonb;
  f_record_date jsonb;
  f_record_place jsonb;
  f_subjects jsonb;
  f_mother jsonb;
  f_father jsonb;
  f_late jsonb;
  f_late_when jsonb;
  case_fields jsonb;
  owner_fields jsonb;
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
    where f->>'key' = 'death_date'
  ) then
    return;
  end if;

  select jsonb_agg(f)
  into all_fields
  from jsonb_array_elements(template_row.definition->'sections') s,
    jsonb_array_elements(s->'fields') f;

  select f into f_record_type from jsonb_array_elements(all_fields) f where f->>'key' = 'record_type';
  select f into f_record_type_other from jsonb_array_elements(all_fields) f where f->>'key' = 'record_type_other';
  select f into f_notes from jsonb_array_elements(all_fields) f where f->>'key' = 'additional_notes';
  select f into f_event_date from jsonb_array_elements(all_fields) f where f->>'key' = 'event_date';
  select f into f_event_place from jsonb_array_elements(all_fields) f where f->>'key' = 'event_place';
  select f into f_record_date from jsonb_array_elements(all_fields) f where f->>'key' = 'record_date';
  select f into f_record_place from jsonb_array_elements(all_fields) f where f->>'key' = 'record_place';
  select f into f_subjects from jsonb_array_elements(all_fields) f where f->>'key' = 'subjects';
  select f into f_mother from jsonb_array_elements(all_fields) f where f->>'key' = 'mother_maiden_name';
  select f into f_father from jsonb_array_elements(all_fields) f where f->>'key' = 'father_name';
  select f into f_late from jsonb_array_elements(all_fields) f where f->>'key' = 'registered_late';
  select f into f_late_when from jsonb_array_elements(all_fields) f where f->>'key' = 'registered_late_when';

  case_fields := jsonb_build_array(
    f_record_type,
    f_record_type_other,
    f_record_date || jsonb_build_object(
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'other')
    ),
    f_record_place || jsonb_build_object(
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'other')
    ),
    f_notes
  );

  owner_fields := jsonb_build_array(
    f_subjects || jsonb_build_object(
      'labelByAnswer', jsonb_build_object(
        'field', when_type,
        'labels', jsonb_build_object(
          'birth', 'Full name',
          'death', 'Full name of the deceased',
          'marriage', 'Name of husband',
          'other', 'Full name of the person named on the record'
        )
      )
    ),
    jsonb_build_object(
      'key', 'wife_maiden_name',
      'type', 'text',
      'label', 'Maiden name of wife',
      'required', true,
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'marriage')
    ),
    f_event_date,
    f_event_place,
    (f_event_date - 'visibleWhen') || jsonb_build_object(
      'key', 'death_date',
      'label', 'Date of death',
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'death')
    ),
    (f_event_place - 'visibleWhen') || jsonb_build_object(
      'key', 'death_place',
      'label', 'Place of death',
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'death')
    ),
    (f_event_date - 'visibleWhen') || jsonb_build_object(
      'key', 'marriage_date',
      'label', 'Date of marriage',
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'marriage')
    ),
    (f_event_place - 'visibleWhen') || jsonb_build_object(
      'key', 'marriage_place',
      'label', 'Place of marriage',
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'marriage')
    ),
    f_mother || jsonb_build_object(
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'birth')
    ),
    f_father || jsonb_build_object(
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'equals', 'value', 'birth')
    ),
    f_late || jsonb_build_object(
      'label', 'Registered late?',
      'visibleWhen', jsonb_build_object('field', when_type, 'operator', 'not_equals', 'value', 'other')
    ),
    f_late_when
  );

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'key' = 'case' then
      section := jsonb_set(section, '{fields}', case_fields, true);
    elsif section->>'key' = 'details' then
      section := jsonb_set(section, '{fields}', owner_fields, true);
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
