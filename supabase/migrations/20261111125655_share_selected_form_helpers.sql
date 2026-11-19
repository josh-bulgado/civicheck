-- Add record-specific headings without changing fields or old request templates.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for target in
    select t.id, v.definition
    from public.form_templates t
    join public.form_template_versions v on v.id = t.active_version_id
    where t.template_key in ('email_inquiry', 'supplemental_report', 'other_cert', 'ra9048_10172')
    for update of t
  loop
    select jsonb_set(target.definition, '{sections}', jsonb_agg(
      jsonb_set(s, '{fields}', (
        select jsonb_agg(case when f->>'type' = 'person_group' then
          jsonb_set(f, '{labelByAnswer}', jsonb_build_object(
            'field', 'record_type',
            'labels', jsonb_build_object(
              'birth', 'Full name on the birth certificate',
              'death', 'Full name of the deceased',
              'marriage', 'Name on the marriage certificate',
              'other', 'Full name of the person named on the record'
            ) || coalesce(f->'labelByAnswer'->'labels', '{}'::jsonb)
          )) else f end order by field_order)
        from jsonb_array_elements(s->'fields') with ordinality as fields(f, field_order)
      )) order by section_order
    )) into next_definition
    from jsonb_array_elements(target.definition->'sections') with ordinality as sections(s, section_order);

    if next_definition = target.definition then continue; end if;
    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = target.id;
    insert into public.form_template_versions (template_id, version, status, definition, published_at)
    values (target.id, next_version, 'published', next_definition, now()) returning id into published_id;
    update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
  end loop;
end
$$;
