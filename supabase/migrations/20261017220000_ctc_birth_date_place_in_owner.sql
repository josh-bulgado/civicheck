-- CTC issuance: ask for the owner's date and place of birth in "Your details",
-- as the CCRO's Verification Form does (owner's personal information).
--
-- For a Birth request the owner's block now has "Date of birth" and "Place of
-- birth". They keep the stored keys `event_date` / `event_place`, so every staff
-- and applicant screen that already reads those keeps working, and the registered
-- late question shows for Birth only.
--
-- Other record types (marriage, death, other) cannot share those keys with a
-- "birth" question, so they get their own generic optional "Date on the record" /
-- "Place on the record" in "About your case", until the CCRO's forms for those
-- records are available.
--
-- The details step may now depend on an answer from the case step (the record
-- type); the form schema allows that.
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
  birth_only constant jsonb := jsonb_build_object(
    'field', 'record_type', 'operator', 'equals', 'value', 'birth'
  );
  not_birth constant jsonb := jsonb_build_object(
    'field', 'record_type', 'operator', 'not_equals', 'value', 'birth'
  );
  f_record_type jsonb;
  f_record_type_other jsonb;
  f_spouse_name jsonb;
  f_notes jsonb;
  f_event_date jsonb;
  f_event_place jsonb;
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
    where f->>'key' = 'record_date'
  ) then
    return;
  end if;

  select jsonb_agg(f)
  into all_fields
  from jsonb_array_elements(template_row.definition->'sections') s,
    jsonb_array_elements(s->'fields') f;

  select f into f_record_type from jsonb_array_elements(all_fields) f where f->>'key' = 'record_type';
  select f into f_record_type_other from jsonb_array_elements(all_fields) f where f->>'key' = 'record_type_other';
  select f into f_spouse_name from jsonb_array_elements(all_fields) f where f->>'key' = 'spouse_name';
  select f into f_notes from jsonb_array_elements(all_fields) f where f->>'key' = 'additional_notes';
  select f into f_event_date from jsonb_array_elements(all_fields) f where f->>'key' = 'event_date';
  select f into f_event_place from jsonb_array_elements(all_fields) f where f->>'key' = 'event_place';
  select f into f_subjects from jsonb_array_elements(all_fields) f where f->>'key' = 'subjects';
  select f into f_mother from jsonb_array_elements(all_fields) f where f->>'key' = 'mother_maiden_name';
  select f into f_father from jsonb_array_elements(all_fields) f where f->>'key' = 'father_name';
  select f into f_late from jsonb_array_elements(all_fields) f where f->>'key' = 'registered_late';
  select f into f_late_when from jsonb_array_elements(all_fields) f where f->>'key' = 'registered_late_when';

  case_fields := jsonb_build_array(
    f_record_type,
    f_record_type_other,
    f_spouse_name,
    (f_event_date - 'visibleWhen') || jsonb_build_object(
      'key', 'record_date',
      'label', 'Date on the record',
      'visibleWhen', not_birth
    ),
    (f_event_place - 'visibleWhen') || jsonb_build_object(
      'key', 'record_place',
      'label', 'Place on the record',
      'visibleWhen', not_birth
    ),
    f_notes
  );

  owner_fields := jsonb_build_array(
    f_subjects,
    f_event_date || jsonb_build_object(
      'label', 'Date of birth',
      'visibleWhen', birth_only
    ),
    f_event_place || jsonb_build_object(
      'label', 'Place of birth',
      'visibleWhen', birth_only
    ),
    f_mother,
    f_father,
    f_late || jsonb_build_object('visibleWhen', birth_only),
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
