-- CTC issuance: move the requester's information into "Your details", ahead of
-- the owner's, mirroring the CCRO's Verification Form (owner and requester
-- blocks, each with a full name).
--
--   About your case   record type (+ follow-ups), date and place on the record,
--                     additional notes
--   Your details      1. Requester's information: name, relationship to the
--                        owner, address, purpose, contact number
--                     2. Owner's information: the person named on the record,
--                        parents, registered late
--
-- Every section is `singleColumn`, so each field sits on its own row (the three
-- name parts still share one), and the second details section is set apart with
-- a rule and extra room. When the relationship is "owner", the wizard copies the
-- requester's name into the owner's boxes.
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
  case_keys constant text[] := array[
    'record_type', 'record_type_other', 'spouse_name',
    'event_date', 'event_place', 'additional_notes'
  ];
  requester_keys constant text[] := array[
    'requester_first_name', 'requester_middle_name', 'requester_last_name',
    'requester_relationship', 'requester_address', 'purpose_of_request',
    'contact_number'
  ];
  owner_keys constant text[] := array[
    'subjects', 'mother_maiden_name', 'father_name',
    'registered_late', 'registered_late_when'
  ];
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
    from jsonb_array_elements(template_row.definition->'sections') s
    where s->>'key' = 'details_requester'
  ) then
    return;
  end if;

  select jsonb_agg(f)
  into all_fields
  from jsonb_array_elements(template_row.definition->'sections') s,
    jsonb_array_elements(s->'fields') f;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      new_sections := new_sections || jsonb_build_array(
        jsonb_build_object(
          'key', 'case',
          'step', 'case',
          'title', section->>'title',
          'singleColumn', true,
          'fields', coalesce((
            select jsonb_agg(f order by array_position(case_keys, f->>'key'))
            from jsonb_array_elements(all_fields) f
            where f->>'key' = any (case_keys)
          ), '[]'::jsonb)
        )
      );
    elsif section->>'step' = 'details' then
      new_sections := new_sections || jsonb_build_array(
        jsonb_build_object(
          'key', 'details_requester',
          'step', 'details',
          'title', 'Requester''s information',
          'singleColumn', true,
          'fields', coalesce((
            select jsonb_agg(f order by array_position(requester_keys, f->>'key'))
            from jsonb_array_elements(all_fields) f
            where f->>'key' = any (requester_keys)
          ), '[]'::jsonb)
        ),
        jsonb_build_object(
          'key', 'details',
          'step', 'details',
          'title', 'Owner''s information',
          'singleColumn', true,
          'fields', coalesce((
            select jsonb_agg(f order by array_position(owner_keys, f->>'key'))
            from jsonb_array_elements(all_fields) f
            where f->>'key' = any (owner_keys)
          ), '[]'::jsonb)
        )
      );
    else
      new_sections := new_sections || jsonb_build_array(section);
    end if;
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
