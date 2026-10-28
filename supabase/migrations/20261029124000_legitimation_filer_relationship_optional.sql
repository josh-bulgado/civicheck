-- Legitimation: "Who is filing this request?" is informational only (it does
-- not change the checklist, and both parents must appear regardless), so it
-- should not block the applicant. Make it optional.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep their answers under the version they were submitted against.
-- Idempotent: skips when the active version already has the field optional.

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
begin
  select template.id, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  join public.service_form_templates binding
    on binding.template_id = template.id
  where binding.service_code = 'LEGITIMATION';

  if found and exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'filer_relationship'
      and coalesce((f->>'required')::boolean, false)
  ) then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' = 'filer_relationship' then
          field := field || jsonb_build_object('required', false);
        end if;
        new_fields := new_fields || jsonb_build_array(field);
      end loop;
      section := jsonb_set(section, '{fields}', new_fields, true);
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
  end if;
end
$$;
