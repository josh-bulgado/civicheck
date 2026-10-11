-- Drop "Purpose of request" and "Additional notes" from the marriage services.
--
-- Neither question helps CCRO validate a marriage request against its checklist,
-- and both add friction for the applicant. Marriage license already dropped its
-- purpose questions (20260824130000); this brings on-time, delayed/
-- reconstruction and license in line, and also removes the notes question.
--
-- Only the three marriage templates are touched. The shared form_field_blocks
-- ("purpose", "additional_notes") are left alone: saving a block fans out to
-- every template that uses it, and birth/death/CTC still ask both questions.
-- Published versions are immutable, so each template gets a new published
-- version. Existing requests keep their answers, labelled by their pinned
-- version.

-- 1. Publish a new version of each marriage template without the fields.
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

    -- Idempotent: skip when the template is missing or already clean.
    if found and exists (
      select 1
      from jsonb_array_elements(target.definition->'sections') section,
        jsonb_array_elements(section->'fields') field
      where section->>'step' = 'case'
        and field->>'key' in ('purpose', 'purpose_other', 'additional_notes')
    ) then
      select jsonb_set(
        target.definition,
        '{sections}',
        jsonb_agg(
          case when section->>'step' = 'case' then
            jsonb_set(
              section,
              '{fields}',
              coalesce((
                select jsonb_agg(field order by field_ordinality)
                from jsonb_array_elements(section->'fields')
                  with ordinality as fields(field, field_ordinality)
                where field->>'key' not in (
                  'purpose', 'purpose_other', 'additional_notes'
                )
              ), '[]'::jsonb),
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

-- 2. Stop surfacing a purpose anywhere else. asks_purpose gates the "Purpose"
--    row in the documents-step summary and the "Purpose of Request" card in the
--    service report; leaving it true would show a default purpose that was
--    never asked.
update public.services_registry
set asks_purpose = false
where service_code in ('MARRIAGE_ONTIME', 'MARRIAGE_DELAYED', 'MARRIAGE_LICENSE')
  and asks_purpose is distinct from false;
