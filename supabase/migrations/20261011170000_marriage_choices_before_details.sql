-- Marriage case step: pick-one questions first, typed details after.
--
-- The choices decide which documents apply, so the applicant answers them
-- before filling in dates and places. Stable partition of each template's case
-- fields: every select first (in its existing order), then everything else.
--
--   marriage_ontime  : license issued?, then date + place
--   marriage_delayed : already choices first (registration type, children)
--   marriage_license : nationality + civil status pairs, then date, place, DOBs
--
-- Published versions are immutable, so each template that needs it gets a new
-- version. Idempotent: skips a template whose selects already come first.
do $$
declare
  target_key text;
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  foreach target_key in array array[
    'marriage_ontime',
    'marriage_delayed',
    'marriage_license'
  ]
  loop
    select template.id, version.definition
    into target
    from public.form_templates template
    join public.form_template_versions version
      on version.id = template.active_version_id
    where template.template_key = target_key;

    if found and exists (
      select 1
      from jsonb_array_elements(target.definition->'sections') section,
        lateral (
          select
            min(ord) filter (where coalesce(fld->>'type', '') <> 'select') as first_other,
            max(ord) filter (where fld->>'type' = 'select') as last_select
          from jsonb_array_elements(section->'fields')
            with ordinality as fields(fld, ord)
        ) positions
      where section->>'step' = 'case'
        and positions.first_other is not null
        and positions.last_select is not null
        and positions.first_other < positions.last_select
    ) then
      select jsonb_set(
        target.definition,
        '{sections}',
        jsonb_agg(
          case when section->>'step' = 'case' then
            jsonb_set(
              section,
              '{fields}',
              (
                select jsonb_agg(
                  f.field
                  order by (coalesce(f.field->>'type', '') <> 'select'), f.ord
                )
                from jsonb_array_elements(section->'fields')
                  with ordinality as f(field, ord)
              ),
              true
            )
          else section end
          order by section_ordinality
        ),
        true
      )
      into next_definition
      from jsonb_array_elements(target.definition->'sections')
        with ordinality as sections(section, section_ordinality);

      select coalesce(max(version), 0) + 1 into next_version
      from public.form_template_versions
      where template_id = target.id;

      insert into public.form_template_versions (
        template_id, version, status, definition, published_at
      ) values (
        target.id, next_version, 'published', next_definition, now()
      ) returning id into published_id;

      update public.form_templates
      set active_version_id = published_id, updated_at = now()
      where id = target.id;
    end if;
  end loop;
end
$$;
