-- CTC issuance: drop the "Registry/OCT number" question.
--
-- It is not on the CCRO's Verification Form (LCR/Book/Page numbers there are
-- filled in by the office), so the applicant is no longer asked for it.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep the answers they gave under the version they were submitted
-- against. The service-level label is cleared too so no view or legacy form
-- builds the field back. Idempotent.

do $$
declare
  template_row record;
  section jsonb;
  new_sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select template.id, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'ctc_issuance';

  if found and exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'reference_number'
  ) then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      section := jsonb_set(
        section,
        '{fields}',
        coalesce((
          select jsonb_agg(f order by ord)
          from jsonb_array_elements(section->'fields')
            with ordinality as fields(f, ord)
          where f->>'key' <> 'reference_number'
        ), '[]'::jsonb),
        true
      );
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

update public.services_registry
set reference_number_label = null
where service_code in ('CTC-LOCAL', 'CTC-ABROAD')
  and reference_number_label is not null;
