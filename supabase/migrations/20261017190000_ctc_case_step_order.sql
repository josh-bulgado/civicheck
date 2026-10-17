-- CTC issuance: reorder the case step so it reads like the Verification Form's
-- requester block.
--
-- Record type (with its follow-ups), then the requester's name, then the
-- relationship to the owner, then the optional record lookups (date and place on
-- the record), then additional notes.
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
  desired_order constant text[] := array[
    'record_type',
    'record_type_other',
    'spouse_name',
    'requester_first_name',
    'requester_middle_name',
    'requester_last_name',
    'requester_relationship',
    'event_date',
    'event_place',
    'additional_notes'
  ];
  current_order text[];
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

  select array_agg(f->>'key' order by ord)
  into current_order
  from jsonb_array_elements(template_row.definition->'sections') s,
    jsonb_array_elements(s->'fields') with ordinality as fields(f, ord)
  where s->>'step' = 'case';

  -- Nothing to do when the case step is already in the final order.
  if current_order is not distinct from (
    select array_agg(k)
    from unnest(desired_order) k
    where k = any (current_order)
  ) then
    return;
  end if;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      section := jsonb_set(
        section,
        '{fields}',
        (
          select jsonb_agg(
            f
            order by coalesce(array_position(desired_order, f->>'key'), 999), ord
          )
          from jsonb_array_elements(section->'fields')
            with ordinality as fields(f, ord)
        ),
        true
      );
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
