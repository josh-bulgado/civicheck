-- CTC issuance: ask for the requester's name on the case step.
--
-- The CCRO's Verification Form has a "Full Name" in both the owner's and the
-- requester's information. The case step now asks for the requester's first,
-- middle and last name (shown on one row via `inline`) just before the
-- relationship question; when the relationship is "owner" the details step
-- starts the owner's name from them.
--
-- The answers must be template fields: anything outside the template is dropped
-- when the request is submitted.
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
  name_fields constant jsonb := jsonb_build_array(
    jsonb_build_object(
      'key', 'requester_first_name',
      'type', 'text',
      'label', 'Requester''s first name',
      'required', true,
      'inline', true
    ),
    jsonb_build_object(
      'key', 'requester_middle_name',
      'type', 'text',
      'label', 'Requester''s middle name',
      'required', false,
      'inline', true
    ),
    jsonb_build_object(
      'key', 'requester_last_name',
      'type', 'text',
      'label', 'Requester''s last name',
      'required', true,
      'inline', true
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
    where f->>'key' = 'requester_first_name'
  ) then
    return;
  end if;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' = 'requester_relationship' then
          new_fields := new_fields || name_fields;
        end if;
        new_fields := new_fields || jsonb_build_array(field);
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
