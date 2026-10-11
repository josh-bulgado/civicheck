-- Align on-time and delayed death registration with Citizen's Charter items 4
-- and 5:
--
--   4. "Registration of Certificate of Death of a person who died in Legazpi
--      City within thirty (30) days from the time of death."
--   5. "Registration of the Certificate of Death of a person who died in
--      Legazpi City, beyond thirty (30) days ... or those who have no existing
--      record from the Local Civil Registrar or PSA."
--
-- 1. Both services only cover deaths that occurred in Legazpi City, so ask,
--    and stop the application when the answer is "no".
-- 2. "Certification of Not Embalmed (if not embalmed)" has no burial condition
--    in the charter. The embalmed question was only asked after "Buried", so a
--    cremated, not-embalmed case never saw the document. Ask it for everyone.
-- 3. The charter's on-time checklist has no Burial Certificate (only the
--    delayed one lists it), so drop it from DEATH_ONTIME.
-- 4. Pick-one questions first: the Legazpi question, then the disposal
--    choices, then date and place. Other fields keep their relative order.
--
-- The disposal questions belong to the shared `death_disposal` block, so the
-- embalmed change is applied to the block as well as to the templates.
--
-- Published versions are immutable, so each template gets a new version.
-- Idempotent: a template (or the block) that already carries the change is
-- skipped.

-- Remove the burial condition from the embalmed question.
create or replace function pg_temp.death_embalmed_always(p_fields jsonb)
returns jsonb
language sql
immutable
as $fn$
  select coalesce(
    jsonb_agg(
      case when f.field->>'key' = 'embalmed'
        then f.field - 'visibleWhen'
        else f.field
      end
      order by f.ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_fields) with ordinality as f(field, ord);
$fn$;

-- Case-step fields for one death template: embalmed always asked, the Legazpi
-- question present, and the three choice questions first.
create or replace function pg_temp.death_case_fields(
  p_fields jsonb,
  p_notice_description text
)
returns jsonb
language plpgsql
immutable
as $fn$
declare
  with_embalmed jsonb := pg_temp.death_embalmed_always(p_fields);
  with_legazpi jsonb;
  legazpi_field jsonb := jsonb_build_object(
    'key', 'died_in_legazpi',
    'type', 'select',
    'label', 'Did the person die in Legazpi City?',
    'required', true,
    'options', jsonb_build_array(
      jsonb_build_object('value', 'yes', 'label', 'Yes'),
      jsonb_build_object(
        'value', 'no',
        'label', 'No',
        'notice', jsonb_build_object(
          'variant', 'destructive',
          'title', 'We can only register deaths that occurred in Legazpi City',
          'description', p_notice_description,
          'blocksProgress', true
        )
      )
    )
  );
begin
  if exists (
    select 1
    from jsonb_array_elements(with_embalmed) f
    where f->>'key' = 'died_in_legazpi'
  ) then
    with_legazpi := with_embalmed;
  else
    with_legazpi := jsonb_build_array(legazpi_field) || with_embalmed;
  end if;

  return (
    select jsonb_agg(
      item.field
      order by
        case item.field->>'key'
          when 'died_in_legazpi' then 0
          when 'disposal_method' then 1
          when 'embalmed' then 2
          else 3
        end,
        item.ord
    )
    from jsonb_array_elements(with_legazpi)
      with ordinality as item(field, ord)
  );
end
$fn$;

do $$
declare
  spec record;
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  -- 1. The shared block: embalmed is asked regardless of disposal method.
  update public.form_field_blocks
  set fields = pg_temp.death_embalmed_always(fields),
      version = version + 1,
      updated_at = now()
  where block_key = 'death_disposal'
    and fields is distinct from pg_temp.death_embalmed_always(fields);

  -- 2. Each death template.
  for spec in
    select *
    from (values
      (
        'death_ontime',
        'On-time registration here covers deaths that occurred in Legazpi City. Register at the Local Civil Registrar of the city or municipality where the death occurred.'
      ),
      (
        'death_delayed',
        'Delayed registration here covers deaths that occurred in Legazpi City. Register at the Local Civil Registrar of the city or municipality where the death occurred.'
      )
    ) as v(template_key, notice_description)
  loop
    select template.id, version.definition
    into target
    from public.form_templates template
    join public.form_template_versions version
      on version.id = template.active_version_id
    where template.template_key = spec.template_key;

    if not found then
      continue;
    end if;

    select jsonb_set(
      target.definition,
      '{sections}',
      jsonb_agg(
        case when section->>'step' = 'case' then
          jsonb_set(
            section,
            '{fields}',
            pg_temp.death_case_fields(
              section->'fields',
              spec.notice_description
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

    if next_definition is not distinct from target.definition then
      continue;
    end if;

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
  end loop;
end
$$;

-- 3. Certification of Not Embalmed applies whenever the remains were not
--    embalmed, whether buried or cremated.
update public.service_requirements_metadata
set applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'embalmed', 'operator', 'equals', 'value', 'no'
      ))
    )
where service_code in ('DEATH_ONTIME', 'DEATH_DELAYED')
  and requirement_name ilike 'Certification of Not Embalmed%';

-- 4. Charter item 4 lists no Burial Certificate. It was added to DEATH_ONTIME
--    by 20260921120000_add_death_disposal_conditions.sql. Existing attachments
--    keep their file; their requirement_id is set null (ON DELETE SET NULL).
delete from public.service_requirements_metadata
where service_code = 'DEATH_ONTIME'
  and requirement_name ilike 'Burial Certificate%';
