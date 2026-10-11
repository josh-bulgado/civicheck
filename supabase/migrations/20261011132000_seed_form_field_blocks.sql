-- Seed the shared form-field blocks and tag the questions that were being
-- copied between form templates.
--
-- Each block is taken from a canonical template's current fields rather than
-- re-typed here, so the block starts out byte-for-byte what applicants already
-- see. Every template that contains ALL of a block's questions then has them
-- replaced by the block's fields tagged with `blockKey`. That also normalizes
-- two pieces of drift that had crept in between the copies:
--
--   * informant_relationship: `birth_delayed` stored the display text
--     ("Mother") while `birth_ontime` stored "mother".
--   * contact_number: `death_delayed` had a different placeholder.
--
-- Published versions are never edited — a template whose definition would
-- change gets a new version, and requests stay pinned to the version they used.
-- Idempotent: re-running changes nothing once everything is tagged.
--
-- Not blocked on purpose: event_date / event_place (labels and date direction
-- legitimately differ per service) and reference_number (different wording per
-- family). `elec_endorsement` keeps its free-text purpose: it has no
-- purpose_other, so it doesn't contain the whole `purpose` block.

create or replace function pg_temp.apply_block(
  def jsonb,
  p_block_key text,
  p_fields jsonb
) returns jsonb
language plpgsql
as $fn$
declare
  keys text[];
  has_all boolean;
  tagged jsonb;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  placed boolean := false;
begin
  select array_agg(f->>'key') into keys from jsonb_array_elements(p_fields) f;

  -- Only a template that already asks every question of the block is switched.
  select bool_and(exists (
    select 1
    from jsonb_array_elements(def->'sections') s,
      jsonb_array_elements(s->'fields') f2
    where f2->>'key' = k
  ))
  into has_all
  from unnest(keys) k;

  if not coalesce(has_all, false) then
    return def;
  end if;

  select coalesce(
    jsonb_agg(f || jsonb_build_object('blockKey', p_block_key)),
    '[]'::jsonb
  )
  into tagged
  from jsonb_array_elements(p_fields) f;

  for section in select * from jsonb_array_elements(def->'sections')
  loop
    new_fields := '[]'::jsonb;
    for field in select * from jsonb_array_elements(section->'fields')
    loop
      if (field->>'key') = any(keys) then
        -- The block takes the position of its first question.
        if not placed then
          new_fields := new_fields || tagged;
          placed := true;
        end if;
      else
        new_fields := new_fields || jsonb_build_array(field);
      end if;
    end loop;
    new_sections := new_sections ||
      jsonb_build_array(jsonb_set(section, '{fields}', new_fields));
  end loop;

  return jsonb_set(def, '{sections}', new_sections);
end;
$fn$;

do $$
declare
  spec record;
  block_fields jsonb;
  seeded_keys text[] := array[
    'birth_details', 'purpose', 'additional_notes', 'contact_number',
    'death_disposal'
  ];
  tpl record;
  blk record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  -- 1. Create the blocks from their canonical template's current questions.
  for spec in
    select *
    from (values
      ('birth_details', 'Birth details',
       'Where the birth took place and who reported it. Shared by on-time and delayed birth registration.',
       'case', 'birth_ontime',
       array['place_type', 'informant_relationship', 'informant_name']),
      ('purpose', 'Purpose of request',
       'Why the record is needed, with a free-text follow-up for "Other".',
       'case', 'court_decree',
       array['purpose', 'purpose_other']),
      ('additional_notes', 'Additional notes',
       'Optional free-text notes for the CCRO staff.',
       'case', 'birth_ontime',
       array['additional_notes']),
      ('contact_number', 'Contact number',
       'Applicant''s mobile number for status updates.',
       'details', 'birth_ontime',
       array['contact_number']),
      ('death_disposal', 'Death disposal',
       'How the remains were disposed of; drives the burial / cremation documents.',
       'case', 'death_ontime',
       array['disposal_method', 'embalmed'])
    ) as v(block_key, name, description, step, source_template, keys)
  loop
    -- An existing block (re-run) is left exactly as the admin last saved it.
    if exists (
      select 1 from public.form_field_blocks where block_key = spec.block_key
    ) then
      continue;
    end if;

    select jsonb_agg(f - 'blockKey' order by array_position(spec.keys, f->>'key'))
    into block_fields
    from public.form_templates template
    join public.form_template_versions version
      on version.id = template.active_version_id,
      jsonb_array_elements(version.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where template.template_key = spec.source_template
      and (f->>'key') = any(spec.keys);

    if block_fields is null
       or jsonb_array_length(block_fields) <> array_length(spec.keys, 1) then
      raise notice 'Skipping block %: source template % is missing some of its questions',
        spec.block_key, spec.source_template;
      continue;
    end if;

    insert into public.form_field_blocks (
      block_key, name, description, step, fields
    ) values (
      spec.block_key, spec.name, spec.description, spec.step, block_fields
    );
  end loop;

  -- 2. Tag every template that already asks a block's whole set of questions.
  --    All blocks are applied in memory first so each template gets at most
  --    ONE new version.
  for tpl in
    select template.id, template.template_key, version.definition
    from public.form_templates template
    join public.form_template_versions version
      on version.id = template.active_version_id
  loop
    next_definition := tpl.definition;
    for blk in
      select block_key, fields
      from public.form_field_blocks
      where block_key = any(seeded_keys)
      order by block_key
    loop
      next_definition := pg_temp.apply_block(
        next_definition, blk.block_key, blk.fields
      );
    end loop;

    if next_definition is not distinct from tpl.definition then
      continue;
    end if;

    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions
    where template_id = tpl.id;

    insert into public.form_template_versions (
      template_id, version, status, definition, published_at
    ) values (
      tpl.id, next_version, 'published', next_definition, now()
    ) returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = tpl.id;
  end loop;
end
$$;
