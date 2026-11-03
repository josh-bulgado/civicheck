-- CTC issuance: ask for the parents' names in "Your details", under the owner.
--
-- On the CCRO's Verification Form the mother's maiden name and father's name sit
-- with the owner's personal information, which is what "Your details" collects
-- (the person named on the record). They were on the case step, hidden unless the
-- record type was Birth. A field can only depend on another field in the same
-- step, so on the details step they show for every record type; both stay
-- optional, and the help text says whose parents they are.
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
  parent_fields constant jsonb := jsonb_build_array(
    jsonb_build_object(
      'key', 'mother_maiden_name',
      'type', 'text',
      'label', 'Mother''s maiden name',
      'required', false,
      'helpText', 'Of the person named on the record. Leave blank if you don''t know it.'
    ),
    jsonb_build_object(
      'key', 'father_name',
      'type', 'text',
      'label', 'Name of father',
      'required', false,
      'helpText', 'Of the person named on the record. Leave blank if you don''t know it.'
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

  -- Nothing to do when the parents are already on the details step.
  if exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where s->>'step' = 'details' and f->>'key' = 'mother_maiden_name'
  ) then
    return;
  end if;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' not in ('mother_maiden_name', 'father_name') then
          new_fields := new_fields || jsonb_build_array(field);
        end if;
      end loop;
      section := jsonb_set(section, '{fields}', new_fields, true);
    elsif section->>'step' = 'details' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        new_fields := new_fields || jsonb_build_array(field);
        if field->>'key' = 'subjects' then
          new_fields := new_fields || parent_fields;
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
