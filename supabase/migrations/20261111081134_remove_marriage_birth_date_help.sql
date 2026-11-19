-- Remove only the helper text below the two marriage-license birth dates.
do $$
declare
  template_row record;
  next_definition jsonb;
  next_sections jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into template_row
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'marriage_license'
  for update of t;

  if not found then
    raise exception 'Active marriage-license template not found';
  end if;

  select jsonb_agg(
    jsonb_set(section, '{fields}', (
      select jsonb_agg(
        case when field->>'key' in ('bride_date_of_birth', 'groom_date_of_birth')
          then field - 'helpText'
          else field end
        order by field_order
      )
      from jsonb_array_elements(section->'fields')
        with ordinality as fields(field, field_order)
    ))
    order by section_order
  ) into next_sections
  from jsonb_array_elements(template_row.definition->'sections')
    with ordinality as sections(section, section_order);

  next_definition := jsonb_set(template_row.definition, '{sections}', next_sections);
  if next_definition = template_row.definition then
    return;
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = template_row.id;

  insert into public.form_template_versions
    (template_id, version, status, definition, published_at)
  values (template_row.id, next_version, 'published', next_definition, now())
  returning id into published_id;

  update public.form_templates
  set active_version_id = published_id, updated_at = now()
  where id = template_row.id;
end
$$;
